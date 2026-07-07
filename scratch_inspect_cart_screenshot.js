const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try {
    console.log('Navigating to product page...');
    await page.goto('https://www.woodenstreet.com/product/lorenz-3-seater-sofa-cotton-jade-ivory', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'results/checkout_step1_pdp.png' });

    const atcBtn = page.locator('button:has-text("ADD TO CART"), #button-cart, .add-to-cart-btn, [class*="add-to-cart"]').first();
    console.log('ATC Button visible:', await atcBtn.isVisible());
    if (await atcBtn.isVisible()) {
      await atcBtn.click({ force: true });
      await page.waitForTimeout(4000);
      await page.screenshot({ path: 'results/checkout_step2_after_atc.png' });
      
      console.log('Navigating to cart page...');
      await page.goto('https://www.woodenstreet.com/cart', { waitUntil: 'networkidle' });
      await page.waitForTimeout(4000);
      await page.screenshot({ path: 'results/checkout_step3_cart.png' });
      
      const cartText = await page.evaluate(() => document.body.innerText);
      console.log('Cart page text summary:', cartText.slice(0, 1000));
      
      const placeOrderBtn = page.locator('button:has-text("PLACE ORDER"), button:has-text("Place Order")').first();
      console.log('PLACE ORDER Button visible:', await placeOrderBtn.isVisible());
      if (await placeOrderBtn.isVisible()) {
        await placeOrderBtn.click();
        await page.waitForTimeout(4000);
        await page.screenshot({ path: 'results/checkout_step4_after_place_order.png' });
        console.log('Final URL after PLACE ORDER click:', page.url());
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
