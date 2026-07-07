const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.woodenstreet.com/get-in-touch', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    console.log('Final URL after navigation:', page.url());
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
