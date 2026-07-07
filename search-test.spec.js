// search_redirect_test.js
// Playwright automation to test search query redirections and product results

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const xlsx = require("xlsx");

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const CONFIG = {
    baseUrl: process.env.BASE_URL || "https://www.woodenstreet.com/",
    resultCountSelector: 'p.text-sm.font-redhatRegular',
    resCatCount: 'text-secondary600  text-xs md:text-sm block font-redhatRegular tracking-wide',
    // ✅ UPDATED SELECTORS (based on your DOM)
    searchInputSelector: `
        input[placeholder*="Search Products"],
        .style_headerSearch__P86sm input,
        input[type="text"]
    `,

    searchSubmitSelector: `
        button[aria-label="Search"],
        .style_headerSearch__P86sm button
    `,

    // URL patterns
    categoryPagePattern: /\/(category|c|collections|dept)\//i,
    searchPagePattern: /\/(search|results|s)\?/i,

    // Product selectors
    productCardSelector: '.product-card, .product-item, [data-product-id], .product',
    productNameSelector: '.product-title, .product-name, h2.title, .item-name',

    // Output
    outputDir: "./results",
    screenshotsDir: "./results/screenshots",
    reportFile: "./results/report2.xlsx",


    // Browser settings
    headless: false,
    timeout: 1000,
    slowMo: 450,
};
// ─────────────────────────────────────────────────────────────────────────────

// ─── INPUT READER ────────────────────────────────────────────────────────────
async function readInputFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".csv") return readCsv(filePath);
    if (ext === ".xlsx" || ext === ".xls") return readXlsx(filePath);
    throw new Error(`Unsupported file type: ${ext}`);
}

function readCsv(filePath) {
    return new Promise((resolve, reject) => {
        const rows = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on("data", (row) => {
                const normalized = normalizeRow(row);
                if (normalized.query) rows.push(normalized);
            })
            .on("end", () => resolve(rows))
            .on("error", reject);
    });
}

function readXlsx(filePath) {
    const wb = xlsx.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);
    return rows.map(normalizeRow).filter((r) => r.query);
}

function normalizeRow(row) {
    const lower = {};
    for (const [k, v] of Object.entries(row)) {
        lower[k.trim().toLowerCase().replace(/\s+/g, "_")] = String(v || "").trim();
    }
    return {
        query: lower.query || lower.search_query || lower.keyword || "",
        expected_type: (lower.expected_type || lower.type || "any").toLowerCase(),
        expected_products: lower.expected_products || lower.products || "",
    };
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── PAGE TYPE DETECTOR ──────────────────────────────────────────────────────
function detectPageType(url) {
    if (CONFIG.categoryPagePattern.test(url)) return "category";
    if (CONFIG.searchPagePattern.test(url)) return "search";
    return "unknown";
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── SINGLE QUERY TEST ───────────────────────────────────────────────────────
async function testQuery(page, testCase, index) {
    const { query, expected_type, expected_products, numberOfProducts } = testCase;




    const result = {
        index: index + 1,
        query,
        expected_type,
        expected_products,
        actual_type: "",
        final_url: "",
        page_title: "",
        products_found: [],
        expected_products_present: "",
        missing_products: [],
        notes: [],
        screenshot: "",
        total_count: numberOfProducts
    };

    try {
        // 1. Navigate
        await page.goto(CONFIG.baseUrl, {
            waitUntil: "domcontentloaded",
            timeout: CONFIG.timeout
        });

        // Close Login/Signup Popup if it appears
        try {
            // Updated to precisely target the button using the provided Tailwind classes
            // absolute right-0 -top-8 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground
            const closePopupBtn = await page.waitForSelector('button[class*="absolute right-0 -top-8 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"]', { state: 'visible', timeout: 3000 });
            if (closePopupBtn) {
                await closePopupBtn.click();
                await page.waitForTimeout(500); // Wait briefly to let the popup closing animation finish
            }
        } catch (e) {
            // Popup didn't appear, ignore and continue
        }

        // 2. Find search input
        const searchInput = await page.waitForSelector(CONFIG.searchInputSelector, {
            timeout: CONFIG.timeout,
        });

        // ✅ IMPORTANT: Click before typing (fixes many UI issues)
        await searchInput.click();
        await searchInput.fill("");
        await searchInput.type(query, { delay: 50 });

        // 3. Submit search
        try {
            const submitBtn = await page.$(CONFIG.searchSubmitSelector);
            if (submitBtn) {
                await submitBtn.click();
            } else {
                await searchInput.press("Enter");
            }
        } catch {
            await searchInput.press("Enter");
        }

        // 4. Wait
        await page.waitForLoadState("networkidle", { timeout: CONFIG.timeout }).catch(() => { });
        await page.waitForTimeout(1000);

        const resultCountText = await page.textContent(CONFIG.resultCountSelector).catch(() => null);
        const currentUrl = page.url();
        let actualCount = 0;
        if (!currentUrl?.includes("search")) {
            const resultCountText = await page.textContent(CONFIG.resCatCount).catch(() => null);
            if (resultCountText) {

                actualCount = 1
            }
        }
        else if (resultCountText) {
            const match = resultCountText.match(/\d+/);
            actualCount = match ? parseInt(match[0], 10) : 0;
        }

        result.total_count = actualCount;
        result.status = actualCount == 0 ? "FAIL" : "PASS";

        // ✅ Apply FAIL condition here (NOT in initial object)
        if (actualCount === 0) {
            result.status = "FAIL";
            result.notes.push("0 results found on page");
        }

        result.final_url = page.url();
        result.page_title = await page.title();
        result.actual_type = detectPageType(result.final_url);

        // 5. Validate redirect
        if (expected_type !== "any" && expected_type && result.actual_type !== expected_type) {
            result.status = "FAIL";
            result.notes.push(`Expected "${expected_type}" but got "${result.actual_type}"`);
        }

        // 6. Product validation
        if (result.actual_type === "search" && expected_products) {
            const keywords = expected_products
                .split(",")
                .map(k => k.trim().toLowerCase())
                .filter(Boolean);

            const productEls = await page.$$(CONFIG.productCardSelector);

            for (const el of productEls) {
                const nameEl = await el.$(CONFIG.productNameSelector);
                const name = nameEl
                    ? (await nameEl.textContent()).trim()
                    : (await el.textContent()).trim().split("\n")[0];

                if (name) result.products_found.push(name);
            }

            const foundLower = result.products_found.map(p => p.toLowerCase());

            const missing = keywords.filter(
                kw => !foundLower.some(p => p.includes(kw))
            );

            result.missing_products = missing;
            result.expected_products_present = missing.length === 0 ? "YES" : "PARTIAL/NO";

            if (missing.length > 0) {
                result.status = result.status === "FAIL" ? "FAIL" : "WARN";
                result.notes.push(`Missing: ${missing.join(", ")}`);
            }
        } else if (result.actual_type === "category") {
            result.expected_products_present = "N/A (category page)";
        }

        // 7. Screenshot
        const screenshotName = `${String(index + 1).padStart(3, "0")}_${query
            .replace(/[^a-z0-9]/gi, "_")
            .substring(0, 40)}.png`;

        const screenshotPath = path.join(CONFIG.screenshotsDir, screenshotName);

        await page.screenshot({ path: screenshotPath });
        result.screenshot = screenshotName;

    } catch (err) {
        result.status = "ERROR";
        result.notes.push(`Error: ${err.message}`);
    }

    if (result.notes.length === 0 && result.status === "PASS") {
        result.notes.push("All checks passed");
    }

    result.notes = result.notes.join(" | ");
    return result;
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── REPORT WRITER ───────────────────────────────────────────────────────────
function writeReport(results) {
    const wb = xlsx.utils.book_new();

    const headers = [
        "#", "Query", "Expected Type", "Actual Type", "Status",
        "Expected Products", "Products Present?", "Missing Products",
        "Final URL", "Page Title", "Notes", "Screenshot", 'Total Count'
    ];

    const rows = results.map(r => [
        r.index, r.query, r.expected_type, r.actual_type, r.status,
        r.expected_products, r.expected_products_present,
        r.missing_products.join(", "),
        r.final_url, r.page_title, r.notes, r.screenshot, r.total_count
    ]);

    const sheet = xlsx.utils.aoa_to_sheet([headers, ...rows]);
    xlsx.utils.book_append_sheet(wb, sheet, "Results");

    xlsx.writeFile(wb, CONFIG.reportFile);
    console.log(`📊 Report saved: ${CONFIG.reportFile}`);
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {

    /// for file path if in same dir then write csv file and if in diff dir then dir path 
    const inputFile = path.join(__dirname, "searchai.csv");

    if (!fs.existsSync(inputFile)) {
        console.error("File not found:", inputFile);
        process.exit(1);
    }

    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    fs.mkdirSync(CONFIG.screenshotsDir, { recursive: true });

    console.log(`🔍 Reading: ${inputFile}`);
    const testCases = await readInputFile(inputFile);
    console.log(`Found ${testCases.length} queries\n`);

    const browser = await chromium.launch({
        headless: CONFIG.headless,
        slowMo: CONFIG.slowMo
    });

    const page = await browser.newPage();

    const results = [];

    for (let i = 0; i < testCases.length; i++) {
        const result = await testQuery(page, testCases[i], i);
        results.push(result);
        console.log(`${i + 1}. ${result.status} → ${result.query}`);
    }

    await browser.close();

    writeReport(results);
}

main().catch(console.error);