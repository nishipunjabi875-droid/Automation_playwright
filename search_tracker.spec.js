// search-tracker.spec.js
// ─────────────────────────────────────────────────────────────────────────────
// Run with:  npx playwright test search-tracker.spec.js --headed
// Or add  headed: true  in playwright.config.js use block.
// Reads queries from search.csv (same folder, or pass path via env CSV_FILE).
// Saves report to results/search-report.xlsx
// ─────────────────────────────────────────────────────────────────────────────

const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const xlsx = require("xlsx");

// ── Config ────────────────────────────────────────────────────────────────────
const BASE_URL = "https://beta.teamwoodenstreet.com/";
const CSV_FILE = process.env.CSV_FILE || path.join(__dirname, "search.csv");
const RESULTS_DIR = path.join(__dirname, "results");
const REPORT_FILE = path.join(RESULTS_DIR, "search-report.xlsx");

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Read all rows from the CSV and return an array of query strings */
function loadQueries() {
  return new Promise((resolve, reject) => {
    const queries = [];

    if (!fs.existsSync(CSV_FILE)) {
      return reject(new Error(`CSV not found: ${CSV_FILE}`));
    }

    fs.createReadStream(CSV_FILE)
      .pipe(csv())
      .on("data", (row) => {
        // Accept columns named: query | Query | QUERY | keyword | search | term
        const value =
          row.query ||
          row.Query ||
          row.QUERY ||
          row.keyword ||
          row.search ||
          row.term ||
          Object.values(row)[0]; // fallback: first column whatever its name
        if (value && value.trim()) queries.push(value.trim());
      })
      .on("end", () => resolve(queries))
      .on("error", reject);
  });
}

/** Classify where the search landed */
function classifyURL(finalURL, query) {
  const url = finalURL.toLowerCase();
  const decoded = decodeURIComponent(url);

  if (
    url.includes("/search") ||
    url.includes("?q=") ||
    url.includes("&q=") ||
    url.includes("search=") ||
    url.includes("keyword=") ||
    decoded.includes(query.toLowerCase())
  ) {
    return "Search Results Page";
  }

  if (
    url.includes("/category/") ||
    url.includes("/collections/") ||
    url.includes("/cat/") ||
    url.includes("/c/") ||
    url.includes("/furniture/") ||
    url.includes("/living-room/") ||
    url.includes("/bedroom/") ||
    url.includes("/dining/") ||
    url.includes("/office/") ||
    url.includes("/kids/") ||
    url.includes("/outdoor/")
  ) {
    return "Category Page";
  }

  // If URL changed from home and isn't search — treat as category/listing
  if (url !== BASE_URL.toLowerCase() && !url.endsWith("/")) {
    return "Category / Listing Page";
  }

  return "Unknown";
}

/** Detect zero-result state on the current page */
async function detectNoResults(page) {
  // 1. Check known zero-result DOM selectors
  const zeroSelectors = [
    '[class*="no-result" i]',
    '[class*="noresult" i]',
    '[class*="zero-result" i]',
    '[class*="empty-result" i]',
    '[class*="no-product" i]',
    '[id*="no-result" i]',
    ".empty-search",
    ".search-empty",
    '[data-testid*="no-result" i]',
  ];
  for (const sel of zeroSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 800 }).catch(() => false)) return true;
  }

  // 2. Check page body text
  const bodyText = await page
    .textContent("body", { timeout: 3000 })
    .catch(() => "");
  const lower = bodyText.toLowerCase();
  const zeroTexts = [
    "no results found",
    "no products found",
    "0 results",
    "0 products",
    "no result",
    "couldn't find",
    "could not find",
    "no matches",
    "nothing found",
    "search returned no",
  ];
  return zeroTexts.some((t) => lower.includes(t));
}

/** Save the results array to an xlsx report */
function saveReport(results) {
  if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });

  const rows = results.map((r) => ({
    "Search Query": r.query,
    Status: r.status,
    "Redirect Type": r.redirectType,
    "Final URL": r.finalUrl,
    "Time (ms)": r.timeMs,
    Notes: r.notes,
  }));

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows);

  // Column widths
  ws["!cols"] = [
    { wch: 25 }, // Query
    { wch: 18 }, // Status
    { wch: 30 }, // Redirect Type
    { wch: 70 }, // Final URL
    { wch: 12 }, // Time
    { wch: 40 }, // Notes
  ];

  // Header row style (xlsx-style not available, but xlsx supports basic bold via cell format)
  xlsx.utils.book_append_sheet(wb, ws, "Search Results");

  // Summary sheet
  const total = results.length;
  const summary = [
    { Metric: "Total Queries", Value: total },
    {
      Metric: "→ Redirected to Search Results",
      Value: results.filter((r) => r.redirectType.includes("Search")).length,
    },
    {
      Metric: "→ Redirected to Category",
      Value: results.filter((r) => r.redirectType.includes("Category") || r.redirectType.includes("Listing")).length,
    },
    {
      Metric: "❌ No Results",
      Value: results.filter((r) => r.status === "No Results").length,
    },
    {
      Metric: "⚠️ Errors",
      Value: results.filter((r) => r.status === "Error").length,
    },
  ];
  const ws2 = xlsx.utils.json_to_sheet(summary);
  ws2["!cols"] = [{ wch: 35 }, { wch: 10 }];
  xlsx.utils.book_append_sheet(wb, ws2, "Summary");

  xlsx.writeFile(wb, REPORT_FILE);
  console.log(`\n📊  Report saved to: ${REPORT_FILE}\n`);
}

// ── Test ──────────────────────────────────────────────────────────────────────

test.describe("Search Redirect & Result Tracker", () => {
  let queries = [];
  const results = [];

  // Load queries before all tests run
  test.beforeAll(async () => {
    queries = await loadQueries();
    console.log(`\n📄  Loaded ${queries.length} queries from: ${CSV_FILE}`);
    console.log(`🌐  Target: ${BASE_URL}\n`);
  });

  // Save report after all tests finish
  test.afterAll(async () => {
    saveReport(results);
    // Print console summary
    const total = results.length;
    console.log("─".repeat(60));
    console.log(`  Total   : ${total}`);
    console.log(`  Search  : ${results.filter((r) => r.redirectType.includes("Search")).length}`);
    console.log(`  Category: ${results.filter((r) => r.redirectType.includes("Category") || r.redirectType.includes("Listing")).length}`);
    console.log(`  0 Results: ${results.filter((r) => r.status === "No Results").length}`);
    console.log(`  Errors  : ${results.filter((r) => r.status === "Error").length}`);
    console.log("─".repeat(60));
  });

  // Dynamically create one test per query
  // We wrap them all in a single test to keep one browser session (faster).
  test("Search Redirect & Product Checker", async ({ page }) => {
    // Set a generous timeout for the whole test
    test.setTimeout(queries.length * 25000 + 30000);

    // Open site once
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      const tag = `[${String(i + 1).padStart(2, "0")}/${queries.length}]`;

      const result = {
        query,
        status: "",
        redirectType: "",
        finalUrl: "",
        timeMs: 0,
        notes: "",
      };

      console.log(`\n${tag} 🔎  "${query}"`);
      const t0 = Date.now();

      try {
        // ── Return to home for clean state ──────────────────────────
        await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.waitForTimeout(500);

        // ── Find search input (try icon click first) ─────────────────
        const iconSelectors = [
          ".search-icon",
          ".icon-search",
          'button[aria-label*="search" i]',
          '[data-testid="search-icon"]',
          ".header-search-icon",
          ".header__search",
          'a[href*="search"]',
        ];
        for (const sel of iconSelectors) {
          const icon = page.locator(sel).first();
          if (await icon.isVisible({ timeout: 800 }).catch(() => false)) {
            await icon.click();
            await page.waitForTimeout(500);
            break;
          }
        }

        const inputSelectors = [
          'input[type="search"]',
          'input[name="q"]',
          'input[name="search"]',
          'input[placeholder*="search" i]',
          'input[placeholder*="Search" i]',
          ".search-input",
          "#search",
          "#searchInput",
          "form[action*='search'] input[type='text']",
          ".header-search input",
          ".search-box input",
        ];

        let searchInput = null;
        for (const sel of inputSelectors) {
          const el = page.locator(sel).first();
          if (await el.isVisible({ timeout: 1200 }).catch(() => false)) {
            searchInput = el;
            break;
          }
        }

        if (!searchInput) {
          throw new Error("Search input not found");
        }

        // ── Type and submit ──────────────────────────────────────────
        await searchInput.click();
        await searchInput.fill("");
        await searchInput.type(query, { delay: 50 });
        await page.waitForTimeout(300);

        const urlBefore = page.url();
        await searchInput.press("Enter");

        // Wait for URL to change or network to settle
        await Promise.race([
          page.waitForURL((u) => u.toString() !== urlBefore, { timeout: 15000 }),
          page.waitForLoadState("networkidle", { timeout: 10000 }),
        ]).catch(() => {});

        await page.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(800);

        result.finalUrl = page.url();
        result.timeMs = Date.now() - t0;

        // ── Classify ─────────────────────────────────────────────────
        const noResult = await detectNoResults(page);

        if (noResult) {
          result.status = "No Results";
          result.redirectType = "No Results Page";
          result.notes = "Page showed 0 results / empty state";
          console.log(`       ❌  No results  →  ${result.finalUrl}`);
        } else {
          result.status = "Found";
          result.redirectType = classifyURL(result.finalUrl, query);
          result.notes = "";
          const icon =
            result.redirectType.includes("Search") ? "🔍" : "📂";
          console.log(`       ${icon}  ${result.redirectType}  →  ${result.finalUrl}`);
        }
      } catch (err) {
        result.status = "Error";
        result.redirectType = "Error";
        result.finalUrl = page.url();
        result.timeMs = Date.now() - t0;
        result.notes = err.message;
        console.log(`       ⚠️  Error: ${err.message}`);
      }

      results.push(result);

      // Brief pause between searches
      await page.waitForTimeout(400);
    }

    // Soft-assert so the test is marked as passing regardless of 0-result queries
    expect(results.length).toBe(queries.length);
  });
});