const { chromium, devices } = require('playwright');

// Pages that are FAILING - we need to find correct locators
const FAILING_CASES = [
  { srn: 3,  name: 'Checkout',              url: '/product/lorenz-3-seater-sofa-cotton-jade-ivory', note: 'Find ADD TO CART and PLACE ORDER buttons' },
  { srn: 6,  name: 'Unlock Price Modal',    url: '/product/lorenz-3-seater-sofa-cotton-jade-ivory', note: 'Find Unlock Now / Instant Extra Discount CTA' },
  { srn: 7,  name: 'Modular Kitchen',       url: '/modular-kitchen-designs',                        note: 'Find form container' },
  { srn: 9,  name: 'Early Delivery',        url: '/product/osbert-3-seater-curved-sofa-sage-green', note: 'Find Early Delivery button' },
  { srn: 12, name: 'Modular Wardrobe',      url: '/modular-wardrobe-designs',                       note: 'Find form container' },
  { srn: 13, name: 'Cat Footer Callback',   url: '/sofa',                                           note: 'Find footer email/callback input' },
  { srn: 14, name: 'Price Drop',            url: '/product/marriott-1-seater-sofa',                 note: 'Find Price Drop button' },
  { srn: 18, name: 'Website Call Back',     url: '/furniture-store-kirti-nagar-delhi',              note: 'Find Book an Appointment button' },
  { srn: 22, name: 'Product Pincode',       url: '/product/osbert-3-seater-curved-sofa-cotton-jade-ivory', note: 'Find pincode input' },
];

// Mobile case
const MOBILE_CASE = {
  srn: 1, name: 'Register-m (Mobile)', url: '/', note: 'Mobile hamburger → Login/Signup → OTP flow'
};

const BASE = 'https://www.woodenstreet.com';

async function inspectPage(browser, name, url, note, isMobile = false) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`SRN CHECK: ${name}`);
  console.log(`URL: ${BASE}${url}`);
  console.log(`Looking for: ${note}`);
  console.log('='.repeat(70));

  const contextOptions = isMobile
    ? { ...devices['iPhone 12'], locale: 'en-IN' }
    : { viewport: { width: 1280, height: 720 } };

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  try {
    await page.goto(`${BASE}${url}`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // Move mouse away from header (dismiss mega menus)
    await page.mouse.move(0, 0);
    await page.waitForTimeout(500);

    // ── Log ALL visible buttons ──────────────────────────────────────────────
    const buttons = await page.locator('button:visible, a[class*="btn"]:visible, span[class*="btn"]:visible').all();
    console.log(`\n📌 Visible Buttons/CTAs (${buttons.length} found):`);
    for (const btn of buttons.slice(0, 30)) {
      const text = (await btn.innerText().catch(() => '')).trim().replace(/\n/g, ' ').substring(0, 60);
      const cls = (await btn.getAttribute('class') || '').substring(0, 60);
      const tag = await btn.evaluate(el => el.tagName);
      if (text) console.log(`  [${tag}] "${text}" | class: ...${cls.slice(-40)}`);
    }

    // ── Log ALL visible inputs ───────────────────────────────────────────────
    const inputs = await page.locator('input:visible, textarea:visible').all();
    console.log(`\n📌 Visible Inputs (${inputs.length} found):`);
    for (const inp of inputs) {
      const type = await inp.getAttribute('type') || 'text';
      const name = await inp.getAttribute('name') || '';
      const placeholder = await inp.getAttribute('placeholder') || '';
      const id = await inp.getAttribute('id') || '';
      const cls = (await inp.getAttribute('class') || '').substring(0, 50);
      console.log(`  type="${type}" name="${name}" id="${id}" placeholder="${placeholder}" class="...${cls.slice(-30)}"`);
    }

    // ── Log ALL visible forms / form-like containers ─────────────────────────
    const forms = await page.locator('form:visible, div[class*="form"]:visible, [class*="modal"]:visible, [role="dialog"]').all();
    console.log(`\n📌 Visible Form Containers (${forms.length} found):`);
    for (const f of forms.slice(0, 5)) {
      const cls = (await f.getAttribute('class') || '').substring(0, 80);
      const role = await f.getAttribute('role') || '';
      const tag = await f.evaluate(el => el.tagName);
      console.log(`  [${tag}] role="${role}" class="...${cls.slice(-60)}"`);
    }

    // ── Specific checks per page ─────────────────────────────────────────────
    if (isMobile) {
      console.log('\n📱 MOBILE specific checks:');
      const hamburger = page.locator('.style_menu-mobile-btn__dfbgY, [class*="menu-mobile-btn"], [class*="hamburger"], button[aria-label*="menu" i]').first();
      console.log('  Hamburger visible:', await hamburger.isVisible().catch(() => false));
      const loginLink = page.locator('p:has-text("Login / Signup"), [class*="login-link"], a:has-text("Login")').first();
      console.log('  Login link visible:', await loginLink.isVisible().catch(() => false));
    }

    if (url.includes('product')) {
      console.log('\n🛍️ Product page specific:');
      const atc = page.locator('button:has-text("ADD TO CART"), button:has-text("Add to Cart"), #button-cart').first();
      console.log('  ADD TO CART visible:', await atc.isVisible().catch(() => false));
      const earlyDelivery = page.locator('button:has-text("Early Delivery"), span:has-text("Early Delivery"), [class*="early"]').first();
      console.log('  Early Delivery visible:', await earlyDelivery.isVisible().catch(() => false));
      const unlock = page.locator('button:has-text("Unlock"), span:has-text("Unlock"), button:has-text("Extra Discount")').first();
      console.log('  Unlock/Extra Discount visible:', await unlock.isVisible().catch(() => false));
      const priceDrop = page.locator('button:has-text("Price Drop"), span:has-text("Price Drop"), [class*="price-drop"]').first();
      console.log('  Price Drop visible:', await priceDrop.isVisible().catch(() => false));
      const pincode = page.locator('input[placeholder*="pincode" i], input[placeholder*="pin code" i], input[name*="pincode" i]').first();
      console.log('  Pincode input visible:', await pincode.isVisible().catch(() => false));
      const pincodeAttr = await pincode.getAttribute('placeholder').catch(() => 'N/A');
      console.log('  Pincode placeholder:', pincodeAttr);
    }

    if (url.includes('sofa') || url.includes('category')) {
      console.log('\n📋 Category footer form:');
      const emailInputs = await page.locator('input[type="email"], input[placeholder*="email" i]').all();
      console.log(`  Email inputs total: ${emailInputs.length}`);
      for (const e of emailInputs) {
        const vis = await e.isVisible().catch(() => false);
        const ph = await e.getAttribute('placeholder') || '';
        const id = await e.getAttribute('id') || '';
        console.log(`    visible=${vis} placeholder="${ph}" id="${id}"`);
      }
    }

    if (url.includes('kirti')) {
      console.log('\n📅 Kirti Nagar - Book Appointment:');
      const bookBtns = await page.locator('button, a, span').filter({ hasText: /book.*appointment|appointment/i }).all();
      console.log(`  Book Appointment buttons found: ${bookBtns.length}`);
      for (const b of bookBtns) {
        const vis = await b.isVisible().catch(() => false);
        const txt = (await b.innerText().catch(() => '')).trim();
        const cls = (await b.getAttribute('class') || '').substring(0, 60);
        console.log(`    visible=${vis} text="${txt}" class="...${cls.slice(-40)}"`);
      }
    }

    await page.screenshot({ path: `results/debug_srn_${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png` }).catch(() => {});

  } catch (err) {
    console.log(`  ❌ Error: ${err.message.split('\n')[0]}`);
  }

  await context.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // Check mobile Register-m first
  await inspectPage(browser, MOBILE_CASE.name, MOBILE_CASE.url, MOBILE_CASE.note, true);

  // Then check all failing desktop cases
  for (const tc of FAILING_CASES) {
    await inspectPage(browser, tc.name, tc.url, tc.note, false);
  }

  await browser.close();
  console.log('\n✅ Debug inspection complete. Screenshots saved in results/');
})();
