const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.setViewportSize({ width: 1280, height: 800 });
    
    await page.goto('https://www.woodenstreet.com/get-in-touch', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'results/get_in_touch_debug.png', fullPage: true });
    console.log('Saved get_in_touch_debug.png');

    await page.goto('https://www.woodenstreet.com/furniture-store-kirti-nagar-delhi', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'results/kirti_nagar_debug.png', fullPage: true });
    console.log('Saved kirti_nagar_debug.png');

  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
