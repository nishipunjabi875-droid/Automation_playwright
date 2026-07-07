// search_redirect_test.spec.js  v6
// Fixes: timeout strategy, URL detection, selector caching, navigation stability

const { test, expect, chromium } = require("@playwright/test");
const fs   = require("fs");
const path = require("path");
const xlsx = require("xlsx");

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const CONFIG = {
  baseUrl: process.env.BASE_URL || "https://beta.teamwoodenstreet.com/",

  searchInputSelector: [
    'input[name="search"]',
    'input[name="q"]',
    'input[type="search"]',
    'input[placeholder*="Search" i]',
    'input[placeholder*="search" i]',
    '.search-input input',
    '.search-box input',
    '#search',
    'form input[type="text"]',
  ],

  searchSubmitSelector: [
    'button[type="submit"]',
    '.search-btn',
    '.search-icon',
    'button[aria-label*="search" i]',
    'form button',
  ],

  // FIX: More precise patterns for Woodenstreet
  // Search page:   URL contains ?search= or /search?
  // Category page: clean slug path, no query string, not homepage
  searchPagePattern:   /[?&](search|q|query|keyword)=|\/search[/?]/i,
  categoryPagePattern: /^\/[a-z0-9-]+(\/[a-z0-9-]+)*\/?$/i,

  productCardSelectors: [
    '.product-item',
    '.pro-item',
    '.product-box',
    '.prd-item',
    '[class*="product-item"]',
    '[class*="productItem"]',
    '[class*="product_item"]',
    '[class*="pro-item"]',
    '[class*="prd-item"]',
    '.product-card',
    '.product',
    '.item',
    'li[class*="product"]',
    'li[class*="item"]',
    '.grid-item',
    '[data-product-id]',
    '[data-id]',
    'article',
    '.search-result',
    '.result-item',
  ],

  productNameSelectors: [
    '.product-name', '.product-title', '.pro-name', '.prd-name',
    '[class*="product-name"]', '[class*="productName"]',
    'h2', 'h3', 'h4', '.name', '.title',
  ],

  popupCloseSelectors: [
    '[class*="close"]',
    '[class*="Close"]',
    '[aria-label="Close"]',
    '[aria-label="close"]',
    '.modal-close', '.popup-close', '.close-btn',
    'button:has-text("No thanks")',
    'button:has-text("Not now")',
    'button:has-text("Skip")',
    'button:has-text("Close")',
    'button:has-text("Accept")',
    'button:has-text("Got it")',
    'button:has-text("×")',
    'button:has-text("✕")',
  ],

  // FIX: Reduced from 13s — popup watcher now resets per-query so 6s is enough
  popupWatchDuration:  6000,
  popupCheckInterval:  700,

  // FIX: Use 'load' not 'networkidle' — e-commerce sites never reach networkidle
  // due to analytics, ads, chat widgets firing indefinitely
  waitUntil: "load",

  // Extra settle time after load (allows lazy-loaded product grids to paint)
  settleMs: 1800,

  inputFile:      process.env.INPUT_FILE || "./search.csv",
  outputDir:      "./results",
  screenshotsDir: "./results/screenshots",
  reportFile:     "./results/report.xlsx",
};
// ─────────────────────────────────────────────────────────────────────────────

// ─── COLOURS ─────────────────────────────────────────────────────────────────
const C = {
  reset:"\x1b[0m", bold:"\x1b[1m", dim:"\x1b[2m",
  green:"\x1b[32m", red:"\x1b[31m", yellow:"\x1b[33m",
  cyan:"\x1b[36m", blue:"\x1b[34m", magenta:"\x1b[35m", white:"\x1b[37m",
};
const clr   = (col, s) => `${col}${s}${C.reset}`;
const trunc = (s, n)   => String(s).length > n ? String(s).slice(0,n-1)+"…" : String(s);
// ─────────────────────────────────────────────────────────────────────────────

// ─── INPUT READER ────────────────────────────────────────────────────────────
function normalizeRow(row) {
  const lower = {};
  for (const [k,v] of Object.entries(row))
    lower[k.trim().toLowerCase().replace(/\s+/g,"_")] = String(v||"").trim();
  return {
    query:            lower.query || lower.search_query || lower.keyword || "",
    expected_type:   (lower.expected_type || lower.type || "any").toLowerCase(),
    expected_products: lower.expected_products || lower.products || "",
  };
}

function readXlsx(f) {
  const wb = xlsx.readFile(f);
  return xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]).map(normalizeRow).filter(r=>r.query);
}

function parseCsvSync(f) {
  const content = fs.readFileSync(f,"utf8").replace(/\r/g,"");
  const lines   = content.split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const parseRow = (line) => {
    const cols=[]; let cur="", inQ=false;
    for (const ch of line) {
      if (ch==='"') inQ=!inQ;
      else if (ch==="," && !inQ) { cols.push(cur.trim()); cur=""; }
      else cur+=ch;
    }
    cols.push(cur.trim());
    return cols;
  };
  const headers = parseRow(lines[0]);
  return lines.slice(1).map(line=>{
    const vals=parseRow(line), row={};
    headers.forEach((h,i)=>{ row[h]=vals[i]||""; });
    return normalizeRow(row);
  }).filter(r=>r.query);
}

function loadTestCasesSync() {
  const f   = CONFIG.inputFile;
  const ext = path.extname(f).toLowerCase();
  if (!fs.existsSync(f)) {
    console.error(`\n❌  Input file not found: ${path.resolve(f)}\n`);
    return [];
  }
  if (ext===".xlsx"||ext===".xls") return readXlsx(f);
  return parseCsvSync(f);
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── POPUP HANDLER ───────────────────────────────────────────────────────────
async function dismissPopups(page) {
  if (page.isClosed()) return;
  for (const sel of CONFIG.popupCloseSelectors) {
    try {
      const el = await page.$(sel);
      if (el && await el.isVisible()) {
        await el.click({timeout:800}).catch(()=>{});
        await page.waitForTimeout(150);
      }
    } catch {}
  }
}

function startPopupWatcher(page) {
  const deadline = Date.now() + CONFIG.popupWatchDuration;
  const tick = async () => {
    if (page.isClosed() || Date.now() >= deadline) return;
    await dismissPopups(page).catch(()=>{});
    setTimeout(tick, CONFIG.popupCheckInterval);
  };
  setTimeout(tick, CONFIG.popupCheckInterval);
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── PAGE TYPE DETECTOR ──────────────────────────────────────────────────────
// FIX: Rewritten — checks search pattern first, then validates category path
function detectPageType(urlStr) {
  let u;
  try { u = new URL(urlStr); } catch { return "unknown"; }

  // 1. Search page: has a query param
  if (CONFIG.searchPagePattern.test(urlStr)) return "search";

  // 2. Category page: non-root clean path with no query string
  const isCleanPath = u.pathname !== "/" && u.pathname !== "" && !u.search;
  if (isCleanPath && CONFIG.categoryPagePattern.test(u.pathname)) return "category";

  return "unknown";
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── WAIT FOR NAVIGATION ─────────────────────────────────────────────────────
// FIX: Replaces networkidle with a robust multi-stage wait
// 1. Wait for 'load' event (DOMContentLoaded + all resources)
// 2. Short extra settle for lazy-loaded product grids
async function waitForPageReady(page) {
  // 'load' is reliable on e-commerce; 'networkidle' often hangs due to ads/analytics
  await page.waitForLoadState("load", { timeout: 25000 })
    .catch(() => {}); // if it times out, continue anyway

  // Extra settle for lazy-rendered product grids
  await page.waitForTimeout(CONFIG.settleMs);
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── FIND SEARCH INPUT ────────────────────────────────────────────────────────
// FIX: Extracted as a reusable function, tries all selectors with proper waits
async function findSearchInput(page) {
  for (const sel of CONFIG.searchInputSelector) {
    try {
      const el = await page.waitForSelector(sel, { timeout: 3000, state: "visible" });
      if (el) return el;
    } catch {}
  }
  // Fallback: any visible text-like input
  for (const el of await page.$$("input")) {
    try {
      const t = await el.getAttribute("type") || "text";
      if (["hidden","email","password","checkbox","radio","submit","button"].includes(t)) continue;
      if (await el.isVisible()) return el;
    } catch {}
  }
  return null;
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── PRODUCT SELECTOR FINDER ─────────────────────────────────────────────────
// FIX: Caches working selector across queries to avoid per-query re-discovery
let _cachedProductSelector = null;

async function findBestSelector(page, selectorList) {
  // If we already found a working selector, verify it still works on this page
  if (_cachedProductSelector) {
    try {
      const count = await page.$$eval(_cachedProductSelector, els => els.length).catch(() => 0);
      if (count > 0) return { sel: _cachedProductSelector, count };
    } catch {}
    // Cached selector didn't work on this page type, fall through to re-discover
  }

  let best = { sel: "", count: 0 };
  for (const sel of selectorList) {
    try {
      const count = await page.$$eval(sel, els => els.length).catch(() => 0);
      if (count > best.count) best = { sel, count };
    } catch {}
  }

  // Auto-detect from DOM structure if nothing found
  if (best.count === 0) {
    const detected = await page.evaluate(() => {
      const containers = [
        'ul', 'ol', '.grid', '[class*="grid"]', '[class*="list"]',
        '[class*="products"]', '[class*="results"]', 'section', 'main',
      ];
      let best = { childSel: "", count: 0 };
      for (const cont of containers) {
        for (const c of document.querySelectorAll(cont)) {
          const children = Array.from(c.children);
          if (children.length < 2) continue;
          const firstClass = children[0].className.split(" ").filter(Boolean)[0];
          if (!firstClass) continue;
          const matching = children.filter(ch => ch.classList.contains(firstClass)).length;
          if (matching >= 2 && matching > best.count) {
            best = { childSel: "." + firstClass, count: matching };
          }
        }
      }
      return best;
    }).catch(() => ({ childSel: "", count: 0 }));

    if (detected.childSel && detected.count > 0) {
      best = { sel: detected.childSel, count: detected.count };
    }
  }

  if (best.count > 0) _cachedProductSelector = best.sel;
  return best;
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── CONSOLE PRINTERS ────────────────────────────────────────────────────────
function printHeader(total) {
  const L = "═".repeat(110), D = "─".repeat(110);
  console.log("\n" + L);
  console.log(clr(C.cyan+C.bold,
    `  🔍  SEARCH REDIRECT TESTER  v6   ${total} queries  ·  ${CONFIG.baseUrl}`));
  console.log(L);
  console.log(clr(C.dim,
    "  " +
    "#/Total".padEnd(10) +
    "Query".padEnd(28) +
    "Status".padEnd(12) +
    "Type".padEnd(14) +
    "Products".padEnd(11) +
    "URL"
  ));
  console.log(D);
}

function printRow(r, total) {
  const statusFmt = {
    PASS:  clr(C.green  +C.bold,"✅ PASS "),
    FAIL:  clr(C.red    +C.bold,"❌ FAIL "),
    WARN:  clr(C.yellow +C.bold,"⚠️  WARN "),
    ERROR: clr(C.magenta+C.bold,"💥 ERROR"),
  }[r.status] || r.status;

  const typeFmt = {
    category: clr(C.blue+C.bold, "📁 CATEGORY"),
    search:   clr(C.cyan+C.bold, "🔎 SEARCH  "),
    unknown:  clr(C.dim,          "❓ UNKNOWN "),
  }[r.actual_type] || r.actual_type;

  const prodFmt = r.actual_type !== "unknown"
    ? clr(C.white+C.bold, `${String(r.product_count).padStart(3)} items`)
    : clr(C.dim, "   —   ");

  console.log(
    `  ${clr(C.dim,"["+String(r.index).padStart(3)+"/"+total+"]")} `+
    `${clr(C.bold, trunc(r.query, 26).padEnd(26))}  `+
    `${statusFmt}  ${typeFmt}  ${prodFmt}  `+
    `${clr(C.dim, trunc(r.final_url, 50))}`
  );
  if (r.status !== "PASS")
    console.log(`${" ".repeat(12)}${clr(C.dim, "↳ " + r.notes)}`);
  if (r.missing_products && r.missing_products.length)
    console.log(`${" ".repeat(12)}${clr(C.red, "↳ Missing: " + r.missing_products.join(", "))}`);
}

function printSummary(results, wallMs) {
  const pass = results.filter(r=>r.status==="PASS").length;
  const fail = results.filter(r=>r.status==="FAIL").length;
  const warn = results.filter(r=>r.status==="WARN").length;
  const err  = results.filter(r=>r.status==="ERROR").length;
  const cat  = results.filter(r=>r.actual_type==="category").length;
  const srch = results.filter(r=>r.actual_type==="search").length;
  const unk  = results.filter(r=>r.actual_type==="unknown").length;
  const totalProd = results.reduce((s,r)=>s+(r.product_count||0),0);
  const avgMs = results.length ? Math.round(results.reduce((s,r)=>s+(r.duration_ms||0),0)/results.length) : 0;
  const L = "═".repeat(110), D = "─".repeat(110);
  console.log("\n" + L);
  console.log(clr(C.cyan+C.bold, "  FINAL SUMMARY"));
  console.log(D);
  console.log(
    `  ${clr(C.green  +C.bold,"✅ PASS")}  ${String(pass).padEnd(6)}`+
    `  ${clr(C.red    +C.bold,"❌ FAIL")}  ${String(fail).padEnd(6)}`+
    `  ${clr(C.yellow +C.bold,"⚠️  WARN")}  ${String(warn).padEnd(6)}`+
    `  ${clr(C.magenta+C.bold,"💥 ERROR")} ${err}`
  );
  console.log(D);
  console.log(
    `  ${clr(C.blue+C.bold,"📁 Category")}  ${String(cat).padEnd(8)}`+
    `  ${clr(C.cyan+C.bold,"🔎 Search")}    ${String(srch).padEnd(8)}`+
    `  ${clr(C.dim,"❓ Unknown")}   ${unk}`
  );
  console.log(D);
  console.log(`  Total products found  : ${clr(C.bold, String(totalProd))}`);
  console.log(`  Avg time / query      : ${clr(C.bold, avgMs + " ms")}`);
  console.log(`  Wall-clock time       : ${clr(C.bold, (wallMs/1000).toFixed(1) + " s")}`);
  console.log(`  Report saved to       : ${clr(C.bold, CONFIG.reportFile)}`);
  console.log(L + "\n");
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── REPORT WRITER ───────────────────────────────────────────────────────────
function writeReport(results) {
  fs.mkdirSync(CONFIG.outputDir, {recursive:true});
  const wb   = xlsx.utils.book_new();
  const pass = results.filter(r=>r.status==="PASS").length;
  const fail = results.filter(r=>r.status==="FAIL").length;
  const warn = results.filter(r=>r.status==="WARN").length;
  const err  = results.filter(r=>r.status==="ERROR").length;
  const cat  = results.filter(r=>r.actual_type==="category").length;
  const srch = results.filter(r=>r.actual_type==="search").length;
  const unk  = results.filter(r=>r.actual_type==="unknown").length;
  const totalProd = results.reduce((s,r)=>s+(r.product_count||0),0);
  const avgMs = results.length ? Math.round(results.reduce((s,r)=>s+(r.duration_ms||0),0)/results.length) : 0;

  const ss = xlsx.utils.aoa_to_sheet([
    ["Search Redirect Test — Summary", ""],
    ["Run Date",   new Date().toLocaleString()],
    ["Base URL",   CONFIG.baseUrl],
    ["Input File", CONFIG.inputFile],
    ["", ""],
    ["Total Queries", results.length],
    ["✅ PASS", pass], ["❌ FAIL", fail], ["⚠️ WARN", warn], ["💥 ERROR", err],
    ["", ""],
    ["📁 Category Redirects", cat],
    ["🔎 Search Redirects",   srch],
    ["❓ Unknown",             unk],
    ["", ""],
    ["Total Products Found",    totalProd],
    ["Avg Time per Query (ms)", avgMs],
  ]);
  ss["!cols"] = [{wch:36},{wch:24}];
  xlsx.utils.book_append_sheet(wb, ss, "Summary");

  const headers = [
    "#","Query","Expected Type","Actual Type","Status",
    "Product Count","Expected Products","Products Present?",
    "Missing Products","Products Found (first 5)",
    "Final URL","Page Title","Duration (ms)","Notes","Screenshot",
  ];
  const rows = results.map(r => [
    r.index, r.query, r.expected_type, r.actual_type, r.status,
    r.product_count, r.expected_products, r.expected_products_present,
    (r.missing_products||[]).join(", "),
    (r.products_found||[]).slice(0,5).join(" | "),
    r.final_url, r.page_title, r.duration_ms, r.notes, r.screenshot,
  ]);
  const ds = xlsx.utils.aoa_to_sheet([headers, ...rows]);
  ds["!cols"] = [
    {wch:5},{wch:26},{wch:14},{wch:12},{wch:8},{wch:14},{wch:30},
    {wch:18},{wch:30},{wch:50},{wch:55},{wch:30},{wch:13},{wch:45},{wch:32},
  ];
  xlsx.utils.book_append_sheet(wb, ds, "All Results");

  const issues = results.filter(r => ["FAIL","WARN","ERROR"].includes(r.status));
  if (issues.length) {
    const is = xlsx.utils.aoa_to_sheet([
      ["#","Query","Expected","Actual","Status","Product Count","Expected Products","Missing","URL","Notes"],
      ...issues.map(r => [
        r.index, r.query, r.expected_type, r.actual_type, r.status,
        r.product_count, r.expected_products,
        (r.missing_products||[]).join(", "), r.final_url, r.notes,
      ]),
    ]);
    is["!cols"] = [
      {wch:5},{wch:26},{wch:12},{wch:12},{wch:8},{wch:13},{wch:30},{wch:30},{wch:50},{wch:45},
    ];
    xlsx.utils.book_append_sheet(wb, is, "Issues");
  }
  xlsx.writeFile(wb, CONFIG.reportFile);
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── MAIN TEST ───────────────────────────────────────────────────────────────
test("Search Redirect & Product Checker", async () => {

  fs.mkdirSync(CONFIG.outputDir,      {recursive:true});
  fs.mkdirSync(CONFIG.screenshotsDir, {recursive:true});

  const testCases = loadTestCasesSync();
  if (!testCases.length) throw new Error("No test cases loaded — check your input file");

  printHeader(testCases.length);

  const browser = await chromium.launch({
    headless: false,
    slowMo:   100,
    args: ["--start-maximized"],
  });
  const context = await browser.newContext({
    viewport: null,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  // FIX: Separate timeouts — navigation gets 30s, selectors get 8s
  page.setDefaultNavigationTimeout(30000);
  page.setDefaultTimeout(8000);

  const results   = [];
  const wallStart = Date.now();

  // ── Initial load ──────────────────────────────────────────────────────────
  await page.goto(CONFIG.baseUrl, { waitUntil: CONFIG.waitUntil, timeout: 30000 });
  await dismissPopups(page);
  await page.waitForTimeout(1000);

  // ── Run each query ────────────────────────────────────────────────────────
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const result = {
      index: i+1, query: tc.query,
      expected_type: tc.expected_type, expected_products: tc.expected_products,
      actual_type: "", final_url: "", page_title: "",
      products_found: [], product_count: 0,
      expected_products_present: "", missing_products: [],
      status: "PASS", notes: [], screenshot: "", duration_ms: 0,
    };
    const t0 = Date.now();

    try {
      // FIX: Navigate to homepage once per query, but use 'load' not 'networkidle'
      await page.goto(CONFIG.baseUrl, { waitUntil: CONFIG.waitUntil, timeout: 30000 });
      await dismissPopups(page);

      // FIX: Use robust findSearchInput helper instead of inline selector loop
      const searchInput = await findSearchInput(page);
      if (!searchInput) throw new Error("Search input not found on homepage");

      // FIX: Use fill() then type() together — fill() clears reliably, type() mimics keystrokes
      await searchInput.click({ timeout: 5000 });
      await searchInput.fill("");
      await page.waitForTimeout(150);
      await searchInput.type(tc.query, { delay: 50 });
      await page.waitForTimeout(350);

      // Submit
      let submitted = false;
      for (const sel of CONFIG.searchSubmitSelector) {
        try {
          const btn = await page.$(sel);
          if (btn && await btn.isVisible()) {
            await btn.click({ timeout: 3000 });
            submitted = true;
            break;
          }
        } catch {}
      }
      if (!submitted) {
        await searchInput.press("Enter");
      }

      // FIX: Wait for navigation to START (URL to change) before waiting for load
      // This prevents the watcher from firing on the old homepage
      await page.waitForNavigation({
        waitUntil: CONFIG.waitUntil,
        timeout: 25000,
      }).catch(() => {}); // if already navigated, that's fine

      // Extra settle for lazy product grids
      await page.waitForTimeout(CONFIG.settleMs);

      // Start popup watcher (non-blocking, short-lived)
      startPopupWatcher(page);

      result.final_url  = page.url();
      result.page_title = await page.title();
      result.actual_type = detectPageType(result.final_url);

      // Debug log if page type is unknown — helps diagnose URL pattern mismatches
      if (result.actual_type === "unknown") {
        console.log(clr(C.yellow, `  [DEBUG] Unknown URL: ${result.final_url}`));
      }

      // ── Count products ────────────────────────────────────────────────────
      const selectorList = result.actual_type === "search"
        ? CONFIG.productCardSelectors
        : CONFIG.productCardSelectors; // same list — works for both page types

      const best = await findBestSelector(page, selectorList);
      result.product_count = best.count;

      // Collect product names (first 20)
      if (best.count > 0 && best.sel) {
        const els = await page.$$(best.sel);
        for (const el of els.slice(0,20)) {
          try {
            let name = "";
            for (const nsel of CONFIG.productNameSelectors) {
              const nel = await el.$(nsel);
              if (nel) { name = (await nel.textContent()).trim(); if (name) break; }
            }
            if (!name) {
              name = (await el.textContent()).trim().split("\n").find(l => l.trim()) || "";
            }
            if (name) result.products_found.push(name.substring(0, 80));
          } catch {}
        }
      }

      // ── Status logic ──────────────────────────────────────────────────────
      if (result.actual_type === "search" || result.actual_type === "category") {
        if (result.product_count === 0) {
          result.status = "FAIL";
          result.notes.push(`No products found on ${result.actual_type} page`);
        }
      } else {
        result.status = "WARN";
        result.notes.push(
          `Page type unknown — URL did not match search or category patterns.\n` +
          `  URL: ${result.final_url}\n` +
          `  Check CONFIG.searchPagePattern / categoryPagePattern`
        );
      }

      // ── Expected product check ────────────────────────────────────────────
      if (tc.expected_products && result.product_count > 0) {
        const keywords  = tc.expected_products.split(",").map(k=>k.trim().toLowerCase()).filter(Boolean);
        const foundLower = result.products_found.map(p=>p.toLowerCase());
        const missing   = keywords.filter(kw => !foundLower.some(p=>p.includes(kw)));
        result.missing_products          = missing;
        result.expected_products_present = missing.length === 0 ? "YES" : "PARTIAL/NO";
        if (missing.length && result.status !== "FAIL") {
          result.status = "WARN";
          result.notes.push(`Missing expected: ${missing.join(", ")}`);
        }
      } else {
        result.expected_products_present = tc.expected_products
          ? "N/A (0 products)"
          : "N/A (not specified)";
      }

      // Screenshot
      const sName = `${String(i+1).padStart(3,"0")}_${tc.query.replace(/[^a-z0-9]/gi,"_").substring(0,40)}.png`;
      await page.screenshot({ path: path.join(CONFIG.screenshotsDir, sName), fullPage: false });
      result.screenshot = sName;

    } catch (err) {
      result.status = "ERROR";
      result.notes.push("Error: " + err.message.split("\n")[0].substring(0, 120));
      try {
        const sn = `error_${i+1}.png`;
        if (!page.isClosed())
          await page.screenshot({ path: path.join(CONFIG.screenshotsDir, sn), fullPage: false });
        result.screenshot = sn;
      } catch {}
    }

    result.duration_ms = Date.now() - t0;
    if (!result.notes.length) result.notes.push("All checks passed");
    result.notes = result.notes.join(" | ");
    results.push(result);
    printRow(result, testCases.length);

    // Hard assertion — only on pages we could detect
    if (result.actual_type === "search" || result.actual_type === "category") {
      expect(
        result.product_count,
        `"${tc.query}" → ${result.actual_type} page has 0 products\nURL: ${result.final_url}`
      ).toBeGreaterThan(0);
    }
  }

  await browser.close();
  writeReport(results);
  printSummary(results, Date.now() - wallStart);
});