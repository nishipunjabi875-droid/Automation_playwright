const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  await page.goto('https://www.woodenstreet.com/furniture-store-kirti-nagar-delhi', { waitUntil: 'load' });
  await page.waitForTimeout(3000);

  // Move mouse away from header
  await page.mouse.move(0, 300);
  await page.waitForTimeout(500);

  console.log('=== BEFORE CLICK ===');
  const allBtns = await page.locator('button:visible').all();
  for (const b of allBtns) {
    const txt = (await b.innerText().catch(() => '')).trim();
    if (txt) console.log(' btn:', txt.substring(0,60));
  }

  // Click Book an Appointment
  const btn = page.locator('button:has-text("Book an Appointment")').first();
  console.log('\nBook an Appointment visible:', await btn.isVisible());
  await btn.scrollIntoViewIfNeeded();
  await btn.click({ force: true });
  console.log('Clicked! Waiting 3s...');
  await page.waitForTimeout(3000);

  // Take screenshot after click
  await page.screenshot({ path: 'results/debug_kirti_after_click.png', fullPage: false });
  console.log('Screenshot saved.');

  console.log('\n=== AFTER CLICK - Forms/Dialogs ===');
  const dialogs = await page.locator('[role="dialog"], .modal, [class*="dialog"], [class*="modal"], [class*="popup"], [class*="overlay"]').all();
  console.log('Dialog-like containers:', dialogs.length);
  for (const d of dialogs) {
    const vis = await d.isVisible().catch(() => false);
    const cls = (await d.getAttribute('class') || '').substring(0, 80);
    const tag = await d.evaluate(el => el.tagName);
    console.log(` [${tag}] visible=${vis} class="${cls}"`);
  }

  const inputs = await page.locator('input:visible, textarea:visible').all();
  console.log('\nVisible inputs after click:', inputs.length);
  for (const i of inputs) {
    const ph = await i.getAttribute('placeholder') || '';
    const name = await i.getAttribute('name') || '';
    const id = await i.getAttribute('id') || '';
    const type = await i.getAttribute('type') || '';
    console.log(` type="${type}" name="${name}" id="${id}" placeholder="${ph}"`);
  }

  const forms = await page.locator('form:visible').all();
  console.log('\nVisible forms:', forms.length);
  for (const f of forms) {
    const cls = (await f.getAttribute('class') || '').substring(0, 80);
    console.log(' form class:', cls);
    const innerInputs = await f.locator('input, textarea').all();
    console.log('  -> inputs inside:', innerInputs.length);
  }

  await browser.close();
})();
