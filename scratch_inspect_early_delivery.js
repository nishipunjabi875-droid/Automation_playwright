const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.woodenstreet.com/product/osbert-3-seater-curved-sofa-sage-green', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').textContent();
    console.log('Contains "Early"?:', bodyText.toLowerCase().includes('early'));
    console.log('Contains "Fast"?:', bodyText.toLowerCase().includes('fast'));
    console.log('Contains "Express"?:', bodyText.toLowerCase().includes('express'));

    const spans = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('span, button, a'))
        .map(el => el.innerText ? el.innerText.trim().replace(/\n/g, ' ') : '')
        .filter(t => t.toLowerCase().includes('delivery') || t.toLowerCase().includes('assembly'));
    });
    console.log('Delivery/Assembly elements:', Array.from(new Set(spans)));

  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
