const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.BASE_URL || 'https://www.woodenstreet.com/';
const CSV_FILE = process.env.CSV_FILE || path.join(__dirname, 'searchai.csv');

// --- Helper Functions ---
function loadQueriesSync() {
    const queries = [];
    if (!fs.existsSync(CSV_FILE)) {
        console.error(`CSV not found: ${CSV_FILE}`);
        return queries;
    }
    const content = fs.readFileSync(CSV_FILE, 'utf-8');
    const lines = content.split(/\r?\n/);
    if (lines.length === 0) return queries;

    // Detect header
    const firstRow = lines[0].toLowerCase();
    let startIndex = (firstRow.includes('query') || firstRow.includes('keyword')) ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        // Extract first column (simple CSV parse)
        let val = line.split(',')[0].trim();
        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1).trim();
        }
        if (val) queries.push(val);
    }
    return queries;
}

function detectPageType(urlStr) {
    let u;
    try { u = new URL(urlStr); } catch { return 'unknown'; }

    if (/[?&](search|q|query|keyword)=|\/search[/?]/i.test(urlStr)) return 'search';

    const pathname = u.pathname.replace(/\/+/g, '/');
    const isCleanPath = pathname !== '/' && pathname !== '' && !u.search;
    if (isCleanPath && /^\/[a-z0-9-]+(\/[a-z0-9-]+)*\/?$/i.test(pathname)) return 'category';

    return 'unknown';
}

async function dismissPopups(page) {
    try {
        const popupSelector = 'button[class*="absolute right-0 -top-8 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"]';
        const el = await page.$(popupSelector);
        if (el && await el.isVisible()) {
            await el.click({ timeout: 800 }).catch(() => { });
            await page.waitForTimeout(500);
        }
    } catch { }
}

// Load queries at top-level for dynamic test generation
const queries = loadQueriesSync();

test.describe.configure({ mode: 'parallel' });

test.describe('Search queries from CSV - Redirection & Zero Results', () => {

    test.beforeEach(async ({ page }) => {
        // Optimization: Block images and analytics/tracking to speed up loads
        await page.route('**/*', (route) => {
            const type = route.request().resourceType();
            const url = route.request().url();
            if (
                type === 'image' || 
                type === 'media' || 
                type === 'font' ||
                url.includes('google-analytics') || 
                url.includes('facebook') || 
                url.includes('hotjar') ||
                url.includes('doubleclick')
            ) {
                route.abort();
            } else {
                route.continue();
            }
        });
    });

    const queryLimit = queries.length;

    for (let i = 0; i < queryLimit; i++) {
        const query = queries[i];

        test(`[${i + 1}/${queryLimit}] Testing Query: "${query}"`, async ({ page }, testInfo) => {
            test.setTimeout(40000);

            const t0 = Date.now();
            
            // Optimization: Only go to homepage if we aren't already on a WoodenStreet page
            if (!page.url().includes('woodenstreet.com')) {
                await page.goto(BASE_URL, { waitUntil: 'commit' }); // 'commit' is faster than 'domcontentloaded'
            }

            // Try to find search input immediately
            const searchInput = page.locator('header input[placeholder*="Search" i], input.undefined.w-full, input[type="search"], #search').first();
            
            try {
                await searchInput.waitFor({ state: 'visible', timeout: 5000 });
            } catch (e) {
                // If not found, reload homepage once
                await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
                await dismissPopups(page);
            }

            await searchInput.fill(query);
            const currUrl = page.url();
            await searchInput.press('Enter');

            // Wait for URL change or results to appear
            try {
                await Promise.race([
                    page.waitForURL(url => url.toString() !== currUrl, { timeout: 8000 }),
                    page.locator('.product-list, .search-empty, [class*="no-result" i]').first().waitFor({ state: 'visible', timeout: 8000 })
                ]);
            } catch (e) { /* continue anyway to check current state */ }

            // Minimal stability wait - much shorter than 2000ms
            await page.waitForLoadState('commit').catch(() => { });

            const finalUrl = page.url();
            const pageType = detectPageType(finalUrl);

            const zeroSelectors = [
                '[class*="no-result" i]',
                '[class*="noresult" i]',
                '.empty-search',
                '.search-empty'
            ];
            let isZeroResults = false;
            for (const sel of zeroSelectors) {
                if (await page.locator(sel).first().isVisible({ timeout: 500 }).catch(() => false)) {
                    isZeroResults = true;
                    break;
                }
            }

            if (!isZeroResults && pageType !== 'category') {
                const bodyText = await page.evaluate(() => document.body.innerText).catch(() => "");
                if (bodyText.toLowerCase().includes("no results found")) {
                    isZeroResults = true;
                }
            }

            let queryStatus = 'PASS';
            let notes = '';

            if (isZeroResults) {
                queryStatus = 'ZERO_RESULTS';
                notes = '0 results found';
            } else if (!['search', 'category'].includes(pageType)) {
                queryStatus = 'UNEXPECTED_PAGE';
                notes = `Unexpected page type: ${pageType}`;
            }

            const resultObj = {
                index: i + 1,
                query: query,
                status: queryStatus,
                pageType: pageType,
                url: finalUrl,
                elapsed: Date.now() - t0,
                notes: notes
            };

            // Push result to annotations for the Excel reporter
            testInfo.annotations.push({ type: 'custom-result', description: JSON.stringify(resultObj) });
            
            console.log(`[${i + 1}/${queryLimit}] Query: ${query} -> Type: ${pageType} -> Status: ${queryStatus}`);
            
            if (queryStatus !== 'PASS') {
                // Soft fail so other workers continue
                expect.soft(queryStatus).toBe('PASS');
            }
        });
    }
});

