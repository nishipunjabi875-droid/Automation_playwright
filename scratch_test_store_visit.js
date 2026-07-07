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
    await page.goto('https://www.woodenstreet.com/furniture-store-kirti-nagar-delhi', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const btn = page.locator('button:has-text("Book an Appointment"), a:has-text("Book an Appointment")').first();
    await btn.click();
    await page.waitForTimeout(2000);

    const modal = page.locator('[role="dialog"], .modal, .popup, [class*="modal"], [class*="popup"]').first();
    
    // Fill the inputs inside the modal
    await modal.locator('input[placeholder*="Mobile" i]').fill('9876543210');
    await modal.locator('input[placeholder*="Pincode" i]').fill('302001');

    console.log('Submitting store modal...');
    const submitBtn = modal.locator('button, input[type="submit"]').first();
    await submitBtn.click();
    await page.waitForTimeout(5000);

  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
