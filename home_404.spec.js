/**
 * Playwright 404 Link Checker
 * Target: https://www.woodenstreet.com/
 *
 * What it does:
 *  1. Opens the homepage in a real browser (Chromium)
 *  2. Collects every <a href>, <img src>, <script src>, <link href> URL
 *  3. Makes a HEAD request (falls back to GET) for each unique URL
 *  4. Flags anything that returns a 4xx or 5xx status
 *  5. Writes a summary report to broken-links-report.json
 *
 * Usage:
 *  npm install playwright
 *  npx playwright install chromium
 *  node check_404_links.js
 *
 * Optional env vars:
 *  TARGET_URL   – override the default URL  (default: https://www.woodenstreet.com/)
 *  CONCURRENCY  – parallel fetch workers    (default: 10)
 *  TIMEOUT_MS   – per-request timeout ms    (default: 15000)
 */

const { chromium } = require('playwright');
const https = require('https');
const http = require('http');
const fs = require('fs');
const url = require('url');

// ── Configuration ────────────────────────────────────────────────────────────
const TARGET_URL  = process.env.TARGET_URL  || 'https://www.woodenstreet.com/';
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '10', 10);
const TIMEOUT_MS  = parseInt(process.env.TIMEOUT_MS  || '15000', 10);
const REPORT_FILE = 'broken-links-report.json';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve a possibly-relative URL against a base. Returns null if invalid. */
function resolveUrl(base, href) {
  if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return null;
  }
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

/** Make a HEAD (then GET) request and return { status, finalUrl, method }. */
function fetchStatus(targetUrl, timeoutMs) {
  return new Promise((resolve) => {
    const parsed = url.parse(targetUrl);
    const lib = parsed.protocol === 'https:' ? https : http;

    const options = {
      hostname : parsed.hostname,
      path     : parsed.path || '/',
      method   : 'HEAD',
      headers  : {
        'User-Agent': 'Mozilla/5.0 (compatible; PlaywrightLinkChecker/1.0)',
        'Accept'    : '*/*',
      },
      timeout: timeoutMs,
    };

    const makeRequest = (method, retryWithGet = false) => {
      options.method = method;
      const req = lib.request(options, (res) => {
        // Follow redirects (up to 5 hops)
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          const next = resolveUrl(targetUrl, res.headers.location);
          if (next && next !== targetUrl) {
            return fetchStatus(next, timeoutMs).then(resolve);
          }
        }
        // Some servers 405 HEAD → retry with GET
        if (res.statusCode === 405 && !retryWithGet) {
          req.destroy();
          return makeRequest('GET', true);
        }
        resolve({ status: res.statusCode, finalUrl: targetUrl, method });
      });

      req.on('timeout', () => { req.destroy(); resolve({ status: 'TIMEOUT', finalUrl: targetUrl, method }); });
      req.on('error',   (e) => resolve({ status: `ERROR: ${e.message}`, finalUrl: targetUrl, method }));
      req.end();
    };

    makeRequest('HEAD');
  });
}

/** Throttled async map (p-limit style, no extra deps). */
async function pMap(items, fn, concurrency) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

// ── Colours for console output ───────────────────────────────────────────────
const c = {
  reset : '\x1b[0m',
  bold  : '\x1b[1m',
  red   : '\x1b[31m',
  green : '\x1b[32m',
  yellow: '\x1b[33m',
  cyan  : '\x1b[36m',
  grey  : '\x1b[90m',
};

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n${c.bold}${c.cyan}══════════════════════════════════════════════════${c.reset}`);
  console.log(`${c.bold}  Playwright 404 Link Checker${c.reset}`);
  console.log(`${c.cyan}══════════════════════════════════════════════════${c.reset}`);
  console.log(`  Target      : ${c.bold}${TARGET_URL}${c.reset}`);
  console.log(`  Concurrency : ${CONCURRENCY}`);
  console.log(`  Timeout     : ${TIMEOUT_MS} ms`);
  console.log(`${c.cyan}══════════════════════════════════════════════════${c.reset}\n`);

  // ── 1. Launch browser and collect all URLs from the page ──────────────────
  console.log(`${c.yellow}[1/3]${c.reset} Launching browser and scraping links …`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (compatible; PlaywrightLinkChecker/1.0)',
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  // Block images / fonts to speed up the initial load (we still capture their URLs)
  await page.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (['image', 'font', 'media'].includes(type)) {
      return route.abort();
    }
    route.continue();
  });

  // Intercept all network requests made during page load
  const networkUrls = new Set();
  page.on('request', (req) => {
    const u = req.url();
    if (u && u.startsWith('http')) networkUrls.add(u);
  });

  let pageTitle = TARGET_URL;
  try {
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 60_000 });
    pageTitle = await page.title();

    // Scroll to trigger lazy-loaded content
    await page.evaluate(async () => {
      await new Promise((done) => {
        let total = 0;
        const step = 400;
        const timer = setInterval(() => {
          window.scrollBy(0, step);
          total += step;
          if (total >= document.body.scrollHeight) {
            clearInterval(timer);
            done();
          }
        }, 120);
      });
    });

    // Wait a moment for any lazy-load triggers
    await page.waitForTimeout(2000);

  } catch (err) {
    console.warn(`${c.yellow}Warning: page load issue – ${err.message}${c.reset}`);
  }

  // Extract URLs from DOM
  const domUrls = await page.evaluate(() => {
    const found = new Set();

    // Anchor hrefs
    document.querySelectorAll('a[href]').forEach(a => found.add(a.href));

    // Images
    document.querySelectorAll('img[src]').forEach(img => found.add(img.src));

    // Scripts
    document.querySelectorAll('script[src]').forEach(s => found.add(s.src));

    // Stylesheets / icons
    document.querySelectorAll('link[href]').forEach(l => found.add(l.href));

    // srcset
    document.querySelectorAll('[srcset]').forEach(el => {
      el.srcset.split(',').forEach(part => {
        const u = part.trim().split(/\s+/)[0];
        if (u) found.add(new URL(u, location.href).href);
      });
    });

    return [...found].filter(u => u.startsWith('http'));
  });

  await browser.close();

  // Merge DOM + network URLs
  const allUrls = [...new Set([...domUrls, ...networkUrls])];

  // Filter: only check URLs on the same host (change if you want external too)
  const targetHost = new URL(TARGET_URL).hostname;
  const internalUrls = allUrls.filter(u => {
    try { return new URL(u).hostname === targetHost; }
    catch { return false; }
  });
  const externalUrls = allUrls.filter(u => {
    try { return new URL(u).hostname !== targetHost; }
    catch { return false; }
  });

  console.log(`  Page title   : ${c.bold}${pageTitle}${c.reset}`);
  console.log(`  Total URLs   : ${allUrls.length}`);
  console.log(`  Internal     : ${internalUrls.length}`);
  console.log(`  External     : ${externalUrls.length}`);

  // We'll check ALL urls (both internal & external)
  const urlsToCheck = allUrls;

  // ── 2. Check each URL ─────────────────────────────────────────────────────
  console.log(`\n${c.yellow}[2/3]${c.reset} Checking ${urlsToCheck.length} URLs (concurrency: ${CONCURRENCY}) …\n`);

  let checked = 0;
  const results = await pMap(urlsToCheck, async (u) => {
    const result = await fetchStatus(u, TIMEOUT_MS);
    checked++;
    const pct = Math.round((checked / urlsToCheck.length) * 100);
    const statusStr = String(result.status);
    const isBroken = statusStr.startsWith('4') || statusStr.startsWith('5') || statusStr === 'TIMEOUT' || statusStr.startsWith('ERROR');
    const colour   = isBroken ? c.red : c.green;
    process.stdout.write(
      `\r  Progress: ${c.bold}${pct}%${c.reset} (${checked}/${urlsToCheck.length})  ` +
      `Last: ${colour}${statusStr}${c.reset} – ${u.substring(0, 70)}${u.length > 70 ? '…' : ''}    `
    );
    return { url: u, ...result };
  }, CONCURRENCY);

  process.stdout.write('\n\n');

  // ── 3. Report ─────────────────────────────────────────────────────────────
  console.log(`${c.yellow}[3/3]${c.reset} Generating report …\n`);

  const broken   = results.filter(r => {
    const s = String(r.status);
    return s.startsWith('4') || s.startsWith('5') || s === 'TIMEOUT' || s.startsWith('ERROR');
  });
  const ok       = results.filter(r => String(r.status).startsWith('2') || String(r.status).startsWith('3'));
  const notFound = results.filter(r => r.status === 404);

  // Console table of broken links
  if (broken.length === 0) {
    console.log(`${c.green}${c.bold}✔  No broken links found!${c.reset}\n`);
  } else {
    console.log(`${c.red}${c.bold}✖  Broken / problematic links (${broken.length}):${c.reset}\n`);
    broken.forEach((r, i) => {
      console.log(`  ${c.grey}${String(i + 1).padStart(3)}.${c.reset} [${c.red}${r.status}${c.reset}] ${r.url}`);
    });
    console.log('');
  }

  // Summary
  console.log(`${c.cyan}══════════════════════════════════════════════════${c.reset}`);
  console.log(`  Total checked : ${results.length}`);
  console.log(`  ${c.green}OK (2xx/3xx)  : ${ok.length}${c.reset}`);
  console.log(`  ${c.red}Broken        : ${broken.length}${c.reset}`);
  console.log(`    of which 404 : ${notFound.length}`);
  console.log(`${c.cyan}══════════════════════════════════════════════════${c.reset}\n`);

  // JSON report
  const report = {
    meta: {
      targetUrl   : TARGET_URL,
      pageTitle,
      checkedAt   : new Date().toISOString(),
      totalUrls   : results.length,
      okCount     : ok.length,
      brokenCount : broken.length,
      notFoundCount: notFound.length,
    },
    broken,
    ok,
  };

  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');
  console.log(`  Full report saved → ${c.bold}${REPORT_FILE}${c.reset}\n`);

  // Exit with non-zero code if broken links found (useful for CI)
  process.exit(broken.length > 0 ? 1 : 0);
})();