const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try {
    await page.goto('https://www.woodenstreet.com/product/lorenz-3-seater-sofa-cotton-jade-ivory', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const atcBtn = page.locator('button:has-text("ADD TO CART"), #button-cart, .add-to-cart-btn, [class*="add-to-cart"]').first();
    if (await atcBtn.isVisible()) {
      await atcBtn.click({ force: true });
      await page.waitForTimeout(3000);
      
      await page.goto('https://www.woodenstreet.com/cart', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      
      const placeOrderBtn = page.locator('button:has-text("PLACE ORDER")').first();
      console.log('PLACE ORDER Button visible:', await placeOrderBtn.isVisible());
      if (await placeOrderBtn.isVisible()) {
        await placeOrderBtn.click();
        await page.waitForTimeout(3000);
        
        console.log('Current URL after clicking PLACE ORDER:', page.url());
        
        // Dump any visible form or modal
        const forms = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('form, [role="dialog"]'))
            .filter(el => el.getBoundingClientRect().height > 0)
            .map(el => ({
              tag: el.tagName,
              id: el.id,
              class: el.className,
              html: el.outerHTML.slice(0, 400)
            }));
        });
        console.log('Visible forms/modals after checkout click:', forms);
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
