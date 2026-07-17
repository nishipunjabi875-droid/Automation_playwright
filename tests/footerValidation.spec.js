const { test, expect } = require('@playwright/test');
const fs = require('fs-extra');
const path = require('path');

// Helper to block analytical scripts to speed up test loading
async function blockAnalytics(page) {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    const shouldBlock = 
      url.includes('facebook.com') || 
      url.includes('doubleclick') ||
      url.includes('google-analytics') ||
      url.includes('googletagmanager') ||
      url.includes('snapchat') ||
      url.includes('tiktok') ||
      url.includes('pinterest');

    if (shouldBlock) {
      route.abort();
    } else {
      route.continue();
    }
  });
}

// Helper to normalize and resolve relative paths
function normalizeUrl(href, baseUrl) {
  if (!href) return null;
  try {
    const resolved = new URL(href, baseUrl).href;
    const parsed = new URL(resolved);
    parsed.hash = ''; // Strip hash fragments
    return parsed.href;
  } catch (e) {
    return null;
  }
}

test.describe('Beta WoodenStreet Footer Links Audit Suite', () => {

  test('Verify all footer links on Desktop View', async ({ page, request }) => {
    test.setTimeout(90000);
    await blockAnalytics(page);

    console.log('Navigating to Desktop view...');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('https://beta.teamwoodenstreet.com/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(4000);

    // Scroll to bottom to ensure footer is rendered/loaded
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(2000);

    // Locate the footer section
    const footerSelector = '.style_footerSection__KdicH, footer, #footer';
    const footer = page.locator(footerSelector).first();
    await expect(footer).toBeVisible({ timeout: 10000 });

    // Extract all desktop footer links
    const desktopLinks = await footer.locator('a').evaluateAll(links => {
      return links.map(a => ({
        text: a.innerText.trim(),
        href: a.getAttribute('href'),
        outerHTML: a.outerHTML
      }));
    });

    console.log(`Found ${desktopLinks.length} footer links on Desktop view.`);

    // Filter and normalize
    const baseUrl = 'https://beta.teamwoodenstreet.com/';
    const results = [];
    const checkedUrls = new Map();

    for (const link of desktopLinks) {
      if (!link.href) {
        results.push({
          text: link.text,
          rawHref: link.href,
          resolvedUrl: 'N/A',
          status: 'ERROR',
          isBroken: true,
          error: 'Missing href attribute'
        });
        continue;
      }

      if (link.href.startsWith('mailto:') || link.href.startsWith('tel:')) {
        results.push({
          text: link.text,
          rawHref: link.href,
          resolvedUrl: link.href,
          status: 'SKIPPED',
          isBroken: false,
          error: 'Mailto or Phone link'
        });
        continue;
      }

      const resolved = normalizeUrl(link.href, baseUrl);
      if (!resolved) {
        results.push({
          text: link.text,
          rawHref: link.href,
          resolvedUrl: 'N/A',
          status: 'ERROR',
          isBroken: true,
          error: 'Failed to normalize URL'
        });
        continue;
      }

      // Check if we already tested this URL to avoid duplicate HTTP requests
      if (checkedUrls.has(resolved)) {
        const cached = checkedUrls.get(resolved);
        results.push({
          text: link.text,
          rawHref: link.href,
          resolvedUrl: resolved,
          status: cached.status,
          isBroken: cached.isBroken,
          error: cached.error + ' (Duplicate)'
        });
        continue;
      }

      // Perform request
      console.log(`Checking link: ${resolved} (${link.text})`);
      try {
        const response = await request.get(resolved, {
          failOnStatusCode: false,
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });

        const status = response.status();
        let isBroken = false;
        let error = '';

        const isInternal = resolved.includes('woodenstreet.com') || resolved.includes('teamwoodenstreet.com');

        if (status >= 400) {
          // We can classify 403 on social/external pages as warnings/ignored since bots are often blocked by LinkedIn/Instagram/App Store
          if (!isInternal && (status === 403 || status === 999 || status === 401 || status === 400)) {
            // Social media platforms often return 999 (LinkedIn) or 403/401 to crawlers
            error = `External site restricted crawler (HTTP ${status})`;
          } else {
            isBroken = true;
            error = `HTTP Error Status: ${status}`;
          }
        }

        const checkRes = { status, isBroken, error };
        checkedUrls.set(resolved, checkRes);

        results.push({
          text: link.text,
          rawHref: link.href,
          resolvedUrl: resolved,
          status,
          isBroken,
          error
        });
      } catch (err) {
        const checkRes = { status: 'FAILED', isBroken: true, error: err.message };
        checkedUrls.set(resolved, checkRes);

        results.push({
          text: link.text,
          rawHref: link.href,
          resolvedUrl: resolved,
          status: 'FAILED',
          isBroken: true,
          error: err.message
        });
      }
    }

    // Save report
    const reportDir = path.join(__dirname, '../reports');
    await fs.ensureDir(reportDir);
    const reportPath = path.join(reportDir, 'desktop_footer_links_report.json');
    await fs.writeJson(reportPath, results, { spaces: 2 });
    console.log(`Saved Desktop report to ${reportPath}`);

    // Print summary to console
    const broken = results.filter(r => r.isBroken);
    console.log(`\n--- Desktop Footer Link Audit Results ---`);
    console.log(`Total Links Checked: ${results.length}`);
    console.log(`Working: ${results.length - broken.length}`);
    console.log(`Broken: ${broken.length}`);
    
    if (broken.length > 0) {
      console.log(`Broken Links List:`);
      broken.forEach(b => {
        console.log(` - [${b.text}] url: ${b.resolvedUrl} | error: ${b.error}`);
      });
      // Do not hard fail the test, we want to see the report
    }
  });

  test('Verify all footer links on Mobile View', async ({ page, request }) => {
    test.setTimeout(90000);
    await blockAnalytics(page);

    console.log('Navigating to Mobile view (iPhone 12 viewport)...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('https://beta.teamwoodenstreet.com/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(4000);

    // Scroll to bottom to ensure footer is rendered/loaded
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(2000);

    // Find and expand footer accordions on mobile
    // Accordion headers are: "OUR COMPANY", "SHOP BY ROOM", "USEFUL LINKS", "TRUSTED BY"
    const accordionHeaders = ['OUR COMPANY', 'SHOP BY ROOM', 'USEFUL LINKS', 'TRUSTED BY'];
    for (const title of accordionHeaders) {
      try {
        const btn = page.locator(`button:has-text("${title}")`).first();
        if (await btn.isVisible()) {
          const isExpanded = await btn.getAttribute('aria-expanded');
          if (isExpanded === 'false') {
            console.log(`Expanding accordion: ${title}`);
            await btn.click();
            await page.waitForTimeout(500); // Wait for open animation
          }
        }
      } catch (e) {
        console.log(`Failed to click/expand accordion header: ${title}`, e.message);
      }
    }

    // Take screenshot after expanding
    const screenshotsDir = path.join(__dirname, '../screenshots');
    await fs.ensureDir(screenshotsDir);
    await page.screenshot({ path: path.join(screenshotsDir, 'mobile_footer_expanded.png'), fullPage: true });

    // Now extract all links in the footer area (or parent section of these accordions)
    // The footer container class on desktop and mobile is likely style_footerSection__KdicH or similar
    const footerSelector = '.style_footerSection__KdicH, footer, #footer, [class*="footer" i], div:has-text("OUR COMPANY")';
    const footer = page.locator(footerSelector).first();
    
    const mobileLinks = await page.evaluate(() => {
      // Find the footer container or the div holding the accordions
      // From our previous check, the buttons are held in a container with class "w-full flex flex-col gap-2"
      // or we can just fetch all 'a' tags inside the element enclosing these accordions
      const container = document.querySelector('footer') || 
                        document.querySelector('[class*="footer"]') || 
                        document.querySelector('.w-full.flex.flex-col.gap-2')?.parentElement;
      if (!container) return [];
      
      return Array.from(container.querySelectorAll('a')).map(a => ({
        text: a.innerText.trim(),
        href: a.getAttribute('href'),
        outerHTML: a.outerHTML
      }));
    });

    console.log(`Found ${mobileLinks.length} footer links on Mobile view.`);

    const baseUrl = 'https://beta.teamwoodenstreet.com/';
    const results = [];
    const checkedUrls = new Map();

    for (const link of mobileLinks) {
      if (!link.href) {
        results.push({
          text: link.text,
          rawHref: link.href,
          resolvedUrl: 'N/A',
          status: 'ERROR',
          isBroken: true,
          error: 'Missing href attribute'
        });
        continue;
      }

      if (link.href.startsWith('mailto:') || link.href.startsWith('tel:')) {
        results.push({
          text: link.text,
          rawHref: link.href,
          resolvedUrl: link.href,
          status: 'SKIPPED',
          isBroken: false,
          error: 'Mailto or Phone link'
        });
        continue;
      }

      const resolved = normalizeUrl(link.href, baseUrl);
      if (!resolved) {
        results.push({
          text: link.text,
          rawHref: link.href,
          resolvedUrl: 'N/A',
          status: 'ERROR',
          isBroken: true,
          error: 'Failed to normalize URL'
        });
        continue;
      }

      // Check cache
      if (checkedUrls.has(resolved)) {
        const cached = checkedUrls.get(resolved);
        results.push({
          text: link.text,
          rawHref: link.href,
          resolvedUrl: resolved,
          status: cached.status,
          isBroken: cached.isBroken,
          error: cached.error + ' (Duplicate)'
        });
        continue;
      }

      // Perform check
      console.log(`Checking mobile link: ${resolved} (${link.text})`);
      try {
        const response = await request.get(resolved, {
          failOnStatusCode: false,
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1'
          }
        });

        const status = response.status();
        let isBroken = false;
        let error = '';

        const isInternal = resolved.includes('woodenstreet.com') || resolved.includes('teamwoodenstreet.com');

        if (status >= 400) {
          if (!isInternal && (status === 403 || status === 999 || status === 401 || status === 400)) {
            error = `External site restricted crawler (HTTP ${status})`;
          } else {
            isBroken = true;
            error = `HTTP Error Status: ${status}`;
          }
        }

        const checkRes = { status, isBroken, error };
        checkedUrls.set(resolved, checkRes);

        results.push({
          text: link.text,
          rawHref: link.href,
          resolvedUrl: resolved,
          status,
          isBroken,
          error
        });
      } catch (err) {
        const checkRes = { status: 'FAILED', isBroken: true, error: err.message };
        checkedUrls.set(resolved, checkRes);

        results.push({
          text: link.text,
          rawHref: link.href,
          resolvedUrl: resolved,
          status: 'FAILED',
          isBroken: true,
          error: err.message
        });
      }
    }

    // Save report
    const reportDir = path.join(__dirname, '../reports');
    await fs.ensureDir(reportDir);
    const reportPath = path.join(reportDir, 'mobile_footer_links_report.json');
    await fs.writeJson(reportPath, results, { spaces: 2 });
    console.log(`Saved Mobile report to ${reportPath}`);

    // Print summary to console
    const broken = results.filter(r => r.isBroken);
    console.log(`\n--- Mobile Footer Link Audit Results ---`);
    console.log(`Total Links Checked: ${results.length}`);
    console.log(`Working: ${results.length - broken.length}`);
    console.log(`Broken: ${broken.length}`);
    
    if (broken.length > 0) {
      console.log(`Broken Links List:`);
      broken.forEach(b => {
        console.log(` - [${b.text}] url: ${b.resolvedUrl} | error: ${b.error}`);
      });
    }
  });

});
