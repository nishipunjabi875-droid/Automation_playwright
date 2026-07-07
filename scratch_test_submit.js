const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('request', req => {
    if (req.method() === 'POST') {
      console.log(`[REQ] ${req.method()} ${req.url()}`);
      console.log(`  POST Payload: ${req.postData()}`);
    }
  });

  page.on('response', async res => {
    if (res.request().method() === 'POST') {
      console.log(`[RES] ${res.status()} ${res.url()}`);
      try {
        const text = await res.text();
        console.log(`  Response body: ${text.slice(0, 300)}`);
      } catch {}
    }
  });

  try {
    await page.goto('https://www.woodenstreet.com/support-form', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Fill standard fields
    await page.locator('input[name="fullname"]').fill('Test Auto Support');
    await page.locator('input[name="email"]').fill('test_auto_support@mailinator.com');
    await page.locator('input[name="mobile"]').fill('9876543210');
    await page.locator('textarea[name="notes"]').fill('This is a test feedback message.');

    // Interact with custom dropdown "Reason"
    const dropdownHeader = page.locator('.dropdown-header').first();
    console.log('Clicking dropdown header...');
    await dropdownHeader.click();
    await page.waitForTimeout(1000);

    // Print options inside dropdown list
    const options = await page.locator('.style_ws-dropdown__Kqfb8 li, [class*="dropdown"] li, .style_ws-dropdown__Kqfb8 a, [class*="dropdown"] a, .style_dropdown-menu__tK5Xn div, .style_dropdown-list__tK5Xn div, .dropdown-menu div, .dropdown-list div').all();
    console.log(`Found ${options.length} options:`);
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      const text = await opt.textContent();
      const outerHtml = await opt.evaluate(el => el.outerHTML);
      console.log(`Option #${i+1}: Text="${text.trim()}", HTML="${outerHtml}"`);
    }

    if (options.length > 0) {
      console.log('Selecting option #2...');
      await options[1].click();
      await page.waitForTimeout(1000);
    }

    console.log('Submitting form...');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(5000);

  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
