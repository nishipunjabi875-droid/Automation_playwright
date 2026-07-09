const { test, expect } = require('@playwright/test');
const fs = require('fs-extra');
const path = require('path');
const config = require('../config/config');
const BasePage = require('../pages/BasePage');
const LoginPage = require('../pages/LoginPage');
const ProductPage = require('../pages/ProductPage');
const CartPage = require('../pages/CartPage');
const CheckoutPage = require('../pages/CheckoutPage');
const LinkCrawler = require('../helpers/crawler');

const DataReader = require('../utils/dataReader');

// Load Test Data dynamically using DataReader (supports json, csv, xlsx)
const pagesData = DataReader.loadPagesSync(config.pageSource);
const productsData = DataReader.loadProductsSync(config.productSource);
const searchesData = DataReader.readJsonSync(path.join(config.paths.testData, 'searches.json'));

// Load Progress for Resuming
let progress = { crawledUrls: [], testedProducts: [] };
const progressFile = process.env.PLAYWRIGHT_PROGRESS_JSON;
if (progressFile && fs.existsSync(progressFile)) {
  try {
    progress = fs.readJsonSync(progressFile);
  } catch (e) {}
}

async function markUrlCompleted(url, isProduct = false) {
  if (!progressFile) return;
  try {
    let current = { crawledUrls: [], testedProducts: [] };
    if (await fs.exists(progressFile)) {
      current = await fs.readJson(progressFile);
    }
    if (isProduct) {
      if (!current.testedProducts.includes(url)) current.testedProducts.push(url);
    } else {
      if (!current.crawledUrls.includes(url)) current.crawledUrls.push(url);
    }
    await fs.writeJson(progressFile, current, { spaces: 2 });
  } catch (e) {}
}

async function saveTempResults(testName, basePage, customData = {}) {
  const tempDir = path.join(config.paths.reports, 'health_temp');
  await fs.ensureDir(tempDir);
  
  const timestamp = Date.now();
  const fileSafeName = testName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filePath = path.join(tempDir, `${fileSafeName}_${timestamp}.json`);
  
  const performance = await basePage.getPerformanceMetrics();
  const seo = await basePage.getSEOData();
  const security = await basePage.getSecurityChecks(customData.headers || {});
  
  const payload = {
    url: basePage.page.url(),
    consoleErrors: basePage.consoleErrors,
    networkErrors: basePage.networkErrors,
    apiLogs: basePage.apiLogs,
    performance,
    seo,
    security,
    brokenLinks: customData.brokenLinks || [],
    brokenImages: customData.brokenImages || [],
    videoIssues: customData.videoIssues || [],
    productValidations: customData.productValidations || []
  };
  
  await fs.writeJson(filePath, payload, { spaces: 2 });
}

test.use({ baseURL: config.baseUrl });

test.describe('Website Modular Health Audit Suite', () => {

  // Setup request routing to optimize tests by blocking heavy social trackers
  test.beforeEach(async ({ page }) => {
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
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. IMPORTANT PAGES AUDIT (Dynamic Data Driven)
  // ───────────────────────────────────────────────────────────────────────────
  for (const pageItem of pagesData) {
    test(`Audit Page: ${pageItem.name}`, async ({ page }) => {
      const pageUrl = pageItem.path;
      
      // Resume Skip check
      if (progress.crawledUrls.includes(pageUrl)) {
        test.skip(true, 'Skipping already processed page to resume');
      }

      console.log(`Auditing Page: ${pageUrl}`);
      const basePage = new BasePage(page);
      
      // Navigate & Capture times
      const navResult = await basePage.navigate(pageUrl);
      
      // Page loaded validation
      expect(navResult.status).toBe(200);
      
      // Let content load completely
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(3500);
      
      // Scroll to trigger lazy loading assets
      await basePage.scrollToBottomAndTop().catch(() => {});
      
      const isBlank = await page.evaluate(() => document.body.innerHTML.trim() === '');
      expect(isBlank).toBe(false);

      // Check Images
      const images = await basePage.getImagesData();
      const brokenImages = images.filter(img => img.isBroken);

      // Scan Links (Sample crawl of first 15 links per page to maintain performance)
      const pageLinks = await basePage.scanPageLinks();
      const crawler = new LinkCrawler(config.baseUrl, 15);
      await crawler.checkLinksInBatch(pageLinks, page.url(), 15);

      // Take standard screenshot
      const ssPath = await basePage.captureScreenshot(`page_${pageItem.name}`);

      // Save Temporary Results
      await saveTempResults(pageItem.name, basePage, {
        headers: navResult.headers,
        brokenImages,
        brokenLinks: crawler.brokenLinks
      });

      // Mark Progress
      await markUrlCompleted(pageUrl);
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. PRODUCT DETAILS PAGE & VIDEOS AUDIT (Dynamic Data Driven)
  // ───────────────────────────────────────────────────────────────────────────
  for (const product of productsData) {
    test(`PDP Validation: ${product.name}`, async ({ page }) => {
      const pageUrl = product.path;

      // Resume Skip check
      if (progress.testedProducts.includes(pageUrl)) {
        test.skip(true, 'Skipping already processed product to resume');
      }

      console.log(`Auditing Product Detail: ${pageUrl}`);
      const productPage = new ProductPage(page);
      
      // Navigate
      const navResult = await productPage.navigate(pageUrl);
      expect(navResult.status).toBe(200);

      // Validate Info
      const pdpDetails = await productPage.validateProductDetails();
      pdpDetails.path = pageUrl;

      // Validate Video playing
      const videoCheck = await productPage.validateVideo(undefined, product.expectedVideo);
      videoCheck.productName = product.name;
      videoCheck.productUrl = page.url();
      videoCheck.expectedVideo = product.expectedVideo;
      
      // Log issues as test outcomes
      if (pdpDetails.issues.length > 0) {
        console.log(`  PDP Warnings on ${product.name}: ${pdpDetails.issues.join(', ')}`);
      }
      
      if (!videoCheck.videoFound) {
        console.log(`  PDP video trigger not visible for product: ${product.name}`);
      } else if (!videoCheck.videoLoaded) {
        console.log(`  PDP video failed validation: ${videoCheck.failureReason}`);
      }

      // If video failed, take screen
      if (videoCheck.videoFound && !videoCheck.videoLoaded) {
        await productPage.captureScreenshot(`video_fail_${product.productId}`);
      }

      // Save Results
      await saveTempResults(`product_${product.productId}`, productPage, {
        headers: navResult.headers,
        productValidations: [pdpDetails],
        videoIssues: videoCheck.videoFound ? [videoCheck] : []
      });

      // Mark Progress
      await markUrlCompleted(pageUrl, true);
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. SEARCH & SUGGESTION SPEED AUDIT
  // ───────────────────────────────────────────────────────────────────────────
  for (const search of searchesData) {
    test(`Search Validate: "${search.query}"`, async ({ page }) => {
      console.log(`Auditing Search Keyword: "${search.query}"`);
      const basePage = new BasePage(page);
      
      await basePage.navigate('/');
      
      // Selectors based on live sites
      const searchInput = page.locator("input[type='search'], input[placeholder*='Search'], input[name='q'], input[name='search']").first();
      await searchInput.waitFor({ state: 'visible', timeout: 5000 });
      
      const startTime = Date.now();
      await searchInput.click();
      await searchInput.fill(search.query);
      
      // Allow key-press event handling and backend query response settle
      await page.waitForTimeout(2000);
      
      // Suggestions Check
      let suggestionsVisible = false;
      const sugDropdown = page.locator('.search-container ul li, .search-suggestions li, ul.search-results li, [role="option"]').first();
      try {
        await sugDropdown.waitFor({ state: 'visible', timeout: 4000 });
        suggestionsVisible = true;
      } catch (e) {
        // Ignore if terms don't trigger suggestions
      }

      expect(suggestionsVisible).toBe(search.expectSuggestions);
      
      // Submit Search
      await searchInput.press('Enter');
      
      // Settle results page load
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(3000);
      
      const searchSpeed = Date.now() - startTime;
      
      // Validate Results Page (resilient text check)
      const bodyText = await page.innerText('body');
      const noResultsFound = bodyText.includes('No Results') || 
                            bodyText.includes('no products') || 
                            bodyText.includes('did not match any products') || 
                            bodyText.includes('No product found') ||
                            bodyText.includes('Not Found') ||
                            bodyText.includes('0 items found') ||
                            bodyText.includes('Sorry, no results');
      
      if (search.expectResults) {
        expect(noResultsFound).toBe(false);
      } else {
        expect(noResultsFound).toBe(true);
      }

      console.log(`  -> Search speed: ${searchSpeed}ms. No Results Page: ${noResultsFound}`);

      // Save
      await saveTempResults(`search_${search.query.replace(/\s+/g, '_')}`, basePage);
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. FUNCTIONAL SMOKE JOURNEY (Add to Cart -> Checkout Details -> Payment Screen)
  // ───────────────────────────────────────────────────────────────────────────
  test('Functional Smoke Journey: Add to Cart and Guest Checkout', async ({ page }) => {
    console.log('Auditing Functional Smoke User Journey...');
    
    // 1. Visit PDP
    const productPath = productsData[0].path;
    const productPage = new ProductPage(page);
    await productPage.navigate(productPath);
    
    // Select variants if visible
    if (await productPage.variantSelector.isVisible({ timeout: 2000 })) {
      const variantOpt = productPage.variantSelector.locator('a, li, button').first();
      await variantOpt.click({ force: true }).catch(() => {});
    }

    // Pincode validation check
    if (await productPage.pincodeInput.isVisible({ timeout: 2000 })) {
      await productPage.pincodeInput.fill('302015');
      if (await productPage.pincodeCheckBtn.isVisible({ timeout: 2000 })) {
        await productPage.pincodeCheckBtn.click({ force: true }).catch(() => {});
      } else {
        await productPage.pincodeInput.press('Enter');
      }
      await page.waitForTimeout(1000);
    }

    // Add to Cart
    await productPage.addToCartBtn.waitFor({ state: 'visible', timeout: 5000 });
    await productPage.addToCartBtn.click();
    await page.waitForTimeout(2000);
    
    // 2. Open Cart
    const cartPage = new CartPage(page);
    await cartPage.openCart();
    
    const count = await cartPage.getCartCount();
    expect(count).toBeGreaterThan(0);

    // Proceed to Checkout
    const clickCheckout = await cartPage.proceedToCheckout();
    expect(clickCheckout).toBe(true);

    // 3. Checkout Guest Details
    const checkoutPage = new CheckoutPage(page);
    await page.waitForTimeout(1000);

    // Dismiss login modals
    await page.keyboard.press('Escape').catch(() => {});
    
    const fillDetails = await checkoutPage.fillShippingDetails({
      email: 'guest_user_health_check@gmail.com',
      phone: '9888888888',
      firstName: 'QA',
      lastName: 'Architect',
      address: 'Industrial Area Phase 2',
      city: 'Jaipur',
      pincode: '302015'
    });
    
    // Apply Promo Code
    const couponRes = await checkoutPage.applyCoupon('WELCOME10');
    console.log(`  -> Applied Coupon "WELCOME10". Result message: ${couponRes.message}`);

    // Verify payment options section is reached
    const hasPayments = await checkoutPage.hasPaymentOptions();
    expect(hasPayments).toBe(true);

    // Save logs
    await saveTempResults('smoke_test_checkout', checkoutPage);
  });

});
