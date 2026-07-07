const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.BASE_URL || 'https://beta.teamwoodenstreet.com/';
const CSV_FILE = process.env.CSV_FILE || path.join(__dirname, 'searchai.csv');
const RESULTS_CSV = path.join(__dirname, 'searcht1_results_click.csv');

// --- Synchronous Setup for Parallel Execution ---
// We must read the file synchronously BEFORE tests are defined so Playwright knows how many tests to schedule across workers.
let queries = [];
try {
    const fileContent = fs.readFileSync(CSV_FILE, 'utf8');
    queries = fileContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && line.toLowerCase() !== 'product' && line.toLowerCase() !== 'query'); // skip empty lines or headers
    console.log(`Successfully loaded ${queries.length} product queries from ${CSV_FILE}`);
} catch (e) {
    console.error(`Failed to load CSV: ${e.message}`);
    process.exit(1);
}

// Ensure the results CSV has headers if it doesn't exist
if (!fs.existsSync(RESULTS_CSV)) {
    try {
        fs.writeFileSync(RESULTS_CSV, 'Index,Product Query,Page Type,Final URL,Elapsed (ms)\n', 'utf8');
    } catch (e) { }
}

// --- Helper Functions ---
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
        const popupSelector = 'button[class*="absolute right-0 -top-8 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"]';
        const el = await page.$(popupSelector);
        if (el && await el.isVisible()) {
            await el.click({ timeout: 800 }).catch(() => { });
            await page.waitForTimeout(500);
        }
    } catch { }
}

test.describe('Product Search queries from CSV - Multiple Workers Supported', () => {

    for (let i = 0; i < queries.length; i++) {
        const query = queries[i];

        // Each query gets its OWN test block. This is required for Playwright to distribute them across workers!
        test(`[${i + 1}/${queries.length}] Testing Query: "${query}"`, async ({ page }) => {
            test.setTimeout(35000); // Individual test timeout
            const t0 = Date.now();
            
            await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(500); // Small wait for stability

            // Try to dismiss popups
            await dismissPopups(page);

            // Locate main search input
            const searchInput = page.locator('header input[placeholder*="Search" i], input.undefined.w-full, input[type="search"], input[name="search"], input[placeholder*="search" i], .search-input input, input[name="q"], #search').first();
            await expect(searchInput).toBeVisible({ timeout: 10000 });

            await searchInput.click({ force: true });
            await searchInput.fill(''); // Clear existing text if any
            await searchInput.pressSequentially(query, { delay: 15 });

            const currUrl = page.url();

            // Click the search icon
            const searchIcon = page.locator('header button[aria-label="Search" i], header button[type="submit"], header .search-icon, header button:has-text("Search"), header form button').first();
            await expect(searchIcon).toBeVisible({ timeout: 5000 });
            await searchIcon.click({ force: true });

            // Efficiently wait for URL to change
            let elapsedNav = 0;
            while (page.url() === currUrl && elapsedNav < 8000) {
                await page.waitForTimeout(500);
                elapsedNav += 500;
            }

            // Minimal wait post-navigation to allow DOM elements to mount
            await page.waitForLoadState('domcontentloaded').catch(() => { });
            await page.waitForTimeout(2000);

            const finalUrl = page.url();
            const pageType = detectPageType(finalUrl);
            const totalElapsed = Date.now() - t0;

            console.log(`[${i + 1}/${queries.length}] Product: ${query} -> URL: ${finalUrl}`);

            // Concurrency-safe write: Append to CSV directly
            // ExcelJS requires complex handling across multiple node processes, so we write to a CSV file instead.
            const logLine = `${i + 1},"${query.replace(/"/g, '""')}","${pageType}","${finalUrl}",${totalElapsed}\n`;
            try {
                fs.appendFileSync(RESULTS_CSV, logLine, 'utf8');
            } catch (err) {
                console.error(`Failed to write result for ${query}:`, err);
            }
        });
    }

});
