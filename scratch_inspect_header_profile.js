const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.woodenstreet.com/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    console.log('--- Searching for Profile ---');
    const loc = page.locator('text=Profile');
    const count = await loc.count();
    console.log(`Found ${count} elements matching text=Profile`);
    for (let i = 0; i < count; i++) {
      const el = loc.nth(i);
      const tag = await el.evaluate(e => e.tagName.toLowerCase());
      const isVisible = await el.isVisible();
      const parentHtml = await el.evaluate(e => e.parentElement.outerHTML.slice(0, 300));
      console.log(`Element #${i+1}: Tag=${tag}, Visible=${isVisible}`);
      console.log(`  Parent HTML: ${parentHtml}`);
    }

  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
