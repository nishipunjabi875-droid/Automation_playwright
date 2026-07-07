const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try {
    await page.goto('https://www.woodenstreet.com/product/lorenz-3-seater-sofa-cotton-jade-ivory', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const atcBtn = page.locator('button:has-text("ADD TO CART"), #button-cart, .add-to-cart-btn, [class*="add-to-cart"]').first();
    console.log('ATC Button visible:', await atcBtn.isVisible());
    if (await atcBtn.isVisible()) {
      await atcBtn.click({ force: true });
      await page.waitForTimeout(3000);
      console.log('Clicked ADD TO CART. Navigating to cart...');
      
      await page.goto('https://www.woodenstreet.com/cart', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      
      const cartHtml = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a, button')).map(el => ({
          tag: el.tagName,
          text: (el.innerText || '').trim(),
          class: el.className
        })).filter(x => x.text.length > 0 && (x.text.toLowerCase().includes('checkout') || x.text.toLowerCase().includes('order') || x.text.toLowerCase().includes('proceed')));
      });
      console.log('Links in Cart page matching checkout:', cartHtml);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
