const { chromium } = require('playwright');

(async () => {
  console.log('Diagnostic: Logging all requests during Web Feedback submission...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('request', req => {
    console.log(`[REQ] ${req.method()} ${req.url()}`);
    if (req.method() === 'POST') {
      console.log(`  POST Payload: ${req.postData()}`);
    }
  });

  page.on('response', async res => {
    console.log(`[RES] ${res.status()} ${res.url()}`);
  });

  try {
    await page.goto('https://www.woodenstreet.com/support-form', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);

    const form = page.locator('form.space-y-8').first();
    const fields = form.locator('input, textarea, select');
    const count = await fields.count();

    const data = {
      fullName: 'Diagnostic Test User',
      email: 'diagnostic@example.com',
      phone: '9876543210',
      message: 'This is a diagnostic message to find the API endpoint.'
    };

    for (let i = 0; i < count; i++) {
      const field = fields.nth(i);
      if (!await field.isVisible() || !await field.isEnabled()) continue;
      const type = (await field.getAttribute('type') || '').toLowerCase();
      const name = (await field.getAttribute('name') || '').toLowerCase();
      
      let val = 'Test value';
      if (/name/i.test(name)) val = data.fullName;
      else if (/email/i.test(name)) val = data.email;
      else if (/phone|mobile/i.test(name)) val = data.phone;
      else if (/message/i.test(name)) val = data.message;

      if (type === 'checkbox' || type === 'radio') continue;
      await field.fill(val).catch(() => {});
    }

    console.log('Submitting form...');
    // Click submit button
    const submitBtn = form.locator('button[type="submit"], input[type="submit"], button:has-text("Submit")').first();
    await submitBtn.click();

    await page.waitForTimeout(5000);
    console.log('Form submission completed.');

  } catch (e) {
    console.error('Error:', e);
  }

  await browser.close();
})();
