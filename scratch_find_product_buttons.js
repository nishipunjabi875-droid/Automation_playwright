const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.woodenstreet.com/product/lorenz-3-seater-sofa-cotton-jade-ivory', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, a, [role="button"], span, div'))
        .map(el => el.innerText ? el.innerText.trim().replace(/\n/g, ' ') : '')
        .filter(t => t.length > 0 && t.length < 50);
    });

    const keywords = [/book/i, /visit/i, /unlock/i, /delivery/i, /alert/i, /notify/i, /drop/i, /discount/i, /cart/i, /store/i, /buy/i];
    const matches = {};
    for (const kw of keywords) {
      matches[kw.source] = Array.from(new Set(buttons.filter(t => kw.test(t))));
    }

    console.log('Matches:', JSON.stringify(matches, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
