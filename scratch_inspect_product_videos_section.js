const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  try {
    const url = 'https://www.woodenstreet.com/product/lorenz-3-seater-sofa-cotton-jade-ivory';
    console.log(`Navigating to Lorenz Sofa PDP: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);
    await page.keyboard.press('Escape'); // dismiss modals
    await page.waitForTimeout(2000);

    console.log('\n--- Inspecting PRODUCT VIDEOS section ---');

    // Find any section containing the text "PRODUCT VIDEOS"
    const headers = page.locator('h2, h3, h4, div, span', { hasText: /^PRODUCT VIDEOS$/i });
    const hCount = await headers.count();
    console.log(`Found ${hCount} headers matching "PRODUCT VIDEOS"`);
    
    for (let i = 0; i < hCount; i++) {
      const html = await headers.nth(i).evaluate(el => el.outerHTML);
      console.log(`Header ${i}: ${html}`);
      
      // Let's inspect the siblings or parent container to find the video tiles
      const parent = headers.nth(i).locator('xpath=..');
      const parentHtml = await parent.evaluate(el => el.outerHTML);
      console.log(`Parent HTML (first 500 chars):\n${parentHtml.substring(0, 500)}\n`);
    }

    // Look for classes containing "video" or "play" in the page body under sections
    // Let's search for elements that look like the play button overlay (the red play button icon in the screenshot)
    console.log('\n--- Searching for the red play button overlays ---');
    const playButtons = page.locator('.isvideo, [class*="play"], [class*="video"]');
    const playCount = await playButtons.count();
    console.log(`Found ${playCount} elements with play/video in class name.`);
    for (let i = 0; i < Math.min(playCount, 25); i++) {
      const html = await playButtons.nth(i).evaluate(el => el.outerHTML);
      const isVisible = await playButtons.nth(i).isVisible();
      console.log(`Element ${i} (Visible: ${isVisible}): Tag=${await playButtons.nth(i).evaluate(el => el.tagName)} | ${html.substring(0, 200)}...`);
    }

    // Capture screenshot to confirm layout state
    await page.screenshot({ path: 'reports/lorenz_product_videos_scan.png', fullPage: true });
    console.log('\nSaved full page screenshot to reports/lorenz_product_videos_scan.png');

  } catch (err) {
    console.error('Scan error:', err.message);
  } finally {
    await browser.close();
  }
})();
