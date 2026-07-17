const { test, expect } = require('@playwright/test');
const fs = require('fs-extra');
const path = require('path');

async function blockAnalytics(page) {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    const shouldBlock = 
      url.includes('facebook.com') || 
      url.includes('doubleclick') ||
      url.includes('google-analytics') ||
      url.includes('googletagmanager') ||
      url.includes('snapchat') ||
      url.includes('tiktok') ||
      url.includes('pinterest');

    if (shouldBlock) {
      route.abort();
    } else {
      route.continue();
    }
  });
}

async function dismissPopups(page) {
  try {
    const selectors = [
      'button[class*="close" i]',
      'button[class*="Close" i]',
      '.close-btn',
      'button:has-text("No thanks")',
      'button:has-text("Skip")'
    ];
    for (const sel of selectors) {
      const el = await page.$(sel);
      if (el && await el.isVisible()) {
        await el.click({ timeout: 1000 }).catch(() => {});
        await page.waitForTimeout(500);
      }
    }
  } catch (e) {}
}

test.describe('Beta WoodenStreet Search Box Audit Suite', () => {

  test('Verify Desktop Search Suggestions Redirection', async ({ page }) => {
    test.setTimeout(60000);
    await blockAnalytics(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    
    await page.goto('https://beta.teamwoodenstreet.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await dismissPopups(page);

    const searchInput = page.locator('header input[placeholder*="Search" i], input[type="search"]').first();
    await searchInput.click();
    await searchInput.fill('sofa');
    await page.waitForTimeout(2000);

    // Get the first suggestion link
    const firstSuggestion = page.locator('.style_searchList__X4Vp7 ul li, [class*="searchList" i] ul li, li:has-text("Sofa")').first();
    await expect(firstSuggestion).toBeVisible({ timeout: 10000 });

    const text = await firstSuggestion.innerText();
    console.log(`Clicking desktop suggestion: "${text.trim()}"`);
    
    await firstSuggestion.click();
    await page.waitForTimeout(4000);
    
    console.log(`Desktop suggestion redirected to: ${page.url()}`);
    expect(page.url()).toContain('beta.teamwoodenstreet.com');
  });

  test('Verify Desktop Enter Key Search Bug', async ({ page }) => {
    test.setTimeout(60000);
    await blockAnalytics(page);
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto('https://beta.teamwoodenstreet.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await dismissPopups(page);

    const searchInput = page.locator('header input[placeholder*="Search" i], input[type="search"]').first();
    await searchInput.click();
    await searchInput.fill('sofa');
    await page.waitForTimeout(1000);

    console.log('Pressing Enter in desktop search box...');
    await searchInput.press('Enter');
    await page.waitForTimeout(4000);

    const finalUrl = page.url();
    console.log(`Desktop Enter redirection URL: ${finalUrl}`);
    
    // Check if it redirected to the live production site instead of keeping the beta domain
    if (finalUrl.includes('www.woodenstreet.com')) {
      console.log('⚠️ CRITICAL BUG DETECTED: Desktop Enter key search redirects to production site!');
    }
    
    expect(finalUrl).toContain('beta.teamwoodenstreet.com');
  });

  test('Verify Mobile Search Results Consistency (e.g. Wardrobe)', async ({ page }) => {
    test.setTimeout(60000);
    await blockAnalytics(page);
    // Emulate iPhone 12 viewport
    await page.setViewportSize({ width: 390, height: 844 });

    // Navigate directly to the search page for "wardrobe"
    const targetUrl = 'https://beta.teamwoodenstreet.com/search?search=wardrobe';
    console.log(`Navigating to mobile search: ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await dismissPopups(page);

    const resultData = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const products = Array.from(document.querySelectorAll('a[href*="/product/"]'));
      return {
        productCount: [...new Set(products.map(p => p.href))].length,
        isZero: bodyText.includes('0 Results') || bodyText.includes('No results')
      };
    });

    console.log(`Mobile Results for "wardrobe": ${resultData.productCount} products. Is zero state displayed? ${resultData.isZero}`);
    
    // It should render products (like desktop which renders 41 wardrobes)
    if (resultData.isZero) {
      console.log('⚠️ CRITICAL BUG DETECTED: Mobile view returns 0 results for "wardrobe" while desktop returns 41!');
    }
    
    expect(resultData.isZero).toBe(false);
  });

});
