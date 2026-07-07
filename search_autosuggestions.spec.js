/**
 * WoodenStreet Auto-Suggestion Comparison Script (JavaScript)
 * ============================================================
 * Compares search auto-suggestions between:
 *   - beta.teamwoodenstreet.com  (BETA site)
 *   - www.woodenstreet.com       (LIVE site)
 *
 * Requirements:
 *   npm install playwright exceljs
 *   npx playwright install chromium
 *
 * Usage:
 *   node woodenstreet_autosuggestion_scraper.js
 *
 * Output:
 *   woodenstreet_autosuggestion_results.xlsx
 */

const { chromium } = require('playwright');
const ExcelJS = require('exceljs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION — edit these if the search selectors change
// ─────────────────────────────────────────────────────────────────────────────
const CONFIG = {
 // BETA_URL: 'https://beta.teamwoodenstreet.com/',
  LIVE_URL: 'https://www.woodenstreet.com',

  // CSS selectors to try for the search input (first match wins)
  SEARCH_INPUT_SELECTORS: [
    "input[type='search']",
    "input[placeholder*='Search']",
    "input[placeholder*='search']",
    "input[name='q']",
    "input[name='search']",
    'input.search-input',
    'input#search',
    '.search-bar input',
    '.header-search input',
    "[data-testid='search-input']",
  ],

  // CSS selectors to try for suggestion dropdown items (first match with results wins)
  SUGGESTION_SELECTORS: [
    '.search-container ul li',
    'ul.search-list li',
    '.search-suggestions li',
    '.autocomplete-suggestions .item',
    '.suggestions-list li',
    '.search-dropdown li',
    "[class*='suggestion'] li",
    "[class*='autocomplete'] li",
    "[class*='dropdown'] li",
    'ul.search-results li',
    '.typeahead li',
    "[role='option']",
    "[role='listbox'] li",
  ],

  MAX_SUGGESTIONS: 5, // max suggestions to capture per keyword
  TYPING_DELAY_MS: 40, // MODERATE: safer typing speed
  WAIT_AFTER_TYPE: 1000, // MODERATE: safer wait
  PAGE_LOAD_WAIT: 6000, // Wait for initial pop-ups
  BETWEEN_KW_DELAY: 800, // MODERATE: delay between keywords
  CONCURRENCY: 1, // REDUCED: 1 worker per site to avoid rate limits
  HEADLESS: false, // set false to watch the browser in real time

  // CSS selectors for the actual search results page
  RESULTS_PAGE: {
    COUNT_SELECTORS: [
      '.showing-count',
      '[class*="showing-products"]',
      '.search-count',
      '#product-count',
      'text=/showing|results|products/i',
    ],
    PRODUCT_NAME_SELECTORS: [
      '.productcard .text-secondary p',
      '.productcard h3',
      '.product-name',
      '[class*="product-title"]',
      'a.text-secondary h3',
      '.item-name',
    ],
  },

  // Email Configuration
  EMAIL: {
    ENABLED: true,
    RECIPIENTS: [
      'daksh.jain@woodenstreet.com',
      'nishi.punjabi@woodenstreet.com',
    ],
    SUBJECT: `WoodenStreet Auto-Suggestion Report - ${new Date().toLocaleDateString('en-IN')}`,
    HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    PORT: process.env.SMTP_PORT || 465,
    SECURE: true,
    USER: process.env.SMTP_USER,
    PASS: process.env.SMTP_PASS,
  },
};

// Global progress tracking for parallel sites
let GLOBAL_STATS = { done: 0, total: 0 };

// ─────────────────────────────────────────────────────────────────────────────
// KEYWORDS
// ─────────────────────────────────────────────────────────────────────────────
const KEYWORDS_DATA = {
  'Living Room Furniture': [
    'Sofa set',
    '3 seater sofa',
    '2 seater sofa',
    'L-shaped sofa',
    'Fabric sofa',
    'Leatherette sofa',
    'Wooden sofa',
    'Sofa cum bed',
    'Corner sofa',
    'Sectional sofa',
    'Recliner sofa',
    'Chesterfield sofa',
    'Loveseat sofa',
    'Sofa set with price',
    'Modern sofa set',
    'Coffee table',
    'Wooden coffee table',
    'Centre table',
    'Nesting tables',
    'Side table',
    'End table',
    'Console table',
    'TV unit',
    'TV cabinet',
    'Wall-mounted TV unit',
    'Entertainment unit',
    'TV stand',
    'Media console',
    'Bookshelf',
    'Bookcase',
    'Display shelf',
    'Wall shelf',
    'Floating shelf',
    'Open bookshelf',
    'Room divider',
    'Lounge chair',
    'Accent chair',
    'Armchair',
    'Recliner chair',
    'Wing chair',
    'Chaise lounge',
    'Ottoman',
    'Pouf',
    'Bean bag',
    'Footstool',
    'Floor lamp',
    'Table lamp',
    'Wall art',
    'Wall painting',
    'Canvas painting',
    'Abstract wall art',
    'Wall mirror',
    'Decorative mirror',
    'Artificial plants',
    'Vase',
    'Photo frame',
    'Cushion cover',
    'Throw pillow',
    'Area rug',
    'Carpet',
    'Curtain',
    'Blinds',
    'Room decor',
    'Living room decor',
    'Living room furniture set',
    'Sheesham wood sofa',
    'Mango wood coffee table',
    'Walnut finish furniture',
    'Teak finish sofa',
    'Natural finish furniture',
    'Custom sofa',
    'Upholstered sofa',
    '5 seater sofa',
    '6 seater sofa set',
    'Sofa with storage',
  ],
  'Bedroom Furniture': [
    'Double bed',
    'King size bed',
    'Queen size bed',
    'Single bed',
    'Bed with storage',
    'Hydraulic bed',
    'Box storage bed',
    'Platform bed',
    'Poster bed',
    'Canopy bed',
    'Wooden bed',
    'Sheesham wood bed',
    'Upholstered bed',
    'Bed with headboard',
    'Bunk bed',
    'Trundle bed',
    'Bed frame',
    'Bed without storage',
    'Wardrobe',
    '2 door wardrobe',
    '3 door wardrobe',
    '4 door wardrobe',
    'Sliding door wardrobe',
    'Hinged wardrobe',
    'Wardrobe with mirror',
    'Wardrobe with dressing table',
    'Walk-in wardrobe',
    'Wooden wardrobe',
    'Bedside table',
    'Nightstand',
    'Bedside cabinet',
    'Chest of drawers',
    'Dresser',
    'Dressing table',
    'Dressing table with mirror',
    'Dressing table with stool',
    'Vanity table',
    'Chest of drawers with mirror',
    'Mattress',
    'Foam mattress',
    'Spring mattress',
    'Memory foam mattress',
    'Orthopedic mattress',
    'King size mattress',
    'Queen size mattress',
    'Single size mattress',
    'Pillow',
    'Bolster pillow',
    'Bed runner',
    'Bed sheet',
    'Comforter',
    'Duvet',
    'Blanket',
    'Bedroom set',
    'Bedroom furniture set',
    'Master bedroom furniture',
    'Bedroom decor',
    'Bedside lamp',
    'Bedroom wardrobe combo',
    'Walnut bedroom set',
    'White bedroom furniture',
    'Grey wardrobe',
    'Engineered wood bed',
    'Solid wood bed',
    'Bed with side tables',
    'Bedroom storage unit',
    'Under-bed storage',
    'Bed with drawers',
    'Panel bed',
    'Sleigh bed',
    'Storage ottoman for bedroom',
    'Bedroom mirror',
    'Full-length mirror',
    'Leaning mirror',
    'Dressing mirror',
    'Jewellery cabinet',
    'Shoe rack',
    'Shoe cabinet',
    'Entryway cabinet',
    'Hall cabinet',
  ],
  'Dining Room Furniture': [
    'Dining table',
    'Dining set',
    '4 seater dining set',
    '6 seater dining set',
    '8 seater dining set',
    '10 seater dining set',
    'Round dining table',
    'Rectangular dining table',
    'Extendable dining table',
    'Glass top dining table',
    'Marble top dining table',
    'Wooden dining table',
    'Sheesham wood dining table',
    'Dining chair',
    'Dining bench',
    'Dining table with chairs',
    'Dining table with bench',
    'Upholstered dining chair',
    'Cane dining chair',
    'Metal dining chair',
    'Kitchen table',
    'Bar table',
    'Bar stool',
    'High stool',
    'Counter stool',
    'Kitchen cart',
    'Kitchen island',
    'Buffet table',
    'Crockery unit',
    'Sideboard',
    'Dining room cabinet',
    'Bar cabinet',
    'Wine rack',
    'Bar unit',
    'Mini bar',
    'shoe',
    'Home bar furniture',
    'Serving trolley',
    'Buffet cabinet',
    'Hutch cabinet',
    'Dining room decor',
    'Table runner',
    'Placemats',
    'Dining storage',
    'Kitchen shelves',
    'Kitchen furniture',
  ],
  'Study & Office Furniture': [
    'Study table',
    'Computer table',
    'Laptop table',
    'Writing desk',
    'Home office desk',
    'Office table',
    'Executive desk',
    'Corner desk',
    'L-shaped desk',
    'Standing desk',
    'Foldable study table',
    'Wall-mounted study table',
    'Study table with shelves',
    'Study table with drawer',
    'Kids study table',
    'Study chair',
    'Office chair',
    'Ergonomic chair',
    'Executive chair',
    'Task chair',
    'Mesh chair',
    'Revolving chair',
    'Computer chair',
    'Visitor chair',
    'Conference chair',
    'Office sofa',
    'Office cabinet',
    'File cabinet',
    'Pedestal cabinet',
    'Storage cabinet',
    'Bookshelf for office',
    'Office bookcase',
    'Office furniture set',
    'Home office furniture',
    'Work from home furniture',
    'Office desk with storage',
    'Office workstation',
    'Reception desk',
    'Conference table',
    'Meeting table',
    'Office storage unit',
    'CPU stand',
    'Monitor stand',
    'Keyboard tray',
    'Study room furniture',
    'Study room decor',
    'Whiteboard',
    'Pinboard',
    'Office accessories',
    'Desk organizer',
  ],
  'Kids Room Furniture': [
    'Kids bed',
    'Kids single bed',
    'Kids bunk bed',
    'Kids trundle bed',
    'Kids bed with storage',
    'Kids bed with slide',
    'Kids loft bed',
    'Kids study table',
    'Kids chair',
    'Kids wardrobe',
    'Kids bookshelf',
    'Kids room furniture',
    'Kids room decor',
    'Kids cabinet',
    'Toy storage',
    'Kids toy box',
    'Kids bean bag',
    'Kids sofa',
    'Kids rocking chair',
    'Cradle',
    'Baby cot',
    'Baby bed',
    'Baby furniture',
    'Toddler bed',
    'Kids dresser',
    'Kids chest of drawers',
    'Kids room set',
    'Play table',
    'Activity table',
    'Kids desk',
    'Kids room shelf',
    'Tree-shaped bookshelf',
    'Kids storage unit',
    'Colorful kids furniture',
    'Bunk bed with desk',
    'Kids tent bed',
    'House-shaped bed',
    'Kids bedside table',
    'School furniture',
    'Kids outdoor furniture',
  ],
  'Outdoor & Garden Furniture': [
    'Outdoor furniture',
    'Garden furniture',
    'Patio furniture',
    'Balcony furniture',
    'Outdoor sofa set',
    'Garden sofa',
    'Outdoor dining set',
    'Patio dining table',
    'Garden bench',
    'Outdoor bench',
    'Swing chair',
    'Hammock chair',
    'Garden chair',
    'Folding chair',
    'Deck chair',
    'Sun lounger',
    'Outdoor coffee table',
    'Garden table',
    'Planter stand',
    'Plant stand',
    'Flower pot stand',
    'Outdoor storage box',
    'Garden storage',
    'Umbrella stand',
    'Parasol',
    'Outdoor rug',
    'Garden decor',
    'Balcony decor',
    'Terrace furniture',
    'Pool furniture',
  ],
  'Commercial & Specialty Furniture': [
    'Hotel furniture',
    'Restaurant furniture',
    'Cafe furniture',
    'Office furniture',
    'Banquet furniture',
    'Resort furniture',
    'Hospitality furniture',
    'Lobby furniture',
    'Reception furniture',
    'Waiting room furniture',
    'School furniture',
    'Library furniture',
    'Clinic furniture',
    'Salon furniture',
    'Retail furniture',
    'Commercial sofa',
    'Commercial dining table',
    'Commercial bar stool',
    'Bulk furniture order',
    'Custom furniture for business',
    'Modular office furniture',
    'Workstation furniture',
    'Cubicle furniture',
    'Collaborative furniture',
    'Acoustic furniture',
  ],
  'Home Decor': [
    'Home decor',
    'Wall decor',
    'Wall art',
    'Canvas art',
    'Framed art',
    'Abstract painting',
    'Landscape painting',
    'Metal wall art',
    '3D wall art',
    'Wall clock',
    'Decorative clock',
    'Photo frame',
    'Collage frame',
    'Mirror',
    'Sunburst mirror',
    'Round mirror',
    'Oval mirror',
    'Arched mirror',
    'Statement mirror',
    'Decorative vase',
    'Ceramic vase',
    'Glass vase',
    'Flower vase set',
    'Artificial flowers',
    'Artificial plants',
    'Succulent plants',
    'Bonsai plant decor',
    'Potpourri',
    'Candle holder',
    'Tealight holder',
    'Showpiece',
    'Figurines',
    'Sculpture decor',
    'Decorative bowl',
    'Tray set',
    'Table runner',
    'Cushion',
    'Throw blanket',
    'Jute decor',
    'Macrame decor',
  ],
  'Materials, Finishes & Customization': [
    'Sheesham wood furniture',
    'Mango wood furniture',
    'Teak wood furniture',
    'Acacia wood furniture',
    'Rosewood furniture',
    'Pine wood furniture',
    'Engineered wood furniture',
    'Solid wood furniture',
    'MDF furniture',
    'Plywood furniture',
    'Metal and wood furniture',
    'Glass and wood furniture',
    'Walnut finish',
    'Natural finish',
    'Teak finish',
    'Mahogany finish',
    'White finish furniture',
    'Grey finish furniture',
    'Black furniture',
    'Painted furniture',
    'Custom furniture',
    'Made-to-order furniture',
    'Customized sofa',
    'Customized bed',
    'Customized wardrobe',
    'Customized dining table',
    'Bespoke furniture',
    'Handcrafted furniture',
    'Hand-carved furniture',
    'Jodhpur furniture',
  ],
  'Price, Deals & Offers': [
    'Furniture under 5000',
    'Furniture under 10000',
    'Furniture under 20000',
    'Cheap furniture online',
    'Affordable furniture',
    'Budget furniture',
    'Discount furniture',
    'Furniture sale',
    'Furniture offers',
    'Festival furniture sale',
    'Diwali furniture sale',
    'EMI furniture',
    'No-cost EMI furniture',
    'Free shipping furniture',
    'Free installation furniture',
    'Furniture clearance sale',
    'Best price furniture',
    'Furniture cashback offer',
    'New arrival furniture',
    'Flash sale furniture',
  ],
  'Storage & Organization': [
    'Storage unit',
    'Storage cabinet',
    'Storage box',
    'Storage bench',
    'Storage ottoman',
    'Cabinet with drawers',
    'Multi-utility cabinet',
    'Sideboard with storage',
    'Hallway storage',
    'Entryway storage',
    'Shoe storage',
    'Shoe rack',
    'Shoe cabinet',
    'Coat rack',
    'Umbrella stand',
    'Kitchen storage',
    'Pantry cabinet',
    'Modular storage',
    'Wall-mounted storage',
    'Under-stair storage',
    'Floating storage shelf',
    'Cube storage',
    'Basket storage',
    'Laundry storage',
    'Bathroom storage',
  ],
  'Long-Tail & Specific Keywords': [
    'Buy sofa online India',
    'Buy bed online India',
    'Buy wardrobe online India',
    'Buy dining table online India',
    'Buy study table online India',
    'Online furniture store India',
    'Wooden furniture online',
    'Best furniture brand India',
    'Furniture delivery Jaipur',
    'Furniture delivery Delhi',
    'Furniture delivery Mumbai',
    'Furniture delivery Bangalore',
    'Furniture delivery Hyderabad',
    'Furniture delivery Pune',
    'Furniture delivery Chennai',
    'Furniture for new home',
    'Home makeover furniture',
    'Interior design furniture',
    'Modern Indian furniture',
    'Contemporary wooden furniture',
    'Traditional furniture',
    'Minimalist furniture',
    'Scandinavian furniture India',
    'Industrial style furniture',
    'Bohemian furniture',
    'Royal furniture',
    'Luxury furniture India',
    'Premium wooden furniture',
    'Eco-friendly furniture',
    'Sustainable furniture',
    'Furniture for small home',
    'Space-saving furniture',
    'Multipurpose furniture',
    'Foldable furniture',
    'Modular furniture',
    'Furniture assembly service',
    'Furniture with warranty',
    '1 year warranty furniture',
    'Furniture review India',
    'Best wooden furniture brand India',
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLING CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const CAT_COLORS = {
  'Living Room Furniture': { hdr: '1565C0', row: 'E3F2FD' },
  'Bedroom Furniture': { hdr: 'E65100', row: 'FFF3E0' },
  'Dining Room Furniture': { hdr: '2E7D32', row: 'E8F5E9' },
  'Study & Office Furniture': { hdr: '6A1B9A', row: 'F3E5F5' },
  'Kids Room Furniture': { hdr: 'F57F17', row: 'FFFDE7' },
  'Outdoor & Garden Furniture': { hdr: '00695C', row: 'E0F2F1' },
  'Commercial & Specialty Furniture': { hdr: '880E4F', row: 'FCE4EC' },
  'Home Decor': { hdr: '283593', row: 'E8EAF6' },
  'Materials, Finishes & Customization': { hdr: '33691E', row: 'F1F8E9' },
  'Price, Deals & Offers': { hdr: 'BF360C', row: 'FBE9E7' },
  'Storage & Organization': { hdr: '006064', row: 'E0F7FA' },
  'Long-Tail & Specific Keywords': { hdr: '4A148C', row: 'F9FBE7' },
};

const PRIORITY_MAP = {
  'Living Room Furniture': 'High',
  'Bedroom Furniture': 'High',
  'Dining Room Furniture': 'High',
  'Study & Office Furniture': 'Medium',
  'Kids Room Furniture': 'Medium',
  'Outdoor & Garden Furniture': 'Medium',
  'Commercial & Specialty Furniture': 'Low',
  'Home Decor': 'High',
  'Materials, Finishes & Customization': 'Medium',
  'Price, Deals & Offers': 'High',
  'Storage & Organization': 'Medium',
  'Long-Tail & Specific Keywords': 'High',
};

const PRI_STYLE = {
  High: { fg: '006400', bg: 'E8F5E9' },
  Medium: { fg: '7B3F00', bg: 'FFF8E1' },
  Low: { fg: '8B0000', bg: 'FFEBEE' },
};

const STATUS_STYLE = {
  Match: { bg: 'C8E6C9', fg: '1B5E20' },
  Partial: { bg: 'FFF9C4', fg: '7B3F00' },
  Mismatch: { bg: 'FFCDD2', fg: 'B71C1C' },
  Missing: { bg: 'FFE0B2', fg: 'BF360C' },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function argbHex(hex) {
  // ExcelJS uses ARGB format e.g. 'FF1565C0'
  return 'FF' + hex.replace('#', '');
}

function thinBorder() {
  const s = { style: 'thin', color: { argb: 'FFCCCCCC' } };
  return { top: s, bottom: s, left: s, right: s };
}

function applyHdrStyle(
  cell,
  bgHex,
  fgHex = 'FFFFFF',
  fontSize = 10,
  bold = true,
  wrapText = false
) {
  cell.font = {
    name: 'Arial',
    bold,
    size: fontSize,
    color: { argb: argbHex(fgHex) },
  };
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: argbHex(bgHex) },
  };
  cell.border = thinBorder();
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText };
}

function applyDataStyle(cell, bgHex, fgHex = '222222', opts = {}) {
  const { fontSize = 10, bold = false, center = false, wrap = false } = opts;
  cell.font = {
    name: 'Arial',
    size: fontSize,
    color: { argb: argbHex(fgHex) },
    bold,
  };
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: argbHex(bgHex) },
  };
  cell.border = thinBorder();
  cell.alignment = {
    horizontal: center ? 'center' : 'left',
    vertical: 'middle',
    wrapText: wrap,
    indent: center ? 0 : 1,
  };
}

function computeStatus(betaSuggs, liveSuggs) {
  const invalid = new Set(['NO_SUGGESTIONS', 'INPUT_NOT_FOUND', 'NOT_SCRAPED']);
  const betaSet = new Set(
    betaSuggs
      .filter((s) => !invalid.has(s) && !s.startsWith('ERROR'))
      .map((s) => s.toLowerCase().trim())
  );
  const liveSet = new Set(
    liveSuggs
      .filter((s) => !invalid.has(s) && !s.startsWith('ERROR'))
      .map((s) => s.toLowerCase().trim())
  );

  if (!betaSet.size && !liveSet.size) return '🔴 Missing (both)';
  if (!betaSet.size) return '🔴 Missing (beta)';
  if (!liveSet.size) return '🔴 Missing (live)';

  const overlap = [...betaSet].filter((s) => liveSet.has(s));
  if (overlap.length === betaSet.size && overlap.length === liveSet.size)
    return '✅ Match';
  if (overlap.length > 0) return '⚠️ Partial';
  return '❌ Mismatch';
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRAPER
// ─────────────────────────────────────────────────────────────────────────────
async function findSearchInput(page) {
  for (const sel of CONFIG.SEARCH_INPUT_SELECTORS) {
    try {
      const el = await page.waitForSelector(sel, { timeout: 3000 });
      if (el && (await el.isVisible())) return { el, sel };
    } catch (_) {
      /* try next */
    }
  }
  return { el: null, sel: null };
}

async function collectSuggestions(page) {
  const combinedSelector = CONFIG.SUGGESTION_SELECTORS.join(', ');
  try {
    // Wait for at least one suggestion selector to appear
    await page.waitForSelector(combinedSelector, {
      state: 'attached',
      timeout: 4000,
    });
    await sleep(300); // Tiny buffer for animation/rendering
  } catch (_) {
    // If no suggestions appear in 4s, proceed (might be no results)
  }

  for (const sel of CONFIG.SUGGESTION_SELECTORS) {
    try {
      const items = await page.$$(sel);
      const texts = [];
      for (const item of items.slice(0, CONFIG.MAX_SUGGESTIONS)) {
        const t = (await item.innerText()).trim();
        if (t) texts.push(t);
      }
      if (texts.length) return { texts, sel };
    } catch (_) {
      /* try next */
    }
  }
  return { texts: [], sel: null };
}

async function handlePopups(page) {
  try {
    // 1. Handle Login Pop-up (Esc or Close button)
    await sleep(2000);
    await page.keyboard.press('Escape');

    // 2. Look for common close buttons for modals
    const closeSelectors = [
      '.login-signup .close-login',
      '#login-signup-modal .close',
      '.popup-close',
      '.newsletter-close',
      "button:has-text('Maybe Later')",
      "span:has-text('Skip')",
    ];
    for (const sel of closeSelectors) {
      const closeBtn = page.locator(sel).first();
      if (await closeBtn.isVisible()) {
        console.log(`  [Pop-up] Closing modal with selector: ${sel}`);
        await closeBtn.click().catch(() => {});
        await sleep(500);
      }
    }
  } catch (_) {}
}

async function scrapeSite(browser, baseUrl, keywordsData) {
  const allKeywords = Object.values(keywordsData).flat();
  const results = {};

  console.log(
    `  → Starting ${baseUrl.replace('https://', '')} (concurrency: ${CONFIG.CONCURRENCY})...`
  );

  async function worker(keywords) {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000); // 15s timeout for all actions

    try {
      await page.goto(baseUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await handlePopups(page);
      await sleep(CONFIG.PAGE_LOAD_WAIT);

      for (const keyword of keywords) {
        try {
          console.log(
            `\n  [${baseUrl.includes('beta') ? 'BETA' : 'LIVE'}] Processing: "${keyword}"...`
          );

          const { el: searchEl } = await findSearchInput(page);
          if (!searchEl) {
            console.log(
              `  ✗  Could not find search input on ${baseUrl} for "${keyword}"`
            );
            results[keyword] = {
              suggestions: ['INPUT_NOT_FOUND'],
              count: 'ERR',
              firstProduct: 'ERR',
              url: 'ERR',
            };
            continue;
          }

          // Use a shorter timeout for interaction to detect if obscured
          await searchEl.click({ timeout: 5000 }).catch(async () => {
            await handlePopups(page);
            await searchEl.click({ force: true });
          });

          await searchEl.fill('');
          await page.keyboard.type(keyword, { delay: CONFIG.TYPING_DELAY_MS });

          // Wait for the suggestion API to respond
          console.log(
            `  [${baseUrl.includes('beta') ? 'BETA' : 'LIVE'}]   - Waiting for suggestions API...`
          );
          await Promise.race([
            page.waitForResponse(
              (r) =>
                r.url().includes('/search/suggestion') && r.status() === 200,
              { timeout: 6000 }
            ),
            sleep(CONFIG.WAIT_AFTER_TYPE), // Minimum wait
          ]).catch(() => {});

          const { texts: suggestionTexts } = await collectSuggestions(page);

          console.log(
            `  [${baseUrl.includes('beta') ? 'BETA' : 'LIVE'}]   - Suggestions captured (${suggestionTexts.length}). Pressing Enter...`
          );
          await page.keyboard.press('Enter');

          // Wait for navigation or results to appear
          const resultSelector = CONFIG.RESULTS_PAGE.COUNT_SELECTORS.join(', ');
          await Promise.race([
            page.waitForLoadState('networkidle', { timeout: 15000 }),
            page
              .waitForSelector(resultSelector, { timeout: 15000 })
              .catch(() => {}),
            page
              .waitForSelector('.productcard', { timeout: 15000 })
              .catch(() => {}),
            sleep(15000), // Hard timeout for the results page
          ]);

          await handlePopups(page); // Check for popups on results page
          await sleep(1000);

          let resultCount = '0';
          for (const sel of CONFIG.RESULTS_PAGE.COUNT_SELECTORS) {
            try {
              const el = page.locator(sel).first();
              if (await el.isVisible()) {
                const text = await el.textContent();
                const match =
                  text.match(/of\s+(\d+)/i) ||
                  text.match(/(\d+)\s+results/i) ||
                  text.match(/(\d+)/);
                if (match) {
                  resultCount = match[1];
                  break;
                }
              }
            } catch (_) {}
          }

          let firstProd = 'N/A';
          for (const sel of CONFIG.RESULTS_PAGE.PRODUCT_NAME_SELECTORS) {
            try {
              const el = page.locator(sel).first();
              if (await el.isVisible()) {
                firstProd = (await el.textContent()).trim();
                break;
              }
            } catch (_) {}
          }

          results[keyword] = {
            suggestions: suggestionTexts.length
              ? suggestionTexts
              : ['NO_SUGGESTIONS'],
            count: resultCount,
            firstProduct: firstProd,
            url: page.url(),
          };

          const siteName = baseUrl.includes('beta') ? 'BETA' : 'LIVE';
          console.log(
            `  [${siteName}] ✓ "${keyword}": Suggs=${suggestionTexts.length}, Count=${resultCount}`
          );

          GLOBAL_STATS.done++;
          const pct = Math.floor(
            (GLOBAL_STATS.done / GLOBAL_STATS.total) * 100
          );
          const bar =
            '█'.repeat(Math.floor(pct / 5)) +
            '░'.repeat(20 - Math.floor(pct / 5));
          process.stdout.write(
            `\r  Overall Progress: [${bar}] ${String(pct).padStart(3)}%  (${GLOBAL_STATS.done}/${GLOBAL_STATS.total})`
          );

          // Go back to home to reset search state for next keyword
          await page
            .goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
            .catch(() => {
              console.log(
                `  [${siteName}] ! Timeout returning to home, retrying...`
              );
              return page.goto(baseUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 30000,
              });
            });
          await sleep(CONFIG.BETWEEN_KW_DELAY);
        } catch (e) {
          console.log(
            `\n  [${baseUrl.includes('beta') ? 'BETA' : 'LIVE'}] ✗ Error on "${keyword}": ${e.message}`
          );
          results[keyword] = {
            suggestions: [`ERROR: ${String(e.message).substring(0, 80)}`],
            count: 'ERR',
            firstProduct: 'ERR',
            url: 'ERR',
          };
          await handlePopups(page).catch(() => {});
        }
      }
    } catch (e) {
      console.log(`\n  ✗  Worker error on ${baseUrl}: ${e.message}`);
      for (const kw of keywords)
        results[kw] = {
          suggestions: [`FATAL_ERROR: ${e.message}`],
          count: 'ERR',
          firstProduct: 'ERR',
          url: 'ERR',
        };
    } finally {
      await context.close();
    }
  }

  const chunks = [];
  const chunkSize = Math.ceil(allKeywords.length / CONFIG.CONCURRENCY);
  for (let i = 0; i < allKeywords.length; i += chunkSize) {
    chunks.push(allKeywords.slice(i, i + chunkSize));
  }

  await Promise.all(chunks.map((chunk) => worker(chunk)));
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXCEL WRITER
// ─────────────────────────────────────────────────────────────────────────────
async function writeExcel(betaResults, liveResults, keywordsData, outputPath) {
  const wb = new ExcelJS.Workbook();
  const now = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // ── Sheet 1: Comparison Results ────────────────────────────────────────────
  const ws = wb.addWorksheet('Comparison Results');

  ws.columns = [
    { key: 'num', width: 5 },
    { key: 'kw', width: 32 },
    { key: 'cat', width: 28 },
    { key: 'pri', width: 10 },
    { key: 'b1', width: 26 },
    { key: 'b2', width: 26 },
    { key: 'b3', width: 26 },
    { key: 'b4', width: 26 },
    { key: 'b5', width: 26 },
    { key: 'l1', width: 26 },
    { key: 'l2', width: 26 },
    { key: 'l3', width: 26 },
    { key: 'l4', width: 26 },
    { key: 'l5', width: 26 },
    { key: 'b_count', width: 12 },
    { key: 'b_first', width: 30 },
    { key: 'l_count', width: 12 },
    { key: 'l_first', width: 30 },
    { key: 'status', width: 20 },
    { key: 'notes', width: 30 },
  ];

  // Row 1: title
  ws.mergeCells('A1:T1');
  const titleCell = ws.getCell('A1');
  titleCell.value = `WoodenStreet – Search & Auto-Suggestion Comparison  |  Generated: ${now}`;
  applyHdrStyle(titleCell, '1A237E', 'FFFFFF', 13, true);
  ws.getRow(1).height = 34;

  // Row 2: subtitle
  ws.mergeCells('A2:T2');
  const subCell = ws.getCell('A2');
  subCell.value = `Beta: ${CONFIG.BETA_URL}   vs   Live: ${CONFIG.LIVE_URL}`;
  applyHdrStyle(subCell, 'EEF2FF', '444444', 9, false, false);
  ws.getRow(2).height = 16;

  // Row 3: site group headers
  ws.mergeCells('A3:A4');
  ws.mergeCells('B3:B4');
  ws.mergeCells('C3:C4');
  ws.mergeCells('D3:D4');
  ws.mergeCells('E3:K3');
  ws.mergeCells('L3:R3');
  ws.mergeCells('S3:S4');
  ws.mergeCells('T3:T4');
  ws.getRow(3).height = 20;
  ws.getRow(4).height = 28;

  for (const [ref, val] of [
    ['A3', '#'],
    ['B3', 'Keyword'],
    ['C3', 'Category'],
    ['D3', 'Priority'],
  ]) {
    applyHdrStyle(ws.getCell(ref), '37474F');
    ws.getCell(ref).value = val;
  }

  ws.getCell('E3').value = `🔵  BETA  –  ${CONFIG.BETA_URL}`;
  applyHdrStyle(ws.getCell('E3'), '1565C0');

  ws.getCell('J3').value = `🟢  LIVE  –  ${CONFIG.LIVE_URL}`;
  applyHdrStyle(ws.getCell('J3'), '2E7D32');

  ws.getCell('S3').value = 'Status';
  applyHdrStyle(ws.getCell('S3'), '37474F');
  ws.getCell('T3').value = 'Notes';
  applyHdrStyle(ws.getCell('T3'), '37474F');

  // Row 4: sub-headers
  for (let i = 0; i < 5; i++) {
    const cell = ws.getCell(4, 5 + i);
    cell.value = `Sugg ${i + 1}`;
    applyHdrStyle(cell, 'BBDEFB', '0D47A1', 9);
  }
  ws.getCell(4, 10).value = 'Count';
  applyHdrStyle(ws.getCell(4, 10), '1565C0', 'FFFFFF', 9);
  ws.getCell(4, 11).value = 'First Product';
  applyHdrStyle(ws.getCell(4, 11), '1565C0', 'FFFFFF', 9);

  for (let i = 0; i < 5; i++) {
    const cell = ws.getCell(4, 12 + i);
    cell.value = `Sugg ${i + 1}`;
    applyHdrStyle(cell, 'C8E6C9', '1B5E20', 9);
  }
  ws.getCell(4, 17).value = 'Count';
  applyHdrStyle(ws.getCell(4, 17), '2E7D32', 'FFFFFF', 9);
  ws.getCell(4, 18).value = 'First Product';
  applyHdrStyle(ws.getCell(4, 18), '2E7D32', 'FFFFFF', 9);

  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 4 }];

  let rowNum = 5;
  let kwNum = 1;
  const statusCounts = {
    '✅ Match': 0,
    '⚠️ Partial': 0,
    '❌ Mismatch': 0,
    '🔴 Missing': 0,
  };

  for (const [cat, keywords] of Object.entries(keywordsData)) {
    const { hdr: hdrBg, row: rowBg } = CAT_COLORS[cat];

    // Category divider row
    ws.mergeCells(`A${rowNum}:T${rowNum}`);
    const catCell = ws.getCell(`A${rowNum}`);
    catCell.value = `  ${cat}  (${keywords.length} keywords)`;
    catCell.font = {
      name: 'Arial',
      bold: true,
      size: 10,
      color: { argb: 'FFFFFFFF' },
    };
    catCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: argbHex(hdrBg) },
    };
    catCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    ws.getRow(rowNum).height = 20;
    rowNum++;

    for (const kw of keywords) {
      ws.getRow(rowNum).height = 18;
      const pri = PRIORITY_MAP[cat];
      const betaData = betaResults[kw] || {
        suggestions: ['NOT_SCRAPED'],
        count: '0',
        firstProduct: 'N/A',
      };
      const liveData = liveResults[kw] || {
        suggestions: ['NOT_SCRAPED'],
        count: '0',
        firstProduct: 'N/A',
      };
      const betaSuggs = betaData.suggestions;
      const liveSuggs = liveData.suggestions;
      const status = computeStatus(betaSuggs, liveSuggs);

      for (const k of Object.keys(statusCounts)) {
        if (status.includes(k.slice(3))) {
          statusCounts[k]++;
          break;
        }
      }
      // Fix: count by emoji prefix
      if (status.startsWith('✅')) statusCounts['✅ Match']++;
      else if (status.startsWith('⚠️')) statusCounts['⚠️ Partial']++;
      else if (status.startsWith('❌')) statusCounts['❌ Mismatch']++;
      else if (status.startsWith('🔴')) statusCounts['🔴 Missing']++;

      // Col 1: number
      const c1 = ws.getCell(rowNum, 1);
      c1.value = kwNum;
      applyDataStyle(c1, rowBg, '888888', { center: true });

      // Col 2: keyword
      applyDataStyle(ws.getCell(rowNum, 2), rowBg, '111111');
      ws.getCell(rowNum, 2).value = kw;

      // Col 3: category
      applyDataStyle(ws.getCell(rowNum, 3), rowBg, '555555');
      ws.getCell(rowNum, 3).value = cat;

      // Col 4: priority
      const priCell = ws.getCell(rowNum, 4);
      priCell.value = pri;
      applyDataStyle(priCell, PRI_STYLE[pri].bg, PRI_STYLE[pri].fg, {
        bold: true,
        center: true,
      });

      // Cols 5–9: beta suggestions
      for (let i = 0; i < 5; i++) {
        const cell = ws.getCell(rowNum, 5 + i);
        cell.value = betaSuggs[i] || '';
        applyDataStyle(cell, 'EEF5FF', '0D47A1');
      }

      // Col 10-11: beta results
      const bc = ws.getCell(rowNum, 10);
      bc.value = betaData.count;
      applyDataStyle(bc, 'E3F2FD', '0D47A1', { center: true });
      const bf = ws.getCell(rowNum, 11);
      bf.value = betaData.firstProduct;
      applyDataStyle(bf, 'E3F2FD', '0D47A1');

      // Cols 12–16: live suggestions
      for (let i = 0; i < 5; i++) {
        const cell = ws.getCell(rowNum, 12 + i);
        cell.value = liveSuggs[i] || '';
        applyDataStyle(cell, 'F0FAF0', '1B5E20');
      }

      // Col 17-18: live results
      const lc = ws.getCell(rowNum, 17);
      lc.value = liveData.count;
      applyDataStyle(lc, 'E8F5E9', '1B5E20', { center: true });
      const lf = ws.getCell(rowNum, 18);
      lf.value = liveData.firstProduct;
      applyDataStyle(lf, 'E8F5E9', '1B5E20');

      // Col 19: status
      const statusCell = ws.getCell(rowNum, 19);
      statusCell.value = status;
      const sKey =
        Object.keys(STATUS_STYLE).find((k) => status.includes(k)) || '';
      const sStyle = STATUS_STYLE[sKey] || { bg: 'F5F5F5', fg: '333333' };
      applyDataStyle(statusCell, sStyle.bg, sStyle.fg, {
        bold: true,
        center: true,
      });

      // Col 20: notes (overlap count)
      const invalid = new Set([
        'NO_SUGGESTIONS',
        'NOT_SCRAPED',
        'INPUT_NOT_FOUND',
      ]);
      const bSet = new Set(
        betaSuggs
          .filter((s) => !invalid.has(s) && !s.startsWith('ERROR'))
          .map((s) => s.toLowerCase())
      );
      const lSet = new Set(
        liveSuggs
          .filter((s) => !invalid.has(s) && !s.startsWith('ERROR'))
          .map((s) => s.toLowerCase())
      );
      const common = [...bSet].filter((s) => lSet.has(s)).length;
      const total = Math.max(bSet.size, lSet.size);
      const noteCell = ws.getCell(rowNum, 20);
      noteCell.value =
        bSet.size || lSet.size
          ? `Sugg: ${common}/${total} | Results: ${betaData.count} vs ${liveData.count}`
          : '';
      applyDataStyle(noteCell, rowBg, '666666', { center: false });

      rowNum++;
      kwNum++;
    }
  }

  // ── Sheet 2: Summary Dashboard ─────────────────────────────────────────────
  const ws2 = wb.addWorksheet('Summary Dashboard');
  ws2.columns = [
    { width: 36 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 28 },
  ];

  ws2.mergeCells('A1:H1');
  ws2.getCell('A1').value = 'Auto-Suggestion Comparison – Summary Dashboard';
  applyHdrStyle(ws2.getCell('A1'), '1A237E', 'FFFFFF', 13);
  ws2.getRow(1).height = 32;

  ws2.mergeCells('A2:H2');
  ws2.getCell('A2').value =
    `Beta: ${CONFIG.BETA_URL}   vs   Live: ${CONFIG.LIVE_URL}   |   Scraped: ${now}`;
  applyHdrStyle(ws2.getCell('A2'), 'EEF2FF', '444444', 9, false);
  ws2.getRow(2).height = 16;

  const hdr2Data = [
    ['Category', '37474F'],
    ['Total', '37474F'],
    ['✅ Match', '2E7D32'],
    ['⚠️ Partial', 'F57F17'],
    ['❌ Mismatch', 'C62828'],
    ['🔴 Missing', 'BF360C'],
    ['Match %', '1565C0'],
    ['Top Gap Keyword', '880E4F'],
  ];
  hdr2Data.forEach(([label, bg], i) => {
    const cell = ws2.getCell(3, i + 1);
    cell.value = label;
    applyHdrStyle(cell, bg, 'FFFFFF', 10, true, true);
  });
  ws2.getRow(3).height = 28;

  ws2.views = [{ state: 'frozen', xSplit: 0, ySplit: 3 }];

  let summaryRow = 4;
  let totalMatch = 0,
    totalPartial = 0,
    totalMismatch = 0,
    totalMissing = 0,
    totalKws = 0;

  for (const [cat, keywords] of Object.entries(keywordsData)) {
    const { row: rowBg } = CAT_COLORS[cat];
    let matches = 0,
      partials = 0,
      mismatches = 0,
      missings = 0;
    let topGap = '—';

    for (const kw of keywords) {
      const s = computeStatus(
        betaResults[kw]?.suggestions || [],
        liveResults[kw]?.suggestions || []
      );
      if (s.startsWith('✅')) matches++;
      else if (s.startsWith('⚠️')) partials++;
      else if (s.startsWith('❌')) {
        mismatches++;
        if (topGap === '—') topGap = kw;
      } else if (s.startsWith('🔴')) {
        missings++;
        if (topGap === '—') topGap = kw;
      }
    }

    totalMatch += matches;
    totalPartial += partials;
    totalMismatch += mismatches;
    totalMissing += missings;
    totalKws += keywords.length;

    const pct = keywords.length ? matches / keywords.length : 0;
    const pctFg = pct >= 0.7 ? '006400' : pct >= 0.4 ? 'FF8C00' : 'B71C1C';

    const rowVals = [
      cat,
      keywords.length,
      matches,
      partials,
      mismatches,
      missings,
    ];
    rowVals.forEach((val, i) => {
      const cell = ws2.getCell(summaryRow, i + 1);
      cell.value = val;
      applyDataStyle(cell, rowBg, '222222', { center: i > 0 });
    });

    const pctCell = ws2.getCell(summaryRow, 7);
    pctCell.value = pct;
    pctCell.numFmt = '0.0%';
    applyDataStyle(pctCell, rowBg, pctFg, { bold: true, center: true });

    const gapCell = ws2.getCell(summaryRow, 8);
    gapCell.value = topGap;
    applyDataStyle(gapCell, rowBg, '880E4F');

    ws2.getRow(summaryRow).height = 18;
    summaryRow++;
  }

  // Totals row
  const totalPct = totalKws ? totalMatch / totalKws : 0;
  const totalVals = [
    'TOTAL',
    totalKws,
    totalMatch,
    totalPartial,
    totalMismatch,
    totalMissing,
  ];
  totalVals.forEach((val, i) => {
    const cell = ws2.getCell(summaryRow, i + 1);
    cell.value = val;
    applyDataStyle(cell, 'CFD8DC', '222222', { bold: true, center: i > 0 });
  });
  const totPctCell = ws2.getCell(summaryRow, 7);
  totPctCell.value = totalPct;
  totPctCell.numFmt = '0.0%';
  applyDataStyle(totPctCell, 'CFD8DC', '222222', { bold: true, center: true });
  ws2.getRow(summaryRow).height = 24;

  // ── Sheet 3: Mismatches & Missing ──────────────────────────────────────────
  const ws3 = wb.addWorksheet('Mismatches & Missing');
  ws3.columns = [
    { width: 5 },
    { width: 32 },
    { width: 28 },
    { width: 10 },
    { width: 20 },
    { width: 26 },
    { width: 26 },
    { width: 26 },
    { width: 26 },
    { width: 26 },
    { width: 26 },
    { width: 35 },
  ];

  ws3.mergeCells('A1:L1');
  ws3.getCell('A1').value =
    'Keywords with Mismatches or Missing Suggestions – Action Required';
  applyHdrStyle(ws3.getCell('A1'), 'B71C1C', 'FFFFFF', 12);
  ws3.getRow(1).height = 30;

  const hdr3Data = [
    ['#', '37474F'],
    ['Keyword', '37474F'],
    ['Category', '37474F'],
    ['Priority', '37474F'],
    ['Status', '37474F'],
    ['Beta Sugg 1', '1565C0'],
    ['Beta Sugg 2', '1565C0'],
    ['Beta Sugg 3', '1565C0'],
    ['Live Sugg 1', '2E7D32'],
    ['Live Sugg 2', '2E7D32'],
    ['Live Sugg 3', '2E7D32'],
    ['Recommended Action', '880E4F'],
  ];
  hdr3Data.forEach(([label, bg], i) => {
    const cell = ws3.getCell(2, i + 1);
    cell.value = label;
    applyHdrStyle(cell, bg);
  });
  ws3.getRow(2).height = 22;
  ws3.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];

  let row3 = 3,
    seq3 = 1;
  for (const [cat, keywords] of Object.entries(keywordsData)) {
    const { row: rowBg } = CAT_COLORS[cat];
    for (const kw of keywords) {
      const betaS = betaResults[kw]?.suggestions || ['NOT_SCRAPED'];
      const liveS = liveResults[kw]?.suggestions || ['NOT_SCRAPED'];
      const status = computeStatus(betaS, liveS);
      if (status.startsWith('✅')) continue;

      const pri = PRIORITY_MAP[cat];
      const action = status.includes('Missing (beta)')
        ? 'Add keyword to beta search index'
        : status.includes('Missing (live)')
          ? 'Add keyword to live search index'
          : status.includes('Missing (both)')
            ? 'Missing on both — check search config'
            : status.includes('Mismatch')
              ? 'Sync beta search suggestions with live'
              : 'Review and align partial suggestions';

      const sBg = status.includes('Mismatch') ? 'FFCDD2' : 'FFE0B2';
      const sFg = status.includes('Mismatch') ? 'B71C1C' : 'BF360C';

      ws3.getRow(row3).height = 18;

      applyDataStyle(ws3.getCell(row3, 1), rowBg, '888888', { center: true });
      ws3.getCell(row3, 1).value = seq3;

      applyDataStyle(ws3.getCell(row3, 2), rowBg, '111111');
      ws3.getCell(row3, 2).value = kw;

      applyDataStyle(ws3.getCell(row3, 3), rowBg, '555555');
      ws3.getCell(row3, 3).value = cat;

      applyDataStyle(
        ws3.getCell(row3, 4),
        PRI_STYLE[pri].bg,
        PRI_STYLE[pri].fg,
        { bold: true, center: true }
      );
      ws3.getCell(row3, 4).value = pri;

      applyDataStyle(ws3.getCell(row3, 5), sBg, sFg, {
        bold: true,
        center: true,
      });
      ws3.getCell(row3, 5).value = status;

      for (let i = 0; i < 3; i++) {
        applyDataStyle(ws3.getCell(row3, 6 + i), 'EEF5FF', '0D47A1');
        ws3.getCell(row3, 6 + i).value = betaS[i] || '';
      }
      for (let i = 0; i < 3; i++) {
        applyDataStyle(ws3.getCell(row3, 9 + i), 'F0FAF0', '1B5E20');
        ws3.getCell(row3, 9 + i).value = liveS[i] || '';
      }

      applyDataStyle(ws3.getCell(row3, 12), 'FFF8E1', '880E4F', { bold: true });
      ws3.getCell(row3, 12).value = action;

      row3++;
      seq3++;
    }
  }

  await wb.xlsx.writeFile(outputPath);
  console.log(`\n  ✅  Excel report saved: ${outputPath}`);

  // Fix status counts (we double-counted above, reset and recount)
  const finalCounts = {
    '✅ Match': 0,
    '⚠️ Partial': 0,
    '❌ Mismatch': 0,
    '🔴 Missing': 0,
  };
  for (const keywords of Object.values(keywordsData)) {
    for (const kw of keywords) {
      const s = computeStatus(
        betaResults[kw]?.suggestions || [],
        liveResults[kw]?.suggestions || []
      );
      if (s.startsWith('✅')) finalCounts['✅ Match']++;
      else if (s.startsWith('⚠️')) finalCounts['⚠️ Partial']++;
      else if (s.startsWith('❌')) finalCounts['❌ Mismatch']++;
      else if (s.startsWith('🔴')) finalCounts['🔴 Missing']++;
    }
  }
  return finalCounts;
}

/**
 * Sends the generated Excel report via email
 */
// async function sendEmail(outputPath) {
//   if (!CONFIG.EMAIL.ENABLED) return;

//   if (!CONFIG.EMAIL.USER || !CONFIG.EMAIL.PASS) {
//     console.log(
//       '\n  ⚠️  Email skipped: SMTP_USER or SMTP_PASS not found in environment.'
//     );
//     return;
//   }

//   console.log(
//     `\n  📧  Sending email to: ${CONFIG.EMAIL.RECIPIENTS.join(', ')}...`
//   );

//   const transporter = nodemailer.createTransport({
//     host: CONFIG.EMAIL.HOST,
//     port: CONFIG.EMAIL.PORT,
//     secure: CONFIG.EMAIL.SECURE,
//     auth: {
//       user: CONFIG.EMAIL.USER,
//       pass: CONFIG.EMAIL.PASS,
//     },
//   });

//   const mailOptions = {
//     from: `"WS Scraper" <${CONFIG.EMAIL.USER}>`,
//     to: CONFIG.EMAIL.RECIPIENTS.join(', '),
//     subject: CONFIG.EMAIL.SUBJECT,
//     text: `Hello,\n\nPlease find attached the latest WoodenStreet Auto-Suggestion Comparison Report.\n\nGenerated: ${new Date().toLocaleString('en-IN')}\n\nThis is an automated message.`,
//     attachments: [
//       {
//         filename: path.basename(outputPath),
//         path: outputPath,
//       },
//     ],
//   };

//   try {
//     const info = await transporter.sendMail(mailOptions);
//     console.log('  ✅  Email sent successfully:', info.messageId);
//   } catch (error) {
//     console.error('  ❌  Error sending email:', error.message);
//   }
// }

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const allKeywords = Object.values(KEYWORDS_DATA).flat();
  const totalUnits = allKeywords.length * 2; // Beta + Live
  GLOBAL_STATS.total = totalUnits;

  console.log('='.repeat(65));
  console.log('  WoodenStreet Auto-Suggestion Comparison Script (JS)');
  console.log('='.repeat(65));

  console.log(`  Beta site : ${CONFIG.BETA_URL}`);
  console.log(`  Live site : ${CONFIG.LIVE_URL}`);
  console.log(`  Keywords  : ${allKeywords.length}`);
  console.log(`  Headless  : ${CONFIG.HEADLESS}`);
  console.log('='.repeat(65));

  const browser = await chromium.launch({ headless: CONFIG.HEADLESS });

  console.log('\n[1/1]  Scraping sites in parallel...');

  // Run both BETA and LIVE scraping simultaneously
  const [betaResults, liveResults] = await Promise.all([
    scrapeSite(browser, CONFIG.BETA_URL, KEYWORDS_DATA),
    scrapeSite(browser, CONFIG.LIVE_URL, KEYWORDS_DATA),
  ]);

  await browser.close();

  console.log('\n  Writing Excel report ...');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
  const outputPath = `woodenstreet_autosuggestion_results_${timestamp}.xlsx`;

  let statusCounts;
  try {
    statusCounts = await writeExcel(
      betaResults,
      liveResults,
      KEYWORDS_DATA,
      outputPath
    );
  } catch (e) {
    if (e.code === 'EBUSY') {
      const backupPath = `woodenstreet_autosuggestion_results_BACKUP_${Date.now()}.xlsx`;
      console.log(`  ⚠️  File locked! Saving to backup instead: ${backupPath}`);
      statusCounts = await writeExcel(
        betaResults,
        liveResults,
        KEYWORDS_DATA,
        backupPath
      );
    } else {
      throw e;
    }
  }

  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const matchPct = total
    ? ((statusCounts['✅ Match'] / total) * 100).toFixed(0)
    : 0;

  console.log('\n' + '='.repeat(65));
  console.log('  RESULTS SUMMARY');
  console.log('='.repeat(65));
  for (const [label, count] of Object.entries(statusCounts)) {
    console.log(
      `  ${label.padEnd(20)}  ${String(count).padStart(4)}  keywords`
    );
  }
  console.log(
    `  ${'Overall Match %'.padEnd(20)}  ${String(matchPct).padStart(3)}%`
  );
  console.log('='.repeat(65));
  console.log(`\n  Report : ${outputPath}`);
  console.log('  Sheets :');
  console.log(
    '    1. Comparison Results   – all 500 keywords with suggestions side by side'
  );
  console.log('    2. Summary Dashboard    – match % per category');
  console.log('    3. Mismatches & Missing – action items only');
  console.log();

  // Send the email
  // await sendEmail(outputPath);
}

main().catch((err) => {
  console.error('\n  ✗  Fatal error:', err.message);
  process.exit(1);
});
