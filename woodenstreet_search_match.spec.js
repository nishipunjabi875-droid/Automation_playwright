const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://10.5.1.170:3000/' || process.env.BASE_URL;
const CSV_FILE = process.env.CSV_FILE || path.join(__dirname, 't1.csv');
// --- Relevance Engine ---
const categorySynonyms = {
    'storage': ['wardrobe', 'cabinet', 'chest', 'drawer', 'rack', 'shelf', 'box', 'trunk', 'organizer', 'almirah'],
    'book': ['bookshelf', 'bookcase', 'study', 'magazine', 'display'],
    'sofa': ['recliner', 'couch', 'lounge', 'futon', 'seating', 'ottoman'],
    'trunk': ['box', 'chest', 'blanket'],
    'dining': ['dining table', 'dining chair', 'buffet', 'crockery', 'dining set'],
    'parker': ['parker', 'study', 'desk'],
    'nectar': ['nectar', 'mattress', 'bed'],
    'cohoon': ['cohoon', 'console'],
    'sofie': ['sofie', 'seating'],
    'rack': ['shelf', 'stand', 'organizer']
};

function getSuggestions(query) {
    const q = query.toLowerCase();
    let suggestions = new Set();
    
    // Check for explicit matches
    for (const [key, related] of Object.entries(categorySynonyms)) {
        if (q.includes(key)) {
            related.forEach(r => suggestions.add(r));
        }
    }
    
    // Fallback if no specific suggestion found
    if (suggestions.size === 0) {
        if (q.includes('bed')) suggestions.add('beds, mattresses, bedside tables');
        else if (q.includes('table')) suggestions.add('coffee tables, study tables, dining tables');
        else if (q.includes('chair')) suggestions.add('lounge chairs, study chairs, recliners');
        else suggestions.add('Check exact product matches or broader category');
    }
    
    return Array.from(suggestions).slice(0, 3).join(', ');
}

// --- Helper Functions ---
function loadQueriesSync() {
    const queries = [];
    if (!fs.existsSync(CSV_FILE)) {
        throw new Error(`CSV not found: ${CSV_FILE}`);
    }
    const lines = fs.readFileSync(CSV_FILE, 'utf-8').split(/\r?\n/);
    if (lines.length === 0) return queries;
    
    // Check if first line is a header
    let startIndex = 0;
    const firstRow = lines[0].toLowerCase();
    if (firstRow.includes('query') || firstRow.includes('keyword')) {
        startIndex = 1;
    } else {
        startIndex = 1; // Match previous csv-parser behavior that consumes 1st row as header unless configured otherwise
    }

    for (let i = startIndex; i < lines.length; i++) {
        let line = lines[i];
        if (!line || !line.trim()) continue;
        
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

    // 1. Search page: has a query param
    if (/[?&](search|q|query|keyword)=|\/search[/?]/i.test(urlStr)) return 'search';

    // 2. Category page: non-root clean path with no query string
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

const queries = loadQueriesSync();

test.describe.configure({ mode: 'parallel' });

test.describe('Search queries from CSV - Match Verification', () => {

    const queryLimit = queries.length;

    for (let i = 0; i < queryLimit; i++) {
        const query = queries[i];

        test(`[${i + 1}/${queryLimit}] Testing Query: "${query}"`, async ({ page }, testInfo) => {
            test.setTimeout(35000); // Timeout for individual test
            
            const t0 = Date.now();
            await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(500); 

                await dismissPopups(page);

                const searchInput = page.locator('header input[placeholder*="Search" i], input.undefined.w-full, input[type="search"], input[name="search"], input[placeholder*="search" i], .search-input input, input[name="q"], #search').first();
                await expect(searchInput).toBeVisible({ timeout: 10000 });

                await searchInput.click({ force: true });
                await searchInput.fill(''); 
                await searchInput.pressSequentially(query, { delay: 15 }); 

                const currUrl = page.url();
                await searchInput.press('Enter');

                let elapsed = 0;
                while (page.url() === currUrl && elapsed < 8000) {
                    await page.waitForTimeout(500);
                    elapsed += 500;
                }

                await page.waitForLoadState('domcontentloaded').catch(() => { });
                await page.waitForTimeout(2000);

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
                let matchStatus = 'N/A';

                if (isZeroResults) {
                    queryStatus = 'ZERO_RESULTS';
                    notes = '0 results found';
                } else if (!['search', 'category'].includes(pageType)) {
                    queryStatus = 'UNEXPECTED_PAGE';
                    notes = `Unexpected page type: ${pageType}`;
                } else if (pageType === 'search' || pageType === 'category') {
                    // ANALYZE FIRST 12 PRODUCTS FOR RELEVANCE
                    const products = await page.$$eval('h2, h3, .product-title, .product-name, [class*="ProductTitle"], [class*="ProductName"], a[href*="/product/"]', (elements) => {
                        // We filter for elements that actually have some descriptive text
                        const validElements = elements.filter(el => el.innerText.trim().length > 5);
                        return validElements.map(el => {
                            // Only take the first line to avoid giant blobs of text
                            const title = el.innerText.trim().split('\n')[0];
                            const linkEl = el.tagName === 'A' ? el : el.closest('a');
                            const href = linkEl ? linkEl.href : '';
                            return { title, href };
                        }).filter(p => p.title.length > 5).slice(0, 12);
                    });
                    
                    // Strip out punctuation like slashes or hyphens so "/dining-table-sets" becomes "dining table sets"
                    const normalizedQuery = query.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
                    const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 2);
                    
                    // Filter out generic words that cause false positives (e.g. "wooden bed" shouldn't match "wooden shelf")
                    const genericWords = new Set(['wooden', 'wood', 'solid', 'modern', 'cheap', 'furniture', 'room', 'under', 'sets', 'set', 'the', 'for', 'with', 'and']);
                    const meaningfulWords = queryWords.filter(w => !genericWords.has(w));
                    const termsToMatch = meaningfulWords.length > 0 ? meaningfulWords : queryWords;
                    
                    const suggestedFurniture = getSuggestions(normalizedQuery);
                    
                    if (products.length > 0 && queryWords.length > 0) {
                        let relevantCount = 0;
                        
                        for (const prod of products) {
                            const prodString = (prod.title + ' ' + prod.href).toLowerCase();
                            
                            // strict check: product must contain ALL meaningful words (e.g. "dining" AND "table")
                            let isRelevant = termsToMatch.every(term => prodString.includes(term));
                            
                            // fallback check: or it matches one of our defined specific synonyms
                            if (!isRelevant) {
                                for (const term of termsToMatch) {
                                    if (categorySynonyms[term] && categorySynonyms[term].some(syn => prodString.includes(syn))) {
                                        isRelevant = true;
                                        break;
                                    }
                                }
                            }
                            
                            if (isRelevant) {
                                relevantCount++;
                            }
                        }
                        
                        const relevanceScore = Math.round((relevantCount / products.length) * 100);
                        
                        if (relevanceScore >= 50) {
                            matchStatus = 'HIGH_RELEVANCE';
                            // At least half the products match the user's intent. PASS.
                        } else if (relevanceScore >= 25) {
                            matchStatus = 'POOR_RELEVANCE';
                            // Too much noise in the search results. Fail it.
                            queryStatus = 'MISMATCH';
                        } else {
                            matchStatus = 'NO_MATCH';
                            // Almost completely irrelevant results.
                            queryStatus = 'MISMATCH';
                        }
                        notes = `Analyzed ${products.length} products. ${relevantCount} relevant (${relevanceScore}%). Suggested: ${suggestedFurniture}`;
                    } else {
                        matchStatus = 'UNABLE_TO_VERIFY';
                        notes = `No products found or query too short. Suggested: ${suggestedFurniture}`;
                    }
                }

                const resultObj = {
                    index: i + 1,
                    query: query,
                    status: queryStatus,
                    matchStatus: matchStatus,
                    pageType: pageType,
                    url: finalUrl,
                    elapsed: Date.now() - t0,
                    notes: notes
                };
                
                testInfo.annotations.push({ type: 'custom-result', description: JSON.stringify(resultObj) });
                console.log(`[${i + 1}/${queryLimit}] Query: "${query}" | Type: ${pageType} | Match: ${matchStatus} | Status: ${queryStatus}`);
        });
    }

});
