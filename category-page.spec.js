// @ts-check
const { test, expect } = require('@playwright/test');

// ─── CONFIG ───────────────────────────────────────────────────────────────────
// Update these before running

const BASE_URL = 'https://beta.teamwoodenstreet.com/wooden-sofa'; // your category page URL
const PER_BATCH = 24;                                  // products loaded per scroll/batch

// Selectors — update to match your site's actual DOM
const SEL = {
    productCard: '[data-testid="product-card"], .product-card, .product-item',
    resultCount: '[data-testid="result-count"], .result-count, .product-count',
    loadMoreTrigger: '[data-testid="load-more"], .load-more, .infinite-scroll-trigger',
    skeletonLoader: '[data-testid="skeleton"], .skeleton, .product-skeleton',
    spinner: '[data-testid="spinner"], .loader, .loading-spinner',
    emptyState: '[data-testid="empty-state"], .empty-state, .no-results',
    filterPanel: '[data-testid="filter-panel"], .filter-panel, .filters',
    filterChip: '[data-testid="filter-chip"], .filter-chip, .active-filter',
    filterOption: (name) => `[data-testid="filter-${name}"], [data-filter="${name}"], label:has-text("${name}")`,
    priceMin: '[data-testid="price-min"], input[name="price_min"], .price-range-min',
    priceMax: '[data-testid="price-max"], input[name="price_max"], .price-range-max',
    ratingFilter: '[data-testid="rating-filter"], [data-filter="rating"], .rating-filter',
    clearAllBtn: '[data-testid="clear-all"], button:text-is("Clear All"), button:text-is("Clear all")',
    sortDropdown: '[data-testid="sort"], select[name*="sort" i], .sort-dropdown',
    fastShippingToggle: '[data-testid="fast-shipping"], input[name*="fast" i], .fast-shipping-toggle label',
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Count product cards currently in the DOM */
async function productCount(page) {
    const el = page.locator('.text-secondary600.text-xs.block.font-redhatRegular.tracking-wide').first();
    const text = await el.textContent();
    const match = text?.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
}


/** Scroll to the bottom of the page to trigger infinite load */
async function scrollToBottom(page) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
}

/** Wait for new products to load after scroll */
async function waitForMoreProducts(page, countBefore, timeout = 5000) {
    await page.waitForFunction(
        ({ selector, before }) => document.querySelectorAll(selector).length > before,
        { selector: SEL.productCard, before: countBefore },
        { timeout }
    );
}

/** Collect all visible product IDs or fallback text keys */
async function collectProductIds(page) {
    return page.locator(SEL.productCard).evaluateAll((els) =>
        els.map(
            (el) =>
                el.getAttribute('data-id') ||
                el.getAttribute('data-product-id') ||
                el.querySelector('a')?.getAttribute('href') ||
                el.textContent?.trim().slice(0, 50) ||
                ''
        )
    );
}

/** Scroll page and collect all products after N scroll attempts */
async function loadAllProducts(page, scrolls = 3) {
    for (let i = 0; i < scrolls; i++) {
        const before = await productCount(page);
        await scrollToBottom(page);
        await waitForMoreProducts(page, before).catch(() => { }); // stop if no more load
    }
    return productCount(page);
}

// ─── TEST SUITE ───────────────────────────────────────────────────────────────

test.describe('Category page — infinite scroll (single page)', () => {

    // ── INFINITE SCROLL ────────────────────────────────────────────────────────

    test.describe('INF — Infinite scroll behaviour', () => {

        test('INF-01 · Initial load shows first batch of products', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');

            const count = await productCount(page);
            expect(count, `Expected at least ${PER_BATCH} products on initial load`).toBeGreaterThanOrEqual(PER_BATCH);
        });

        // test('INF-02 · Scrolling to bottom loads more products', async ({ page }) => {
        //     await page.goto(BASE_URL);
        //     await page.waitForLoadState('networkidle');
        //     const before = await productCount(page);
        //     await scrollToBottom(page);
        //     await waitForMoreProducts(page, before);
        //     const after = await productCount(page);
        //     expect(after, `Products should increase after scroll — was ${before}`).toBeGreaterThan(before);
        // });

        // test('INF-03 · Each scroll loads next batch (increments by ~perBatch)', async ({ page }) => {
        //     await page.goto(BASE_URL);
        //     await page.waitForLoadState('networkidle');
        //     const batch1 = await productCount(page);

        //     await scrollToBottom(page);
        //     await waitForMoreProducts(page, batch1);
        //     const batch2 = await productCount(page);

        //     await scrollToBottom(page);
        //     await waitForMoreProducts(page, batch2).catch(() => { });
        //     const batch3 = await productCount(page);

        //     expect(batch2).toBeGreaterThan(batch1);
        //     expect(batch3).toBeGreaterThanOrEqual(batch2);
        // });

        // test('INF-04 · No duplicate products across scroll batches', async ({ page }) => {
        //     await page.goto(BASE_URL);
        //     await page.waitForLoadState('networkidle');
        //     const ids1 = await collectProductIds(page);

        //     await scrollToBottom(page);
        //     await waitForMoreProducts(page, ids1.length);
        //     const ids2 = await collectProductIds(page);

        //     // New items added in second batch
        //     const newItems = ids2.slice(ids1.length);
        //     const duplicates = newItems.filter((id) => ids1.includes(id));
        //     expect(duplicates.length, `Duplicate products found: ${duplicates.join(', ')}`).toBe(0);
        // });

        // test('INF-05 · Loader / skeleton visible during scroll fetch', async ({ page }) => {
        //     await page.goto(BASE_URL);
        //     await page.waitForLoadState('networkidle');

        //     // Throttle network to catch loader
        //     await page.route('**/*', (route) => setTimeout(() => route.continue(), 400));

        //     const loaderVisible = new Promise((resolve) => {
        //         page.locator(`${SEL.skeletonLoader}, ${SEL.spinner}`).first()
        //             .waitFor({ timeout: 3000 })
        //             .then(() => resolve(true))
        //             .catch(() => resolve(false));
        //     });

        //     await scrollToBottom(page);
        //     const saw = await loaderVisible;
        //     if (!saw) {
        //         console.warn('INF-05: Loader not caught — may be too brief or selector needs update');
        //     }
        //     // Confirm products eventually load regardless
        //     await page.waitForLoadState('networkidle');
        //     const count = await productCount(page);
        //     expect(count).toBeGreaterThanOrEqual(PER_BATCH);
        // });

        // test('INF-06 · End of catalogue — no more products load after final scroll', async ({ page }) => {
        //     await page.goto(BASE_URL);
        //     // Scroll multiple times to reach end
        //     let prev = 0;
        //     let current = await productCount(page);
        //     let attempts = 0;
        //     while (current > prev && attempts < 20) {
        //         prev = current;
        //         await scrollToBottom(page);
        //         await page.waitForTimeout(1500);
        //         current = await productCount(page);
        //         attempts++;
        //     }
        //     // At end: no new products loaded on one more scroll
        //     const final = await productCount(page);
        //     await scrollToBottom(page);
        //     await page.waitForTimeout(2000);
        //     const afterExtra = await productCount(page);
        //     expect(afterExtra).toBe(final);
        // });

        // test('INF-07 · Result count label matches total products loaded', async ({ page }) => {
        //     await page.goto(BASE_URL);
        //     await page.waitForLoadState('networkidle');
        //     const countEl = page.locator(SEL.resultCount).first();
        //     await expect(countEl).toBeVisible();
        //     const text = await countEl.textContent();
        //     expect(text).toMatch(/\d+/); // has some number
        // });

        test('INF-08 · URL stays the same (no page param appended on scroll)', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');
            const urlBefore = page.url();

            await scrollToBottom(page);
            await page.waitForTimeout(1500);
            const urlAfter = page.url();

            expect(urlAfter).toBe(urlBefore);
        });

        test('INF-09 · Back button returns to same scroll position', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');

            // Load a second batch then click a product
            await scrollToBottom(page);
            await waitForMoreProducts(page, PER_BATCH).catch(() => { });
            const scrollBefore = await page.evaluate(() => window.scrollY);

            await page.locator(SEL.productCard).nth(PER_BATCH + 2).click();
            await page.waitForNavigation();
            await page.goBack();
            await page.waitForLoadState('networkidle');

            const scrollAfter = await page.evaluate(() => window.scrollY);
            // Allow ±300px tolerance for restored scroll
            expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(300);
        });

        test('INF-10 · Rapid scroll does not cause race / duplicate fetch', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');

            // Scroll rapidly multiple times
            for (let i = 0; i < 5; i++) {
                await scrollToBottom(page);
                await page.waitForTimeout(100);
            }
            await page.waitForLoadState('networkidle');

            const ids = await collectProductIds(page);
            const unique = new Set(ids);
            expect(unique.size).toBe(ids.length); // no duplicates from rapid scroll
        });

    });

    // ── FILTERS ────────────────────────────────────────────────────────────────

    test.describe('FLT — Filters', () => {

        test('FLT-01 · Single filter — results update and scroll resets to top', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');
            await page.evaluate(() => window.scrollTo(0, 1500));

            await page.locator(SEL.filterOption('nike')).first().click();
            await page.waitForLoadState('networkidle');

            const scrollY = await page.evaluate(() => window.scrollY);
            expect(scrollY).toBeLessThan(200);

            const count = await productCount(page);
            expect(count).toBeGreaterThan(0);
        });

        test('FLT-02 · Multiple filters (OR within same group)', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');

            await page.locator(SEL.filterOption('nike')).first().click();
            await page.waitForLoadState('networkidle');
            const nikeCount = await productCount(page);

            await page.locator(SEL.filterOption('adidas')).first().click();
            await page.waitForLoadState('networkidle');
            const bothCount = await productCount(page);

            expect(bothCount).toBeGreaterThanOrEqual(nikeCount);
        });

        test('FLT-03 · Filters across groups narrow results (AND logic)', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');

            await page.locator(SEL.filterOption('nike')).first().click();
            await page.waitForLoadState('networkidle');
            const withBrand = await productCount(page);

            await page.locator(SEL.filterOption('10')).first().click();
            await page.waitForLoadState('networkidle');
            const withBrandAndSize = await productCount(page);

            expect(withBrandAndSize).toBeLessThanOrEqual(withBrand);
        });

        test('FLT-04 · Filter chip appears and shows active filter', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');
            await page.locator(SEL.filterOption('nike')).first().click();
            await page.waitForLoadState('networkidle');
            await expect(page.locator(SEL.filterChip).first()).toBeVisible();
        });

        test('FLT-05 · Filter with no results shows empty state', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');
            await page.locator(SEL.filterOption('nonexistent_brand_xyz')).first().click().catch(() => { });
            await page.waitForLoadState('networkidle');
            const count = await productCount(page);
            const hasEmpty = await page.locator(SEL.emptyState).count();
            expect(count === 0 || hasEmpty > 0).toBe(true);
        });

        test('FLT-06 · Filter persists after scrolling down to load more', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');

            await page.locator(SEL.filterOption('nike')).first().click();
            await page.waitForLoadState('networkidle');
            const filteredBefore = await productCount(page);

            await scrollToBottom(page);
            await waitForMoreProducts(page, filteredBefore).catch(() => { });

            // All visible products should still be Nike
            const allTexts = await page.locator(SEL.productCard).allTextContents();
            const nonNike = allTexts.filter(t => !t.toLowerCase().includes('nike'));
            expect(nonNike.length).toBe(0);
        });

        test('FLT-07 · Price range filter shows products within range', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');
            await page.locator(SEL.priceMin).fill('500');
            await page.locator(SEL.priceMax).fill('1500');
            await page.keyboard.press('Enter');
            await page.waitForLoadState('networkidle');
            const count = await productCount(page);
            expect(count).toBeGreaterThan(0);
        });

        test('FLT-08 · Rating filter shows only rated products', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');
            await page.locator(SEL.ratingFilter).first().click();
            await page.waitForLoadState('networkidle');
            const count = await productCount(page);
            expect(count).toBeGreaterThan(0);
        });

        test('FLT-09 · Removing one filter chip restores broader results', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');

            await page.locator(SEL.filterOption('nike')).first().click();
            await page.waitForLoadState('networkidle');
            const filtered = await productCount(page);

            // Remove chip
            await page.locator(SEL.filterChip).first().locator('button, [aria-label*="remove" i], [aria-label*="close" i]').click();
            await page.waitForLoadState('networkidle');
            const restored = await productCount(page);

            expect(restored).toBeGreaterThanOrEqual(filtered);
        });

        test('FLT-10 · Scroll loads more within filtered results (no filter bleed)', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');

            await page.locator(SEL.filterOption('nike')).first().click();
            await page.waitForLoadState('networkidle');
            const before = await productCount(page);

            await scrollToBottom(page);
            await waitForMoreProducts(page, before).catch(() => { });

            const ids = await collectProductIds(page);
            const unique = new Set(ids);
            expect(unique.size).toBe(ids.length); // no duplicates after filtered scroll
        });

    });

    // ── SORTING ────────────────────────────────────────────────────────────────

    test.describe('SRT — Sorting', () => {

        test('SRT-01 · Default sort loads products consistently', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');
            const ids1 = await collectProductIds(page);

            await page.reload();
            await page.waitForLoadState('networkidle');
            const ids2 = await collectProductIds(page);

            expect(ids1.slice(0, 5)).toEqual(ids2.slice(0, 5));
        });

        test('SRT-02 · Sort: Price low to high — first product cheapest', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');
            await page.locator(SEL.sortDropdown).selectOption({ label: /price.*low/i });
            await page.waitForLoadState('networkidle');
            const count = await productCount(page);
            expect(count).toBeGreaterThan(0);
            // Verify order — collect prices and check ascending
            const prices = await page.locator(SEL.productCard).evaluateAll((els) =>
                els.map((el) => {
                    const txt = el.querySelector('[class*="price"], [data-price]')?.textContent || '0';
                    return parseFloat(txt.replace(/[^0-9.]/g, '')) || 0;
                })
            );
            const sorted = [...prices].sort((a, b) => a - b);
            expect(prices.slice(0, 5)).toEqual(sorted.slice(0, 5));
        });

        test('SRT-03 · Sort: Price high to low — first product most expensive', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');
            await page.locator(SEL.sortDropdown).selectOption({ label: /price.*high/i });
            await page.waitForLoadState('networkidle');
            const prices = await page.locator(SEL.productCard).evaluateAll((els) =>
                els.map((el) => {
                    const txt = el.querySelector('[class*="price"], [data-price]')?.textContent || '0';
                    return parseFloat(txt.replace(/[^0-9.]/g, '')) || 0;
                })
            );
            const sorted = [...prices].sort((a, b) => b - a);
            expect(prices.slice(0, 5)).toEqual(sorted.slice(0, 5));
        });

        test('SRT-04 · Sort: Newest first', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');
            await page.locator(SEL.sortDropdown).selectOption({ label: /new/i });
            await page.waitForLoadState('networkidle');
            const count = await productCount(page);
            expect(count).toBeGreaterThan(0);
        });

        test('SRT-05 · Sort: Highest rated', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');
            await page.locator(SEL.sortDropdown).selectOption({ label: /rating|rated/i });
            await page.waitForLoadState('networkidle');
            const count = await productCount(page);
            expect(count).toBeGreaterThan(0);
        });

        test('SRT-06 · Sort order maintained after scroll loads more', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');
            await page.locator(SEL.sortDropdown).selectOption({ label: /price.*low/i });
            await page.waitForLoadState('networkidle');

            const priceBefore = await page.locator(SEL.productCard).first().evaluate((el) => {
                const txt = el.querySelector('[class*="price"], [data-price]')?.textContent || '0';
                return parseFloat(txt.replace(/[^0-9.]/g, '')) || 0;
            });

            await scrollToBottom(page);
            await page.waitForTimeout(1500);

            // Last loaded product should cost >= first product (ascending)
            const allPrices = await page.locator(SEL.productCard).evaluateAll((els) =>
                els.map((el) => {
                    const txt = el.querySelector('[class*="price"], [data-price]')?.textContent || '0';
                    return parseFloat(txt.replace(/[^0-9.]/g, '')) || 0;
                })
            );
            const lastPrice = allPrices[allPrices.length - 1];
            expect(lastPrice).toBeGreaterThanOrEqual(priceBefore);
        });

        test('SRT-07 · Sort resets scroll to top', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');
            await page.evaluate(() => window.scrollTo(0, 1500));

            await page.locator(SEL.sortDropdown).selectOption({ index: 1 });
            await page.waitForLoadState('networkidle');

            const scrollY = await page.evaluate(() => window.scrollY);
            expect(scrollY).toBeLessThan(200);
        });

        test('SRT-08 · Sort + filter combined', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');

            await page.locator(SEL.filterOption('nike')).first().click();
            await page.waitForLoadState('networkidle');

            await page.locator(SEL.sortDropdown).selectOption({ label: /price.*low/i });
            await page.waitForLoadState('networkidle');

            const count = await productCount(page);
            expect(count).toBeGreaterThan(0);
        });

    });

    // ── FAST SHIPPING TOGGLE ───────────────────────────────────────────────────

    test.describe('FST — Fast Shipping toggle', () => {

        test('FST-01 · Toggle ON shows only fast-ship products', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');
            const before = await productCount(page);

            await page.locator(SEL.fastShippingToggle).click();
            await page.waitForLoadState('networkidle');

            const after = await productCount(page);
            expect(after).toBeGreaterThan(0);
            expect(after).toBeLessThanOrEqual(before);
        });

        test('FST-02 · Toggle OFF restores full product set', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');
            const full = await productCount(page);

            await page.locator(SEL.fastShippingToggle).click();
            await page.waitForLoadState('networkidle');

            await page.locator(SEL.fastShippingToggle).click();
            await page.waitForLoadState('networkidle');

            const restored = await productCount(page);
            expect(restored).toBe(full);
        });

        test('FST-03 · Fast Shipping + filter combined', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');

            await page.locator(SEL.fastShippingToggle).click();
            await page.waitForLoadState('networkidle');

            await page.locator(SEL.filterOption('nike')).first().click();
            await page.waitForLoadState('networkidle');

            const count = await productCount(page);
            expect(count).toBeGreaterThanOrEqual(0);
        });

        test('FST-04 · Fast Shipping + sort combined', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');

            await page.locator(SEL.fastShippingToggle).click();
            await page.waitForLoadState('networkidle');

            await page.locator(SEL.sortDropdown).selectOption({ label: /price.*low/i });
            await page.waitForLoadState('networkidle');

            const count = await productCount(page);
            expect(count).toBeGreaterThan(0);
        });

        test('FST-05 · Fast Shipping toggle persists after scrolling more products', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');

            await page.locator(SEL.fastShippingToggle).click();
            await page.waitForLoadState('networkidle');
            const before = await productCount(page);

            await scrollToBottom(page);
            await waitForMoreProducts(page, before).catch(() => { });

            // Toggle should still be ON (checked state)
            const isChecked = await page.locator(`${SEL.fastShippingToggle} input, input[type=checkbox]`).first().isChecked().catch(() => true);
            expect(isChecked).toBe(true);
        });

        test('FST-06 · No results with Fast Shipping shows empty state', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');

            // Combine restrictive filters first, then toggle
            await page.locator(SEL.filterOption('nonexistent_brand_xyz')).first().click().catch(() => { });
            await page.locator(SEL.fastShippingToggle).click().catch(() => { });
            await page.waitForLoadState('networkidle');

            const count = await productCount(page);
            const hasEmpty = await page.locator(SEL.emptyState).count();
            expect(count === 0 || hasEmpty > 0).toBe(true);
        });

        test('FST-07 · Product count label updates when toggle is ON', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');
            const countBefore = await page.locator(SEL.resultCount).first().textContent();

            await page.locator(SEL.fastShippingToggle).click();
            await page.waitForLoadState('networkidle');
            const countAfter = await page.locator(SEL.resultCount).first().textContent();

            expect(countAfter).not.toBe(countBefore);
        });

    });

    // ── CLEAR ALL ──────────────────────────────────────────────────────────────

    test.describe('CLR — Clear All', () => {

        test('CLR-01 · Clear All removes all active filters', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');

            await page.locator(SEL.filterOption('nike')).first().click();
            await page.waitForLoadState('networkidle');
            await expect(page.locator(SEL.filterChip).first()).toBeVisible();

            await page.locator(SEL.clearAllBtn).click();
            await page.waitForLoadState('networkidle');

            const chips = await page.locator(SEL.filterChip).count();
            expect(chips).toBe(0);
        });

        test('CLR-02 · Clear All resets Fast Shipping toggle', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');

            await page.locator(SEL.fastShippingToggle).click();
            await page.waitForLoadState('networkidle');

            await page.locator(SEL.clearAllBtn).click();
            await page.waitForLoadState('networkidle');

            const isChecked = await page.locator(`${SEL.fastShippingToggle} input, input[type=checkbox]`).first().isChecked().catch(() => false);
            expect(isChecked).toBe(false);
        });

        test('CLR-03 · Clear All restores full product count', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');
            const fullCount = await productCount(page);

            await page.locator(SEL.filterOption('nike')).first().click();
            await page.waitForLoadState('networkidle');

            await page.locator(SEL.clearAllBtn).click();
            await page.waitForLoadState('networkidle');

            const restoredCount = await productCount(page);
            expect(restoredCount).toBe(fullCount);
        });

        test('CLR-04 · Clear All scrolls back to top', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');

            await page.locator(SEL.filterOption('nike')).first().click();
            await page.waitForLoadState('networkidle');
            await page.evaluate(() => window.scrollTo(0, 1500));

            await page.locator(SEL.clearAllBtn).click();
            await page.waitForLoadState('networkidle');

            const scrollY = await page.evaluate(() => window.scrollY);
            expect(scrollY).toBeLessThan(200);
        });

        test('CLR-05 · Clear All button hidden when no filters are active', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');
            const clearAll = page.locator(SEL.clearAllBtn);
            const visible = await clearAll.isVisible().catch(() => false);
            expect(visible).toBe(false);
        });

        test('CLR-06 · Individual filter chip (×) removes only that filter', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');

            await page.locator(SEL.filterOption('nike')).first().click();
            await page.waitForLoadState('networkidle');
            await page.locator(SEL.filterOption('adidas')).first().click();
            await page.waitForLoadState('networkidle');

            const chipsBefore = await page.locator(SEL.filterChip).count();

            // Remove first chip only
            await page.locator(SEL.filterChip).first()
                .locator('button, [aria-label*="remove" i], [aria-label*="close" i]')
                .click();
            await page.waitForLoadState('networkidle');

            const chipsAfter = await page.locator(SEL.filterChip).count();
            expect(chipsAfter).toBe(chipsBefore - 1);
        });

        test('CLR-07 · Clear All resets sort to default', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');
            const defaultIds = await collectProductIds(page);

            await page.locator(SEL.sortDropdown).selectOption({ index: 1 });
            await page.waitForLoadState('networkidle');

            await page.locator(SEL.clearAllBtn).click().catch(() => { });
            await page.waitForLoadState('networkidle');

            const restoredIds = await collectProductIds(page);
            expect(restoredIds.slice(0, 3)).toEqual(defaultIds.slice(0, 3));
        });

    });

});
