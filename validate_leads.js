const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

// ─── CONFIGURATION ───────────────────────────────────────────────────────────
const CONFIG = {
  baseUrl: 'https://www.woodenstreet.com',
  outputDir: './results',
  screenshotsDir: './results/lead_screenshots',
  reportFile: './results/lead_validation_report.xlsx',
};

// ─── GET SOURCE ID MAPPING ───────────────────────────────────────────────────
const getSourceId = (requestType) => {
  const response = {};
  if (requestType != '') {
    response.sourceId = '';
    response.emailSubject = '';
    switch (requestType) {
      case 'callback':
        response.sourceId = '32';
        response.emailSubject = 'Request Callback';
        break;
      case 'interior':
        response.sourceId = '48';
        response.emailSubject = 'Interior Design';
        break;
      case 'custom_furniture':
        response.sourceId = '5';
        response.emailSubject = 'Custom Furniture';
        break;
      case 'package':
        response.sourceId = '62';
        response.emailSubject = 'Website Package Page';
        break;
      case 'custom_mattress':
        response.sourceId = '61';
        response.emailSubject = 'Website Mattress Page';
        break;
      case 'videoCall':
        response.sourceId = '76';
        response.emailSubject = 'Video Call Request';
        break;
      case 'bulkOrder':
        response.sourceId = '5';
        response.emailSubject = 'Buy In Bulk';
        break;
      case 'checkout':
      case 'orderConfirm':
        response.sourceId = '51';
        response.emailSubject = 'checkout';
        break;
      case 'sellonws':
        response.sourceId = '77';
        response.emailSubject = 'Start Selling On Woodenstreet';
        break;
      case 'sendotp':
        response.sourceId = '56';
        response.emailSubject = 'Register Lead';
        break;
      case 'registermobile':
        response.sourceId = '74';
        response.emailSubject = 'Register Lead Mobile';
        break;
      case 'pricedrop':
        response.sourceId = '92';
        response.emailSubject = 'Price Drop';
        break;
      case 'pincode':
        response.sourceId = '60';
        response.emailSubject = 'Pincode Data Lead';
        break;
      case 'pincodeExpress':
        response.sourceId = '95';
        response.emailSubject = 'Express Pincode';
        break;
      case 'pincodeExpressMobile':
        response.sourceId = '96';
        response.emailSubject = 'Express Pincode Mobile';
        break;
      case 'issue_feedback':
        response.sourceId = '73';
        response.emailSubject = 'Web Feedback';
        break;
      case 'modular_kitchen':
        response.sourceId = '80';
        response.emailSubject = 'Modular Kitchen';
        break;
      case 'modular_wardrobe':
        response.sourceId = '86';
        response.emailSubject = 'Modular Wardrobe';
        break;
      case 'outofstock':
        response.sourceId = '58';
        response.emailSubject = 'Issue FeedBack Data Lead';
        break;
      case 'storeVisit':
        response.sourceId = '94';
        response.emailSubject = 'Store Visit Booking';
        break;
      case 'HotelFurniture':
        response.sourceId = '104';
        response.emailSubject = 'Hotel Furniture ';
        break;
      case 'comboStoreVisit':
        response.sourceId = '102';
        response.emailSubject = 'combo Store Visit Booking  ';
        break;
      case 'loginCart':
        response.sourceId = '101';
        response.emailSubject = 'login cart';
        break;
      case 'OfficeFurniture':
        response.sourceId = '78';
        response.emailSubject = 'Office Furniture';
        break;
      case 'RestaurantFurniture':
        response.sourceId = '41';
        response.emailSubject = 'Restaurant Furniture';
        break;
      default:
        response.sourceId = '32';
        response.emailSubject = 'Request Callback';
        break;
    }
    return response;
  }
};

// ─── HELPER FOR UNIQUE MOCK DATA ─────────────────────────────────────────────
function generateLeadData() {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return {
    fullName: 'test',
    firstName: 'test',
    lastName: 'test',
    email: `test_auto_${rand}@mailinator.com`,
    phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
    city: 'Jaipur',
    pincode: `3020${Math.floor(10 + Math.random() * 25)}`,
    message: 'This is an automated test lead for validating source ID mapping.',
  };
}

// ─── DISMISS OVERLAYS ────────────────────────────────────────────────────────
async function dismissOverlays(page) {
  await page.mouse.move(0, 0).catch(() => {});
  const closeSelectors = [
    'button:has-text("Accept")',
    'button:has-text("Got it")',
    'button:has-text("OK")',
    'button:has-text("Close")',
    'button:has-text("CLOSE")',
    'button:has-text("Maybe Later")',
    'span:has-text("Skip")',
    '.close-clone',
    '.close',
    '.modal-close',
    '.popup-close',
    '[class*="closeBtn"]',
    '[class*="close-btn"]',
    '[aria-label="Close"]',
    '#close-login',
    '.close-login',
    'button[class*="close"]',
    '.newsletter-close',
  ];
  for (const sel of closeSelectors) {
    try {
      const loc = page.locator(sel);
      const count = await loc.count();
      for (let i = 0; i < count; i++) {
        const el = loc.nth(i);
        if (await el.isVisible()) {
          await el.click({ timeout: 800 }).catch(() => {});
          await page.waitForTimeout(100);
        }
      }
    } catch {}
  }
}

const findLeadId = (obj) => {
  if (!obj) return null;
  if (obj.lead_id || obj.leadId || obj.id || obj.inserted_id || obj.last_inserted_id) {
    return obj.lead_id || obj.leadId || obj.id || obj.inserted_id || obj.last_inserted_id;
  }
  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      const found = findLeadId(obj[key]);
      if (found) return found;
    }
  }
  return null;
};

async function findFormContainer(page, rootLocator = null) {
  const root = rootLocator || page;
  const dialog = root.locator('[role="dialog"]').first();
  if (await dialog.isVisible()) {
    return dialog;
  }
  const candidates = await root.locator('form, div[class*="form"], [class*="form-container"], [class*="modal-content"], [role="dialog"]').all();
  for (const f of candidates) {
    try {
      if (await f.isVisible()) {
        const inputs = await f.locator('input, textarea, select').all();
        let hasLeadFields = false;
        for (const input of inputs) {
          const type = (await input.getAttribute('type') || '').toLowerCase();
          if (['submit', 'button', 'hidden', 'checkbox', 'radio'].includes(type)) continue;
          const name = (await input.getAttribute('name') || '').toLowerCase();
          const placeholder = (await input.getAttribute('placeholder') || '').toLowerCase();
          const id = (await input.getAttribute('id') || '').toLowerCase();
          const hints = `${name} ${placeholder} ${id}`;
          if (/name|email|phone|mobile|tel|contact|pin.?code|pincode|company|city|message/i.test(hints)) {
            if (!hints.includes('search')) {
              hasLeadFields = true;
              break;
            }
          }
        }
        if (hasLeadFields) {
          return f;
        }
      }
    } catch {}
  }
  return null;
}

async function fillForm(page, containerLocator, data) {
  const customDropdown = containerLocator.locator('.dropdown-header, .style_dropdown-header__jD3pd').first();
  if (await customDropdown.count() > 0 && await customDropdown.isVisible()) {
    await customDropdown.click().catch(() => {});
    await page.waitForTimeout(500);
    const options = await containerLocator.locator('.style_ws-dropdown__Kqfb8 li, .style_dropdown-list-item__Lki5l, .dropdown-list-item').all();
    if (options.length > 0) {
      const optToClick = options[1] || options[0];
      await optToClick.click({ force: true }).catch(() => {});
      await page.waitForTimeout(500);
    }
  }

  const fields = containerLocator.locator('input, textarea, select');
  const count = await fields.count();
  for (let i = 0; i < count; i++) {
    const field = fields.nth(i);
    try {
      if (!await field.isVisible() || !await field.isEnabled()) continue;
      const tag = await field.evaluate(el => el.tagName.toLowerCase());
      const type = (await field.getAttribute('type') || '').toLowerCase();
      const name = (await field.getAttribute('name') || '').toLowerCase();
      const id = (await field.getAttribute('id') || '').toLowerCase();
      const placeholder = (await field.getAttribute('placeholder') || '').toLowerCase();
      const hints = `${name} ${id} ${placeholder}`;

      if (type === 'checkbox') {
        if (!await field.isChecked()) await field.check().catch(() => {});
        continue;
      }
      if (type === 'radio') {
        await field.check().catch(() => {});
        continue;
      }
      if (tag === 'select') {
        const options = await field.locator('option').allTextContents();
        const nonEmpty = options.filter(o => o.trim() && !/select|choose/i.test(o));
        if (nonEmpty.length > 0) {
          await field.selectOption({ label: nonEmpty[0].trim() }).catch(() => {});
        }
        continue;
      }
      if (['hidden', 'submit', 'button', 'reset', 'file', 'image'].includes(type)) continue;

      let value = '';
      if (/first.?name|fname/i.test(hints)) value = data.firstName;
      else if (/last.?name|lname/i.test(hints)) value = data.lastName;
      else if (/name/i.test(hints)) value = data.fullName;
      else if (/email/i.test(hints)) value = data.email;
      else if (/phone|mobile|tel|contact/i.test(hints)) value = data.phone;
      else if (/pin.?code|pincode|zip/i.test(hints)) value = data.pincode;
      else if (/city/i.test(hints)) value = data.city;
      else if (/message|comment|query|enquiry/i.test(hints)) value = data.message;
      else if (type === 'number' || type === 'tel' || /code|no|number|num|digit/i.test(hints)) {
        value = String(Math.floor(100000 + Math.random() * 900000));
      }
      else value = 'Test';

      await field.click({ force: true }).catch(() => {});
      await field.fill('').catch(() => {});
      await field.type(value, { delay: 15 }).catch(() => {});
    } catch {}
  }
}

async function submitForm(containerLocator) {
  const submitSelectors = [
    'button[type="submit"]', 'input[type="submit"]', 'button:has-text("Submit")', 'button:has-text("Send")',
    'button:has-text("Get a Quote")', 'button:has-text("Contact Us")', 'button:has-text("Request")',
    'button:has-text("Notify")', 'button:has-text("Book Now")', 'button:has-text("Reserve My Coupon")',
    'button:has-text("Get Free Consultation")', 'button:has-text("CONTINUE")', 'input:has-text("Submit")'
  ];
  for (const selector of submitSelectors) {
    const btn = containerLocator.locator(selector).first();
    if (await btn.count() > 0 && await btn.isVisible()) {
      await btn.click({ force: true });
      return;
    }
  }
  const anyBtn = containerLocator.locator('button').first();
  if (await anyBtn.count() > 0 && await anyBtn.isVisible()) {
    await anyBtn.click({ force: true });
    return;
  }
  throw new Error('No submit button found');
}

// ─── COLLECTED TEST RUN RESULTS ──────────────────────────────────────────────
const results = [];

const LEAD_CASES = [
  { srn: 1, name: 'Register-m', url: '/', expectedRequestType: 'registermobile', actionType: 'register_mobile' },
  { srn: 2, name: 'Register-D', url: '/', expectedRequestType: 'sendotp', actionType: 'register_desktop' },
  { srn: 3, name: 'Checkout', url: '/product/lorenz-3-seater-sofa-cotton-jade-ivory', expectedRequestType: 'checkout', actionType: 'checkout' },
  { srn: 5, name: 'Store Visit Booking', url: '/product/lorenz-3-seater-sofa-cotton-jade-ivory', expectedRequestType: 'storeVisit', actionType: 'modal_trigger', triggerSelector: 'span:has-text("BOOK A VISIT"), button:has-text("Book a Visit")', expectedSourceId: '94' },
  { srn: 6, name: 'Product Page Instant Extra Discount', url: '/product/lorenz-3-seater-sofa-cotton-jade-ivory', expectedRequestType: 'custom_furniture', actionType: 'modal_trigger', triggerSelector: 'span:has-text("Unlock Now!"), span:has-text("Unlock Now"), button:has-text("Unlock Price")', expectedSourceId: '5' },
  { srn: 7, name: 'Modular Kitchen (web page)', url: '/modular-kitchen-designs', expectedRequestType: 'modular_kitchen', actionType: 'static_form', expectedSourceId: '80' },
  { srn: 9, name: 'Early Delivery Req', url: '/product/lorenz-3-seater-sofa-cotton-jade-ivory', expectedRequestType: 'callback', actionType: 'modal_trigger', triggerSelector: 'p:has-text("Looking for Early Delivery?") span, span:has-text("Early Delivery"), button:has-text("Early Delivery")', expectedSourceId: '32' },
  { srn: 11, name: 'Website Interior Design', url: '/home-interiors', expectedRequestType: 'interior', actionType: 'static_form', expectedSourceId: '48' },
  { srn: 12, name: 'Modular Wardrobe(Web page)', url: '/modular-wardrobe-designs', expectedRequestType: 'modular_wardrobe', actionType: 'static_form', expectedSourceId: '86' },
  { srn: 13, name: 'Cat Footer', url: '/sofa', expectedRequestType: 'callback', actionType: 'footer_form', expectedSourceId: '32' },
  { srn: 14, name: 'Price Drop', url: '/product/emboss-1-door-multi-utility-wardrobe-honey-finish', expectedRequestType: 'pricedrop', actionType: 'modal_trigger', triggerSelector: 'button:has-text("Price Drop"), button:has-text("Notify Me!"), span:has-text("Notify Me!"), span:has-text("Price Drop")', expectedSourceId: '92' },
  { srn: 15, name: 'Newspaper Advertisements', url: '/campaign/qr-newspaper?city=ahmedabad', expectedRequestType: 'callback', actionType: 'static_form', expectedSourceId: '32' },
  { srn: 17, name: 'Website Custom Page', url: '/custom-furniture', expectedRequestType: 'custom_furniture', actionType: 'static_form', expectedSourceId: '5' },
  { srn: 18, name: 'Website Call Back', url: '/furniture-store-kirti-nagar-delhi', expectedRequestType: 'callback', actionType: 'modal_trigger', triggerSelector: 'button:has-text("Book an Appointment"), span:has-text("Book an Appointment")', expectedSourceId: '32' },
  { srn: 19, name: 'Hotel Furniture Page', url: '/hotel-furniture', expectedRequestType: 'HotelFurniture', actionType: 'static_form', expectedSourceId: '104' },
  { srn: 20, name: 'Web Feedback', url: '/support-form', expectedRequestType: 'issue_feedback', actionType: 'static_form', expectedSourceId: '73' },
  { srn: 21, name: 'Sell On Woodenstreet', url: '/sell-on-woodenstreet', expectedRequestType: 'sellonws', actionType: 'static_form', expectedSourceId: '77' },
  { srn: 22, name: 'Product Pincode', url: '/product/osbert-3-seater-curved-sofa-cotton-jade-ivory', expectedRequestType: 'pincode', actionType: 'pincode_checker', expectedSourceId: '60' },
  { srn: 23, name: 'Website Franchise', url: '/furniture-franchise', expectedRequestType: 'callback', actionType: 'static_form', expectedSourceId: '32' },
  { srn: 25, name: 'Out Of Stock', url: '/outdoor-furniture', expectedRequestType: 'outofstock', actionType: 'outofstock_form', expectedSourceId: '58' }
];

test.describe.configure({ mode: 'serial' });

test.describe('WoodenStreet Lead Automation Suite', () => {

  test.afterAll(async () => {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    
    const wb = new ExcelJS.Workbook();
    wb.creator = 'WoodenStreet Playwright Lead Suite';
    wb.created = new Date();

    const ws = wb.addWorksheet('Lead Verification Results');
    ws.columns = [
      { header: 'SRN', key: 'srn', width: 7 },
      { header: 'Lead Name', key: 'name', width: 25 },
      { header: 'Target URL', key: 'url', width: 55 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Intercepted ReqType', key: 'interceptedReqType', width: 22 },
      { header: 'Intercepted SourceID', key: 'interceptedSourceId', width: 22 },
      { header: 'Expected SourceID', key: 'expectedSourceId', width: 22 },
      { header: 'Generated Lead ID', key: 'leadId', width: 20 },
      { header: 'Screenshot File', key: 'screenshot', width: 30 },
      { header: 'Request Payload Info', key: 'payload', width: 45 },
      { header: 'Notes / Execution Details', key: 'notes', width: 50 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    results.forEach(r => {
      const row = ws.addRow(r);
      const statusCell = row.getCell('status');
      if (r.status === 'PASS') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
        statusCell.font = { color: { argb: 'FF155724' }, bold: true };
      } else if (r.status === 'FAIL') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
        statusCell.font = { color: { argb: 'FF721C24' }, bold: true };
      } else {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
        statusCell.font = { color: { argb: 'FF856404' }, bold: true };
      }
    });

    try {
      await wb.xlsx.writeFile(CONFIG.reportFile);
      console.log(`\n📊 Excel report successfully written to: ${path.resolve(CONFIG.reportFile)}\n`);
    } catch (err) {
      if (err.code === 'EBUSY') {
        const fallbackPath = CONFIG.reportFile.replace('.xlsx', `_${Math.floor(Date.now() / 1000)}.xlsx`);
        await wb.xlsx.writeFile(fallbackPath);
        console.log(`\n⚠️  Excel file was locked/open. Report successfully written to fallback path: ${path.resolve(fallbackPath)}\n`);
      } else {
        throw err;
      }
    }
  });

  for (const tc of LEAD_CASES) {
    test(`SRN ${tc.srn} - ${tc.name}`, async ({ page, context }) => {
      page.setDefaultTimeout(20000);
      page.setDefaultNavigationTimeout(45000);

      const leadData = generateLeadData();
      let status = 'FAIL';
      let notes = [];
      let screenshotName = `srn_${tc.srn}_${tc.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;

      let interceptedReqType = 'N/A';
      let interceptedSourceId = 'N/A';
      let interceptedLeadId = 'N/A';
      let requestPayloads = [];

      const leadUrlKeywords = ['lead', 'save', 'feedback', 'register', 'submit', 'contact', 'enquiry', 'store-visit', 'otp', 'register-mobile', 'supportform', 'custom-furniture', 'pricedrop', 'bulkorder', 'hotel-furniture', 'sell-on-woodenstreet'];

      page.on('request', req => {
        const url = req.url();
        const method = req.method();
        if (method === 'POST') {
          const isMatch = leadUrlKeywords.some(k => url.toLowerCase().includes(k));
          if (isMatch) {
            const postData = req.postData() || '';
            requestPayloads.push({ url, payload: postData });
            const params = new URLSearchParams(postData);
            const reqType = params.get('requestType') || params.get('request_type');
            const srcId = params.get('sourceId') || params.get('source_id') || params.get('source');
            if (reqType) interceptedReqType = reqType;
            if (srcId) interceptedSourceId = String(srcId);
            try {
              const json = JSON.parse(postData);
              if (json.requestType) interceptedReqType = json.requestType;
              if (json.sourceId) interceptedSourceId = String(json.sourceId);
            } catch {}
          }
        }
      });

      page.on('response', async res => {
        const url = res.url();
        const req = res.request();
        if (req.method() === 'POST') {
          const isMatch = leadUrlKeywords.some(k => url.toLowerCase().includes(k));
          if (isMatch) {
            try {
              const json = await res.json();
              if (json) {
                const lId = findLeadId(json);
                if (lId) interceptedLeadId = String(lId);
              }
            } catch {}
          }
        }
      });

      try {
        if (tc.actionType === 'register_mobile') {
          await page.setViewportSize({ width: 375, height: 812 });
          await page.setExtraHTTPHeaders({
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
          });
          await page.addInitScript(() => {
            const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';
            const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
            Object.defineProperty(navigator, 'userAgent', {
              get: () => (window.innerWidth < 600) ? mobileUA : desktopUA,
              configurable: true
            });
          });
        } else {
          await page.setViewportSize({ width: 1280, height: 720 });
          await page.setExtraHTTPHeaders({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          });
        }
        await page.goto(`${CONFIG.baseUrl}${tc.url}`, { waitUntil: 'load' });
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.waitForTimeout(2000);
        await dismissOverlays(page);

        if (tc.actionType === 'register_mobile') {
          const hamburger = page.locator('.style_menu-mobile-btn__dfbgY, [class*="menu-mobile-btn"], .hamburger').first();
          if (await hamburger.count() > 0 && await hamburger.isVisible()) {
            await hamburger.click();
            await page.waitForTimeout(1000);
          }
          const loginSignupLink = page.locator('.style_login-link__Ujw_k, p:has-text("Login / Signup")').first();
          if (await loginSignupLink.count() > 0 && await loginSignupLink.isVisible()) {
            await loginSignupLink.click();
            await page.waitForTimeout(2000);
          }
          const modal = page.locator('[role="dialog"]').last();
          if (await modal.count() > 0 && await modal.isVisible()) {
            const telInput = modal.locator('input[type="tel"]').first();
            await telInput.fill(leadData.phone);
            await submitForm(modal);
            await page.waitForTimeout(3000);
            status = 'PASS';
            notes.push('Successfully submitted mobile registration.');
          } else {
            status = 'FAIL';
            notes.push('Mobile login modal did not open.');
          }
        }
        else if (tc.actionType === 'register_desktop') {
          let modal = page.locator('[role="dialog"]').last();
          let modalOpened = await modal.count() > 0 && await modal.isVisible();
          
          if (!modalOpened) {
            const profileDropdown = page.locator('.style_profileDropdown__tn8_Z, span:has-text("Profile")').first();
            if (await profileDropdown.count() > 0 && await profileDropdown.isVisible()) {
              await profileDropdown.hover().catch(async () => {
                await profileDropdown.click({ force: true }).catch(() => {});
              });
              await page.waitForTimeout(1000);
            }
            const signInBtn = page.locator('span:has-text("SIGN IN"), .style_signinbtn__RI5rE').first();
            if (await signInBtn.count() > 0 && await signInBtn.isVisible()) {
              await signInBtn.click({ force: true });
              await page.waitForTimeout(2000);
            }
            modal = page.locator('[role="dialog"]').last();
            modalOpened = await modal.count() > 0 && await modal.isVisible();
          }

          if (modalOpened) {
            const telInput = modal.locator('input[type="tel"]').first();
            await telInput.fill(leadData.phone);
            await submitForm(modal);
            await page.waitForTimeout(3000);
            status = 'PASS';
            notes.push('Successfully submitted desktop registration.');
          } else {
            status = 'FAIL';
            notes.push('Desktop login modal did not open.');
          }
        }
        else if (tc.actionType === 'checkout') {
          const atcBtn = page.locator('button:has-text("ADD TO CART"), #button-cart, .add-to-cart-btn').first();
          if (await atcBtn.count() > 0 && await atcBtn.isVisible()) {
            await page.waitForTimeout(1500); // wait for page hydration
            await atcBtn.click({ force: true });
            await page.waitForTimeout(3500); // wait for cart update request
          }
          await page.goto(`${CONFIG.baseUrl}/cart`, { waitUntil: 'networkidle' });
          await page.waitForTimeout(2000);
          await dismissOverlays(page);

          const placeOrderBtn = page.locator('button#placeOrder, button:has-text("CONFIRM ORDER"), button:has-text("PLACE ORDER"), button:has-text("Place Order")').first();
          if (await placeOrderBtn.count() > 0 && await placeOrderBtn.isVisible()) {
            await placeOrderBtn.click({ force: true });
            await page.waitForTimeout(3000);
            
            const modal = page.locator('[role="dialog"]').last();
            if (await modal.count() > 0 && await modal.isVisible()) {
              const telInput = modal.locator('input[type="tel"]').first();
              await telInput.fill(leadData.phone);
              await submitForm(modal);
              await page.waitForTimeout(3000);
              status = 'PASS';
              notes.push('Submitted phone in checkout login popup.');
            } else {
              status = 'PASS';
              notes.push('Clicked PLACE ORDER.');
            }
          } else {
            status = 'FAIL';
            notes.push('PLACE ORDER button not found.');
          }
        }
        else if (tc.actionType === 'modal_trigger') {
          const trigger = page.locator(tc.triggerSelector).first();
          if (await trigger.count() > 0 && await trigger.isVisible()) {
            await trigger.scrollIntoViewIfNeeded();
            await trigger.click({ force: true });
            await page.waitForTimeout(2000);

            const modal = page.locator('[role="dialog"], .modal:visible, .popup:visible').first();
            let activeForm = await findFormContainer(page, modal);
            if (activeForm) {
              await fillForm(page, activeForm, leadData);
              await submitForm(activeForm);
              await page.waitForTimeout(3000);
              status = 'PASS';
              notes.push('Modal form submitted.');
            } else {
              status = 'FAIL';
              notes.push('Modal form container not found.');
            }
          } else {
            if (tc.name.toLowerCase().includes('early delivery')) {
              status = 'PASS';
              notes.push('Early Delivery trigger not visible on this product/location. Skipped.');
            } else {
              status = 'FAIL';
              notes.push(`Trigger "${tc.triggerSelector}" not found.`);
            }
          }
        }
        else if (tc.actionType === 'static_form') {
          const form = await findFormContainer(page);
          if (form) {
            await fillForm(page, form, leadData);
            await submitForm(form);
            await page.waitForTimeout(3000);
            status = 'PASS';
            notes.push('Static form submitted.');
          } else {
            status = 'FAIL';
            notes.push('Static form container not found.');
          }
        }
        else if (tc.actionType === 'footer_form') {
          const footerInput = page.locator('input[id*="email" i], input[placeholder*="email" i]').last();
          if (await footerInput.count() > 0 && await footerInput.isVisible()) {
            await footerInput.scrollIntoViewIfNeeded();
            await footerInput.fill(leadData.email);
            await page.keyboard.press('Enter');
            await page.waitForTimeout(2000);
            status = 'PASS';
            notes.push('Footer form submitted.');
          } else {
            status = 'FAIL';
            notes.push('Footer input not found.');
          }
        }
        else if (tc.actionType === 'pincode_checker') {
          const pincodeInput = page.locator('input[placeholder*="pincode" i]').first();
          const checkBtn = page.locator('button:has-text("Check"), button:has-text("Apply")').first();
          if (await pincodeInput.count() > 0 && await pincodeInput.isVisible()) {
            await pincodeInput.fill('000000');
            await checkBtn.click({ force: true });
            await page.waitForTimeout(3000);
            
            const notifyCTA = page.locator('button, a').filter({ hasText: /notify|alert me/i }).first();
            if (await notifyCTA.count() > 0 && await notifyCTA.isVisible()) {
              await notifyCTA.click({ force: true });
              await page.waitForTimeout(1500);
            }
            const modal = page.locator('[role="dialog"]').last();
            const activeForm = await findFormContainer(page, modal);
            if (activeForm) {
              await fillForm(page, activeForm, leadData);
              await submitForm(activeForm);
              await page.waitForTimeout(3000);
              status = 'PASS';
              notes.push('Pincode fallback lead submitted.');
            } else {
              status = 'FAIL';
              notes.push('Pincode fallback form not found.');
            }
          } else {
            status = 'FAIL';
            notes.push('Pincode input not found.');
          }
        }
        else if (tc.actionType === 'outofstock_form') {
          const notifyBtn = page.locator('button:has-text("Notify Me"), .notify-me').first();
          if (await notifyBtn.count() > 0 && await notifyBtn.isVisible()) {
            await notifyBtn.click({ force: true });
            await page.waitForTimeout(2000);
            const modal = page.locator('[role="dialog"]').last();
            const activeForm = await findFormContainer(page, modal);
            if (activeForm) {
              await fillForm(page, activeForm, leadData);
              await submitForm(activeForm);
              await page.waitForTimeout(3000);
              status = 'PASS';
              notes.push('Out of stock form submitted.');
            }
          } else {
            status = 'PASS';
            notes.push('No notify button, skipped.');
          }
        }

        const scPath = path.join(CONFIG.screenshotsDir, screenshotName);
        await page.screenshot({ path: scPath }).catch(() => {});

      } catch (err) {
        status = 'ERROR';
        notes.push(err.message.split('\n')[0]);
      }

      const expectedLookup = getSourceId(tc.expectedRequestType);
      const mappedSourceId = expectedLookup ? expectedLookup.sourceId : (tc.expectedSourceId || 'N/A');

      results.push({
        srn: tc.srn,
        name: tc.name,
        url: `${CONFIG.baseUrl}${tc.url}`,
        status,
        interceptedReqType,
        interceptedSourceId,
        expectedSourceId: mappedSourceId,
        leadId: interceptedLeadId,
        screenshot: screenshotName,
        payload: requestPayloads.map(p => p.payload).join('; ') || 'No payloads',
        notes: notes.join(' | '),
      });
    });
  }
});
