const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const ExcelJS = require('exceljs');

// ─── Configuration ────────────────────────────────────────────────────────────
const BASE_URL = process.env.BASE_URL || 'https://www.woodenstreet.com/';//'https://beta.teamwoodenstreet.com/';
const CSV_FILE = process.env.CSV_FILE || path.join(__dirname, 'searchai.csv');
const RESULTS_FILE = path.join(__dirname, 'search_results11.xlsx');
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '1'); // tabs per worker
const NAV_TIMEOUT = 20000;
const IDLE_TIMEOUT = 8000;

// ─── Shared results accumulator (written at end) ──────────────────────────────
const results = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function loadQueries() {
    return new Promise((resolve, reject) => {
        const queries = [];
        if (!fs.existsSync(CSV_FILE)) return reject(new Error(`CSV not found: ${CSV_FILE}`));
        fs.createReadStream(CSV_FILE)
            .pipe(csv())
            .on('data', (row) => {
                const val = row.query || row.Query || row.QUERY || row.keyword || Object.values(row)[0];
                if (val && val.trim()) queries.push(val.trim());
            })
            .on('end', () => resolve(queries))
            .on('error', reject);
    });
}

function detectPageType(urlStr) {
    try {
        const u = new URL(urlStr);
        if (/[?&](search|q|query|keyword)=|\/search[/?]/i.test(urlStr)) return 'search';
        const p = u.pathname.replace(/\/+/g, '/');
        if (p !== '/' && !u.search && /^\/[a-z0-9-]+(\/[a-z0-9-]+)*\/?$/i.test(p)) return 'category';
    } catch { }
    return 'unknown';
}

async function dismissPopups(page) {
    try {
        const sel = 'button[class*="absolute right-0 -top-8"]';
        const el = await page.$(sel);
        if (el && await el.isVisible()) await el.click({ timeout: 500 }).catch(() => { });
    } catch { }
}

async function runQuery(page, query, index, total) {
    const result = { index: index + 1, query, status: '', pageType: '', url: '', notes: '' };
    const start = Date.now();

    try {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
        await dismissPopups(page);

        const searchInput = page.locator(
            'header input[placeholder*="Search" i], input[type="search"], input[name="search"], input[name="q"], #search'
        ).first();

        await searchInput.waitFor({ state: 'visible', timeout: 8000 });
        await searchInput.click({ force: true });
        await searchInput.fill('');
        await searchInput.fill(query); // fill is faster than pressSequentially for 2k queries

        const beforeUrl = page.url();
        await searchInput.press('Enter');

        // Wait for URL change (max 15s)
        await page.waitForFunction(
            (prev) => location.href !== prev,
            beforeUrl,
            { timeout: 15000 }
        ).catch(() => { });

        if (page.url() === beforeUrl) {
            result.status = 'TIMEOUT';
            result.notes = 'Page did not redirect after search';
            result.elapsed = Date.now() - start;
            return result;
        }

        await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => { });
        // Short wait for lazy-rendered product grid
        await page.waitForTimeout(1500);

        result.url = page.url();
        result.pageType = detectPageType(result.url);

        // Zero results detection
        let isZeroResults = false;
        const zeroSelectors = ['[class*="no-result" i]', '[class*="noresult" i]', '.empty-search', '.search-empty'];
        for (const sel of zeroSelectors) {
            if (await page.locator(sel).first().isVisible({ timeout: 300 }).catch(() => false)) {
                isZeroResults = true;
                result.notes = `Zero-result selector matched: ${sel}`;
                break;
            }
        }

        if (!isZeroResults && result.pageType !== 'category') {
            const bodyText = await page.evaluate(() => document.body.innerText).catch(() => '');
            if (bodyText.toLowerCase().includes('no results found')) {
                isZeroResults = true;
                result.notes = 'Body text: "no results found"';
            }
        }

        if (isZeroResults) {
            result.status = 'ZERO_RESULTS';
        } else if (!['search', 'category'].includes(result.pageType)) {
            result.status = 'UNEXPECTED_PAGE';
            result.notes = result.notes || `Unexpected page type: ${result.pageType}`;
        } else {
            result.status = 'PASS';
        }

    } catch (err) {
        result.status = 'ERROR';
        result.notes = err.message?.slice(0, 200);
    }

    result.elapsed = Date.now() - start;
    console.log(`[${index + 1}/${total}] ${result.status.padEnd(16)} "${query}" → ${result.url}`);
    return result;
}

async function writeExcel(rows) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Playwright Search Audit';
    wb.created = new Date();

    // ── Summary sheet ──────────────────────────────────────────────────────────
    const summary = wb.addWorksheet('Summary');
    summary.columns = [
        { header: 'Metric', key: 'metric', width: 28 },
        { header: 'Count', key: 'count', width: 14 },
    ];
    const total = rows.length;
    const pass = rows.filter(r => r.status === 'PASS').length;
    const zero = rows.filter(r => r.status === 'ZERO_RESULTS').length;
    const timeout = rows.filter(r => r.status === 'TIMEOUT').length;
    const error = rows.filter(r => r.status === 'ERROR').length;
    const unexpected = rows.filter(r => r.status === 'UNEXPECTED_PAGE').length;
    const avgElapsed = Math.round(rows.reduce((a, r) => a + (r.elapsed || 0), 0) / total);

    const summaryData = [
        ['Total Queries', total],
        ['✅ Pass', pass],
        ['⚠️ Zero Results', zero],
        ['⏱️ Timeout', timeout],
        ['❌ Error', error],
        ['🔀 Unexpected Page', unexpected],
        ['Pass Rate', `=B3/B2`],
        ['Avg Response Time (ms)', avgElapsed],
    ];
    summaryData.forEach(([metric, count]) => summary.addRow({ metric, count }));
    summary.getRow(1).font = { bold: true, size: 12 };
    summary.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
    summary.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    // Color-code pass rate row
    summary.getCell('B9').numFmt = '0.0%';
    summary.getCell('B9').font = { bold: true, color: { argb: pass / total >= 0.9 ? 'FF00B050' : 'FFFF0000' } };

    // ── Results sheet ──────────────────────────────────────────────────────────
    const ws = wb.addWorksheet('Results');
    ws.columns = [
        { header: '#', key: 'index', width: 7 },
        { header: 'Query', key: 'query', width: 30 },
        { header: 'Status', key: 'status', width: 18 },
        { header: 'Page Type', key: 'pageType', width: 14 },
        { header: 'Final URL', key: 'url', width: 60 },
        { header: 'Elapsed (ms)', key: 'elapsed', width: 14 },
        { header: 'Notes', key: 'notes', width: 50 },
    ];

    // Header row styling
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 22;

    // Status color map
    const statusColors = {
        PASS: 'FFE2EFDA',           // light green
        ZERO_RESULTS: 'FFFFF2CC',  // light yellow
        TIMEOUT: 'FFFCE4D6',       // light orange
        ERROR: 'FFFFC7CE',         // light red
        UNEXPECTED_PAGE: 'FFDDEBF7', // light blue
    };

    rows.forEach((r) => {
        const row = ws.addRow(r);
        const fill = statusColors[r.status] || 'FFFFFFFF';
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
        row.alignment = { vertical: 'middle', wrapText: false };
        // Make URL clickable
        if (r.url) {
            const cell = row.getCell('url');
            cell.value = { text: r.url, hyperlink: r.url };
            cell.font = { color: { argb: 'FF0563C1' }, underline: true };
        }
    });

    // Freeze header, enable autoFilter
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = { from: 'A1', to: 'G1' };

    // ── Zero Results sheet ────────────────────────────────────────────────────
    const zeroWs = wb.addWorksheet('Zero Results');
    zeroWs.columns = [
        { header: '#', key: 'index', width: 7 },
        { header: 'Query', key: 'query', width: 30 },
        { header: 'Final URL', key: 'url', width: 60 },
        { header: 'Notes', key: 'notes', width: 50 },
    ];
    const zeroHeader = zeroWs.getRow(1);
    zeroHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    zeroHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBF8F00' } };
    rows.filter(r => r.status === 'ZERO_RESULTS').forEach(r => zeroWs.addRow(r));
    zeroWs.views = [{ state: 'frozen', ySplit: 1 }];

    // ── Errors sheet ──────────────────────────────────────────────────────────
    const errWs = wb.addWorksheet('Errors & Timeouts');
    errWs.columns = [
        { header: '#', key: 'index', width: 7 },
        { header: 'Query', key: 'query', width: 30 },
        { header: 'Status', key: 'status', width: 18 },
        { header: 'Notes', key: 'notes', width: 60 },
    ];
    const errHeader = errWs.getRow(1);
    errHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    errHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC00000' } };
    rows.filter(r => ['ERROR', 'TIMEOUT'].includes(r.status)).forEach(r => errWs.addRow(r));
    errWs.views = [{ state: 'frozen', ySplit: 1 }];

    await wb.xlsx.writeFile(RESULTS_FILE);
    console.log(`\n✅ Excel report written to: ${RESULTS_FILE}`);
}

// ─── Test ─────────────────────────────────────────────────────────────────────
test.describe('Search Audit – Parallel Batch Runner', () => {
    let queries = [];

    test.beforeAll(async () => {
        queries = await loadQueries();
        console.log(`Loaded ${queries.length} queries from ${CSV_FILE}`);
        console.log(`Running ${CONCURRENCY} tabs in parallel per worker`);
    });

    test('Run all queries in parallel batches', async ({ browser }) => {
        test.setTimeout(queries.length * 4000 + 60000);

        // Process in batches of CONCURRENCY (parallel tabs)
        for (let batchStart = 0; batchStart < queries.length; batchStart += CONCURRENCY) {
            const batch = queries.slice(batchStart, batchStart + CONCURRENCY);
            const pages = await Promise.all(batch.map(() => browser.newPage()));

            try {
                const batchResults = await Promise.all(
                    batch.map((query, i) => runQuery(pages[i], query, batchStart + i, queries.length))
                );
                results.push(...batchResults);
            } finally {
                await Promise.all(pages.map(p => p.close().catch(() => { })));
            }
        }

        // Write Excel after all queries are done
        results.sort((a, b) => a.index - b.index);
        await writeExcel(results);

        // Soft-assert zero results
        const failures = results.filter(r => r.status !== 'PASS');
        for (const f of failures) {
            expect.soft(false, `[${f.index}] "${f.query}" → ${f.status}: ${f.notes}`).toBeTruthy();
        }

        const passRate = ((results.filter(r => r.status === 'PASS').length / results.length) * 100).toFixed(1);
        console.log(`\n📊 Pass rate: ${passRate}% (${results.filter(r => r.status === 'PASS').length}/${results.length})`);
    });
});