const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.woodenstreet.com/product/lorenz-3-seater-sofa-cotton-jade-ivory', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const items = ['BOOK A VISIT', 'Unlock Now!'];
    for (const text of items) {
      console.log(`\nSearching for element with text "${text}":`);
      const loc = page.locator(`text=${text}`);
      const count = await loc.count();
      console.log(`Count: ${count}`);
      for (let i = 0; i < count; i++) {
        const el = loc.nth(i);
        const tag = await el.evaluate(e => e.tagName.toLowerCase());
        const isVisible = await el.isVisible();
        const html = await el.evaluate(e => e.outerHTML);
        console.log(`  #${i+1}: Tag=${tag}, Visible=${isVisible}, HTML=${html.slice(0, 300)}`);
      }
    }

  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
