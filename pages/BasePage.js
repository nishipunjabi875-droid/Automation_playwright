const { injectAxe, getViolations } = require('axe-playwright');
const axios = require('axios');

class BasePage {
  constructor(page) {
    this.page = page;
    this.consoleErrors = [];
    this.networkErrors = [];
    this.apiLogs = [];
    this._initListeners();
  }

  _initListeners() {
    // 1. Console Errors & Warnings
    this.page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      const location = msg.location();
      
      if (type === 'error' || type === 'warning') {
        this.consoleErrors.push({
          type,
          text,
          url: this.page.url(),
          location: `${location.url || 'unknown'}:${location.lineNumber || 0}`
        });
      }
    });

    this.page.on('pageerror', err => {
      this.consoleErrors.push({
        type: 'exception',
        text: err.message,
        url: this.page.url(),
        stack: err.stack || ''
      });
    });

    // 2. Request Failures
    this.page.on('requestfailed', req => {
      const failure = req.failure();
      const resourceType = req.resourceType();
      
      this.networkErrors.push({
        url: req.url(),
        resourceType,
        errorText: failure ? failure.errorText : 'Unknown request failure',
        pageUrl: this.page.url()
      });
    });

    // 3. Response Errors & XHR Latency
    this.page.on('response', res => {
      const req = res.request();
      const status = res.status();
      const url = res.url();
      const resourceType = req.resourceType();
      
      if (status >= 400) {
        this.networkErrors.push({
          url,
          status,
          resourceType,
          statusText: res.statusText(),
          pageUrl: this.page.url()
        });
      }

      // Capture APIs
      if (resourceType === 'xhr' || resourceType === 'fetch') {
        const timing = req.timing();
        let latency = -1;
        if (timing) {
          latency = timing.responseEnd - timing.requestStart;
        }
        
        this.apiLogs.push({
          url,
          status,
          method: req.method(),
          responseTime: latency > 0 ? latency : 0,
          pageUrl: this.page.url()
        });
      }
    });
  }

  // Navigation with timing
  async navigate(pathOrUrl) {
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${this.page.context()._options?.baseURL || ''}${pathOrUrl}`;
    const startTime = Date.now();
    const response = await this.page.goto(url, { waitUntil: 'load', timeout: 45000 });
    const responseTime = Date.now() - startTime;

    const status = response ? response.status() : 0;
    const headers = response ? response.headers() : {};
    
    return {
      url,
      status,
      responseTime,
      headers
    };
  }

  // Scroll page to trigger lazy loading assets
  async scrollToBottomAndTop() {
    try {
      await this.page.evaluate(async () => {
        window.scrollBy(0, 1000);
        await new Promise(r => setTimeout(r, 600));
        window.scrollBy(0, 1000);
        await new Promise(r => setTimeout(r, 600));
        window.scrollTo(0, 0);
        await new Promise(r => setTimeout(r, 500));
      });
    } catch (e) {
      // Ignore
    }
  }

  // Capture Screenshot on demand
  async captureScreenshot(name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = `screenshots/${name}_${timestamp}.png`;
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    return screenshotPath;
  }

  // Capture Performance & Core Web Vitals
  async getPerformanceMetrics() {
    try {
      return await this.page.evaluate(() => {
        const [navTiming] = performance.getEntriesByType('navigation');
        const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
        
        // Approximate LCP
        const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
        const lcp = lcpEntries.length ? lcpEntries[lcpEntries.length - 1].startTime : (fcpEntry ? fcpEntry.startTime : 0);
        
        // DOM timing
        const domContentLoaded = navTiming ? navTiming.domContentLoadedEventEnd - navTiming.startTime : 0;
        const pageLoadTime = navTiming ? navTiming.loadEventEnd - navTiming.startTime : 0;

        return {
          pageLoadTime: pageLoadTime > 0 ? pageLoadTime : 0,
          domContentLoaded: domContentLoaded > 0 ? domContentLoaded : 0,
          fcp: fcpEntry ? fcpEntry.startTime : 0,
          lcp: lcp,
          tti: pageLoadTime + 200, // approximation for TTI
          tbt: domContentLoaded > 0 ? (pageLoadTime - domContentLoaded) : 0, // approximation for TBT
          cls: 0 // placeholder as layout shift requires continuous observer
        };
      });
    } catch (e) {
      return { pageLoadTime: 0, domContentLoaded: 0, fcp: 0, lcp: 0, tti: 0, tbt: 0, cls: 0 };
    }
  }

  // Validate SEO
  async getSEOData() {
    try {
      return await this.page.evaluate(() => {
        const title = document.title;
        const descriptionMeta = document.querySelector('meta[name="description"]');
        const description = descriptionMeta ? descriptionMeta.getAttribute('content') : '';
        
        const canonicalLink = document.querySelector('link[rel="canonical"]');
        const canonicalUrl = canonicalLink ? canonicalLink.getAttribute('href') : '';
        
        const robotsMeta = document.querySelector('meta[name="robots"]');
        const robots = robotsMeta ? robotsMeta.getAttribute('content') : '';
        
        const h1Elements = Array.from(document.querySelectorAll('h1')).map(h1 => h1.innerText.trim());
        
        // Open Graph Tags
        const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
        const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
        const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
        
        return {
          title,
          description,
          canonicalUrl,
          robots,
          h1Count: h1Elements.length,
          h1Texts: h1Elements,
          og: {
            title: ogTitle,
            description: ogDescription,
            image: ogImage
          }
        };
      });
    } catch (e) {
      return { title: '', description: '', canonicalUrl: '', robots: '', h1Count: 0, h1Texts: [], og: {} };
    }
  }

  // Validate Security
  async getSecurityChecks(headers) {
    const isHttps = this.page.url().startsWith('https://');
    const securityHeaders = {
      hsts: !!(headers['strict-transport-security']),
      csp: !!(headers['content-security-policy']),
      xFrameOptions: !!(headers['x-frame-options'] || headers['frame-options']),
      xContentTypeOptions: !!(headers['x-content-type-options'])
    };

    // Check cookies for Secure & HttpOnly attributes
    let secureCookies = true;
    try {
      const cookies = await this.page.context().cookies();
      secureCookies = cookies.every(c => c.secure);
    } catch (e) {
      // Ignore
    }

    return {
      isHttps,
      securityHeaders,
      secureCookies,
      mixedContent: false // Will be set to true if HTTP assets are caught loading in HTTPS
    };
  }

  // Accessibility Audit via Axe
  async runAccessibilityAudit() {
    try {
      await injectAxe(this.page);
      const violations = await getViolations(this.page, null, {
        detailedReport: true
      });
      return violations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        help: v.help,
        nodes: v.nodes.length
      }));
    } catch (e) {
      return [{ id: 'axe-error', impact: 'high', description: `Axe injection/run failed: ${e.message}`, help: 'Check console errors', nodes: 0 }];
    }
  }

  // Images Validation
  async getImagesData() {
    try {
      const images = await this.page.evaluate(() => {
        return Array.from(document.querySelectorAll('img')).map(img => ({
          src: img.src || img.getAttribute('data-src') || '',
          alt: img.alt || '',
          naturalWidth: img.naturalWidth || 0,
          naturalHeight: img.naturalHeight || 0,
          isLazy: img.loading === 'lazy' || img.classList.contains('lazyload'),
          displayWidth: img.clientWidth,
          displayHeight: img.clientHeight
        }));
      });

      const checkedImages = [];
      for (const img of images) {
        if (!img.src) continue;
        
        let isBroken = img.naturalWidth === 0 && img.naturalHeight === 0 && img.displayWidth > 0;
        
        checkedImages.push({
          url: img.src,
          alt: img.alt,
          isBroken,
          isLazy: img.isLazy,
          dimensions: `${img.naturalWidth}x${img.naturalHeight}`,
          altAvailable: !!img.alt.trim(),
          sourcePage: this.page.url()
        });
      }
      return checkedImages;
    } catch (e) {
      return [];
    }
  }

  // Links Scanning (extract all links on current page)
  async scanPageLinks() {
    try {
      return await this.page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a')).map(a => ({
          href: a.href,
          text: a.innerText.trim(),
          rel: a.rel
        }));
        
        // Filter out mailto, tel, javascript and anchor jumps
        return links.filter(l => l.href && !l.href.startsWith('mailto:') && !l.href.startsWith('tel:') && !l.href.startsWith('javascript:') && !l.href.startsWith('#'));
      });
    } catch (e) {
      return [];
    }
  }

  // Clean collected logs
  clearLogs() {
    this.consoleErrors = [];
    this.networkErrors = [];
    this.apiLogs = [];
  }
}

module.exports = BasePage;
