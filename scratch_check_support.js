const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.woodenstreet.com/support-form', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const form = page.locator('form.space-y-8').first();
    if (await form.count() === 0) {
      console.log('Form form.space-y-8 not found!');
      return;
    }

    const html = await form.innerHTML();
    console.log('--- Form HTML ---');
    console.log(html);

    console.log('--- Buttons in Form ---');
    const buttons = await form.locator('button, input[type="submit"], [role="button"]').all();
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const tag = await btn.evaluate(el => el.tagName.toLowerCase());
      const type = await btn.getAttribute('type') || '';
      const text = await btn.textContent();
      const outerHtml = await btn.evaluate(el => el.outerHTML);
      console.log(`Button #${i+1}: Tag=${tag}, Type=${type}, Text="${text.trim()}", HTML="${outerHtml}"`);
    }

  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
