// ═══════════════════════════════════════════════════════════════════════════════
// woodenstreet.helpers.js
// ───────────────────────────────────────────────────────────────────────────────
// ALL configuration and reusable utilities for WoodenStreet lead form tests.
// Edit this file to:
//   • Change test URLs / pages
//   • Update test data (names, phone, email, etc.)
//   • Add new success / error message patterns
//   • Add new API endpoint patterns to intercept
//   • Tweak selectors for modals, overlays, fields
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 – BASE URLS
// ─────────────────────────────────────────────────────────────────────────────

export const BASE_URL      = 'https://www.woodenstreet.com';
export const BETA_BASE_URL = 'https://beta.teamwoodenstreet.com';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 – FORM PAGE DEFINITIONS
// Add / remove / edit entries here to control which pages are tested.
// ─────────────────────────────────────────────────────────────────────────────

/** Group A – Static contact / lead pages (full-page forms) */
export const STATIC_FORM_PAGES = [
  {
    url:     '/get-in-touch',
    label:   'Contact Us',
    baseUrl: BASE_URL,
  },
  {
    url:     '/support-form',
    label:   'Support Form',
    baseUrl: BASE_URL,
  },
  {
    url:     '/complaint-form',
    label:   'Complaint Form',
    baseUrl: BASE_URL,
  },
  {
    url:     '/furniture-franchise',
    label:   'Franchise Enquiry',
    baseUrl: BASE_URL,
  },
  {
    url:     '/sell-on-woodenstreet',
    label:   'Sell on WoodenStreet',
    baseUrl: BASE_URL,
  },
];

/** Group B – Product page modal forms (triggered by a CTA button) */
export const PRODUCT_PAGE_FORMS = [
  {
    pageUrl:     `${BASE_URL}/product/lorenz-3-seater-sofa-velvet-dark-olive-green`,
    label:       'Book a Visit',
    triggerText: /book\s*a\s*visit/i,
    fields:      ['name', 'phone', 'email', 'city'],
    submitText:  /submit|book|confirm/i,
    successText: /thank you|visit.*booked|we.ll contact/i,
  },
  {
    pageUrl:     `${BASE_URL}/product/lorenz-3-seater-sofa-velvet-dark-olive-green`,
    label:       'Unlock Now (Best Price)',
    triggerText: /unlock\s*(now|best\s*price)/i,
    fields:      ['name', 'phone', 'email'],
    submitText:  /unlock|submit|get price/i,
    successText: /thank you|price.*unlocked|we.ll share/i,
  },
  {
    pageUrl:     `${BASE_URL}/product/lorenz-3-seater-sofa-velvet-dark-olive-green`,
    label:       'Early Delivery',
    triggerText: /early\s*delivery/i,
    fields:      ['name', 'phone', 'pincode'],
    submitText:  /submit|confirm/i,
    successText: /thank you|delivery request|we.ll.*best/i,
  },
];

/** Group C – Store detail page callback form */
export const STORE_PAGE_FORMS = [
  {
    pageUrl:     `${BASE_URL}/furniture-store-miyapur-hyderabad`,
    label:       'Request a Callback',
    triggerText: /request\s*a?\s*call\s*back|call\s*back/i,
    fields:      ['name', 'phone'],
    submitText:  /submit|request|call me/i,
    successText: /thank you|callback|we.ll call/i,
  },
];

/** Group D – Beta: conditional Price Drop Alert modal */
export const BETA_FORMS = [
  {
    pageUrl:     `${BETA_BASE_URL}/product/barriss-bed-with-box-storage-queen-size-columbian-walnut-finish`,
    label:       'Price Drop Alert',
    triggerText: /price\s*drop|notify\s*me/i,
    fields:      ['email', 'phone'],
    submitText:  /notify|alert me|submit/i,
    successText: /thank you|notify|we.ll alert/i,
    conditional: true,   // form is hidden until trigger is clicked
  },
];

/** Group E – Pincode delivery checker + fallback lead form */
export const PINCODE_FORMS = [
  {
    pageUrl:              `${BASE_URL}/product/lorenz-3-seater-sofa-velvet-dark-olive-green`,
    label:                'Delivery Pincode Check',
    // Edit these selectors if WoodenStreet changes the delivery section markup
    pincodeInputSelector: 'input[placeholder*="pincode" i], input[name*="pincode" i], input[id*="pincode" i], .delivery-pincode input',
    checkButtonSelector:  'button:has-text("Check"), button:has-text("Apply"), .check-pincode',
    validPincode:         '110001',   // Delhi – highly stable serviceable hub
    invalidPincode:       '000000',   // Unserviceable – triggers notify-me lead form
    leadFormTrigger:      /notify\s*me|alert\s*me|we.ll notify|not serviceable|please share your contact|request a callback/i,
    fields:               ['name', 'phone', 'email'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 – TEST DATA
// Change names, phone, email etc. here without touching the test logic.
// ─────────────────────────────────────────────────────────────────────────────

export const VALID_LEAD = {
  firstName: 'Priya',
  lastName:  'Sharma',
  fullName:  'Priya Sharma',
  email:     'priya.sharma.test@mailinator.com',
  phone:     '9876543210',   // 10-digit Indian mobile
  mobile:    '9876543210',
  company:   'Acme Interiors Pvt Ltd',
  city:      'Jaipur',
  pincode:   '302001',
  message:   'I am interested in your products. Please contact me at the earliest.',
  orderId:   'WS123456789',
  subject:   'Product Enquiry',
  dropdowns: {
    enquiryType:  ['Product Enquiry', 'Order Issue', 'General', 'Other'],
    city:         ['Jaipur', 'Delhi', 'Mumbai', 'Bangalore', 'Hyderabad'],
    state:        ['Rajasthan', 'Delhi', 'Maharashtra', 'Karnataka'],
    issueType:    ['Delivery', 'Quality', 'Payment', 'Other'],
    investAmount: ['Below 5 Lakh', '5-10 Lakh', 'Above 10 Lakh'],
  },
};

export const INVALID_EMAIL_LEAD = { ...VALID_LEAD, email: 'not-a-valid-email' };
export const INVALID_PHONE_LEAD = { ...VALID_LEAD, phone: 'abc!@#xyz', mobile: 'abc!@#xyz' };
export const SHORT_PHONE_LEAD   = { ...VALID_LEAD, phone: '123',       mobile: '123' };

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 – PATTERNS
// Regex patterns for success messages, validation errors, and API URLs.
// Add new patterns here when WoodenStreet changes their copy.
// ─────────────────────────────────────────────────────────────────────────────

export const SUCCESS_PATTERNS = [
  /thank you/i,
  /we.ll get back/i,
  /we.ll be in touch/i,
  /submitted successfully/i,
  /received your (message|query|complaint|request)/i,
  /our team will contact/i,
  /success/i,
  /sent successfully/i,
  /query has been (submitted|received)/i,
];

export const VALIDATION_ERROR_PATTERNS = [
  /required/i,
  /cannot be (blank|empty)/i,
  /please (enter|provide|fill|select)/i,
  /is (not )?valid/i,
  /invalid (email|phone|number|mobile)/i,
  /must be/i,
  /field is required/i,
  /enter (a )?valid/i,
];

// Glob patterns – any outgoing request matching these is treated as a lead API call
export const LEAD_API_PATTERNS = [
  '**/contact**',
  '**/support**',
  '**/complaint**',
  '**/enquiry**',
  '**/lead**',
  '**/submit**',
  '**/form**',
  '**/save**',
];

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 – SELECTORS
// Edit these if WoodenStreet changes their HTML class names / attributes.
// ─────────────────────────────────────────────────────────────────────────────

/** CSS selector that matches any lead / contact <form> on a static page */
export const FORM_SELECTOR = [
  'form[id*="lead"]',
  'form[id*="contact"]',
  'form[id*="enquiry"]',
  'form[id*="quote"]',
  'form[id*="demo"]',
  'form[id*="trial"]',
  'form[class*="lead"]',
  'form[class*="contact"]',
  'form[action*="contact"]',
  'form[action*="lead"]',
  'form',   // broad fallback
].join(', ');

/** Submit button selectors in priority order */
export const SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'input[type="submit"]',
  'button:has-text("Submit")',
  'button:has-text("Send")',
  'button:has-text("Get a Quote")',
  'button:has-text("Contact Us")',
  'button:has-text("Request")',
  '[role="button"][class*="submit"]',
];

/** Modal / dialog selectors in priority order */
export const MODAL_SELECTORS = [
  '[role="dialog"]',
  '.modal:visible',
  '.popup:visible',
  '[class*="modal"]:visible',
  '[class*="popup"]:visible',
  '[class*="drawer"]:visible',
  '[class*="overlay"]:visible',
  '[class*="leadForm"]:visible',
  '[class*="lead-form"]:visible',
  '[class*="enquiryForm"]:visible',
  '#leadModal',
  '#enquiryModal',
  '#bookVisitModal',
  '#callbackModal',
];

/** Overlay / popup close button selectors */
export const OVERLAY_CLOSE_SELECTORS = [
  'button:has-text("Accept")',
  'button:has-text("Got it")',
  'button:has-text("OK")',
  '[class*="app-banner"] [class*="close"]',
  '[class*="appBanner"] [class*="close"]',
  '[id*="freshchat"] [aria-label="Close"]',
  '#fc_frame [aria-label="Close"]',
  '.modal-close',
  '.popup-close',
  '[class*="closeBtn"]',
  '[class*="close-btn"]',
  'button[class*="close"]',
  '[aria-label="Close"]',
  '[class*="download-app"] [class*="close"]',
  '[class*="downloadApp"] [class*="close"]',
];

/** Per-field CSS selector patterns used by fillModal() and findFieldLocator() */
export const FIELD_SELECTORS = {
  name:      'input[name*="name" i]:not([type="hidden"]), input[placeholder*="name" i], input[id*="name" i]',
  fullname:  'input[name*="name" i]:not([type="hidden"]), input[placeholder*="name" i]',
  firstname: 'input[name*="first" i], input[placeholder*="first" i], input[id*="first" i]',
  lastname:  'input[name*="last" i],  input[placeholder*="last" i],  input[id*="last" i]',
  email:     'input[type="email"], input[name*="email" i], input[placeholder*="email" i]',
  phone:     'input[type="tel"],   input[name*="phone" i], input[placeholder*="phone" i], input[name*="mobile" i], input[placeholder*="mobile" i]',
  mobile:    'input[type="tel"],   input[name*="mobile" i], input[placeholder*="mobile" i], input[name*="phone" i]',
  city:      'input[name*="city" i], input[placeholder*="city" i], select[name*="city" i]',
  pincode:   'input[name*="pincode" i], input[placeholder*="pincode" i], input[name*="zip" i]',
  message:   'textarea, input[name*="message" i], input[placeholder*="message" i]',
  company:   'input[name*="company" i], input[placeholder*="company" i]',
  subject:   'input[name*="subject" i], input[placeholder*="subject" i]',
  orderid:   'input[name*="order" i], input[placeholder*="order" i]',
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 – UTILITY FUNCTIONS
// Pure reusable helpers. No test logic here – only page interaction helpers.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * dismissOverlays()
 * Closes cookie banners, chat widgets, app-download popups, etc.
 * so they don't block CTA buttons.
 */
export async function dismissOverlays(page) {
  for (const sel of OVERLAY_CLOSE_SELECTORS) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible()) {
        await el.click({ timeout: 1_500 }).catch(() => {});
        console.log(`  🚫  Dismissed overlay: ${sel}`);
        await page.waitForTimeout(100);
      }
    } catch { /* overlay not present – continue */ }
  }
}

/**
 * findForms()
 * Returns all lead-form locators visible on the current static page.
 */
export async function findForms(page) {
  await page.waitForSelector(FORM_SELECTOR, { state: 'attached', timeout: 15_000 });
  const forms = page.locator(FORM_SELECTOR);
  const count = await forms.count();
  console.log(`🔍  Found ${count} form(s) on ${page.url()}`);
  return Array.from({ length: count }, (_, i) => forms.nth(i));
}

/**
 * fillForm()
 * Dynamically fills every interactive field inside a static-page formLocator.
 * Detects field intent from name / id / placeholder / aria-label attributes.
 */
export async function fillForm(page, formLocator, data = VALID_LEAD) {
  const fields = formLocator.locator('input, textarea, select');
  const count  = await fields.count();
  console.log(`  ✏️   Filling ${count} field(s)…`);

  for (let i = 0; i < count; i++) {
    const field = fields.nth(i);
    if (!await field.isVisible() || !await field.isEnabled()) continue;

    const tag  = await field.evaluate(el => el.tagName.toLowerCase());
    const type = (await field.getAttribute('type') || '').toLowerCase();

    if (type === 'checkbox') { if (!await field.isChecked()) await field.check(); continue; }
    if (type === 'radio')    { await field.check().catch(() => {}); continue; }
    if (tag  === 'select')   { await _handleDropdown(field, data); continue; }
    if (['hidden','submit','button','reset','file','image'].includes(type)) continue;

    const value = await _mapFieldToData(field, data);
    if (!value || value.startsWith('__')) continue;

    await field.click();
    await field.fill('');
    await field.type(value, { delay: 30 });
    console.log(`    → "${await field.getAttribute('name') || await field.getAttribute('id') || 'field'}" = "${value}"`);
  }
}

/**
 * submitForm()
 * Finds and clicks the submit button within a static-page formLocator.
 */
export async function submitForm(formLocator) {
  for (const selector of SUBMIT_SELECTORS) {
    const btn = formLocator.locator(selector).first();
    if (await btn.count() > 0 && await btn.isVisible()) {
      console.log(`  🚀  Submit: "${await btn.textContent() || selector}"`);
      await btn.click();
      return;
    }
  }
  const anyBtn = formLocator.locator('button').first();
  if (await anyBtn.count() > 0) { await anyBtn.click(); return; }
  throw new Error('No submit button found in form');
}

/**
 * assertSubmissionSuccess()
 * Verifies a success message appears after form submission.
 */
export async function assertSubmissionSuccess(page, formLocator) {
  await page.waitForTimeout(1_500);
  const formText = await formLocator.textContent().catch(() => '');
  const bodyText = await page.locator('body').textContent();
  const combined = `${formText} ${bodyText}`;

  if (SUCCESS_PATTERNS.some(p => p.test(combined))) {
    console.log('  ✅  Success message detected'); return;
  }
  if (!await formLocator.isVisible().catch(() => false)) {
    console.log('  ✅  Form hidden after submission – treating as success'); return;
  }
  await page.screenshot({ path: `test-results/failure-success-${Date.now()}.png` });
  throw new Error(`No success message detected. Snippet: "${combined.slice(0, 300)}"`);
}

/**
 * assertValidationErrors()
 * Verifies at least one validation error is visible after a bad submission.
 */
export async function assertValidationErrors(page, formLocator) {
  await page.waitForTimeout(800);
  const errorSelectors = [
    '[class*="error"]','[class*="invalid"]','[class*="validation"]',
    '[aria-invalid="true"]','.field-error','.form-error',
    'span.error','p.error','[role="alert"]',
  ];

  for (const sel of errorSelectors) {
    const errors = formLocator.locator(sel);
    const count  = await errors.count();
    for (let i = 0; i < count; i++) {
      const text = await errors.nth(i).textContent();
      if (text && VALIDATION_ERROR_PATTERNS.some(p => p.test(text))) {
        console.log(`  ⚠️   Validation error: "${text.trim()}"`); return;
      }
    }
  }
  // Fallback – native HTML5 :invalid state
  if (await formLocator.locator(':invalid').count() > 0) {
    console.log('  ⚠️   Native HTML5 validation triggered'); return;
  }
  await page.screenshot({ path: `test-results/failure-validation-${Date.now()}.png` });
  throw new Error('Expected validation errors but none were detected');
}

/**
 * waitForLeadAPIResponse()
 * Wraps an action, intercepts the first matching lead API call, returns result.
 */
export async function waitForLeadAPIResponse(page, action, timeoutMs = 15_000) {
  let resolved = false;
  const interceptPromise = new Promise(resolve => {
    const handler = async res => {
      if (resolved) return;
      const req = res.request();
      const method = req.method();
      if (!['POST', 'PUT', 'PATCH'].includes(method)) return;

      const url = res.url();
      const match = LEAD_API_PATTERNS.some(p => {
        const rx = p.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
        return new RegExp(rx).test(url);
      });

      if (match) {
        console.log(`  🌐  Intercepted: ${method} ${url}`);
        resolved = true;
        page.off('response', handler);
        try {
          resolve({ url, requestBody: req.postData(), responseStatus: res.status() });
        } catch {
          resolve({ url, requestBody: null, responseStatus: res.status() });
        }
      }
    };
    page.on('response', handler);
  });

  await action();
  return Promise.race([
    interceptPromise,
    new Promise((_, rej) => setTimeout(() => rej(new Error('API timeout')), timeoutMs)),
  ]).catch(err => { console.warn(`  ℹ️   ${err.message}`); return null; });
}

/**
 * screenshotOnFailure()
 * Saves a full-page screenshot. Call from afterEach when test fails.
 */
export async function screenshotOnFailure(page, testName) {
  const safe = testName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const path = `test-results/failure_${safe}_${Date.now()}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`  📸  Screenshot: ${path}`);
  return path;
}

/**
 * clickCTA()
 * Finds and clicks a CTA button / link matching textRegex.
 */
export async function clickCTA(page, textRegex) {
  for (const sel of ['button', 'a', '[role="button"]', '[class*="btn"]', '[class*="cta"]']) {
    const loc = page.locator(sel).filter({ hasText: textRegex });
    for (let i = 0; i < await loc.count(); i++) {
      const el = loc.nth(i);
      if (await el.isVisible({ timeout: 500 })) {
        await el.scrollIntoViewIfNeeded();
        console.log(`  🖱️   CTA: "${(await el.textContent() || '').trim()}"`);
        await el.click(); return;
      }
    }
  }
  const rb = page.getByRole('button', { name: textRegex });
  if (await rb.count() > 0) { await rb.first().scrollIntoViewIfNeeded(); await rb.first().click(); return; }
  throw new Error(`CTA "${textRegex}" not found on ${page.url()}`);
}

/**
 * waitForModal()
 * Waits for a modal / drawer / dialog to appear and returns its Locator.
 */
export async function waitForModal(page, timeoutMs = 10_000) {
  const combined = MODAL_SELECTORS.join(', ');
  await page.waitForSelector(combined, { state: 'visible', timeout: timeoutMs })
    .catch(() => { throw new Error(`No modal appeared within ${timeoutMs}ms on ${page.url()}`); });

  for (const sel of MODAL_SELECTORS) {
    const el = page.locator(sel).first();
    if (await el.count() > 0 && await el.isVisible()) {
      console.log(`  🗂️   Modal: ${sel}`); return el;
    }
  }
  throw new Error('Modal matched but could not be located');
}

/**
 * fillModal()
 * Fills only the declared `fieldNames` inside a modal locator.
 */
export async function fillModal(modalLocator, fieldNames, data) {
  console.log(`  ✏️   Modal fields: [${fieldNames.join(', ')}]`);
  for (const field of fieldNames) {
    const value = _getValueForField(field, data);
    const sel   = FIELD_SELECTORS[field.toLowerCase()];
    if (!sel) { console.warn(`  ⚠️   No selector for "${field}"`); continue; }

    const el = modalLocator.locator(sel).first();
    if (await el.count() === 0 || !await el.isVisible() || !await el.isEnabled()) continue;

    const tag = await el.evaluate(e => e.tagName.toLowerCase());
    if (tag === 'select') {
      const opts      = await el.locator('option').allTextContents();
      const preferred = (data.dropdowns?.[field] || []).map(p => p.toLowerCase());
      const match     = opts.find(o => preferred.includes(o.trim().toLowerCase()));
      const nonEmpty  = opts.filter(o => o.trim() && !/select|choose/i.test(o));
      if (match)           await el.selectOption({ label: match.trim() });
      else if (nonEmpty.length) await el.selectOption({ label: nonEmpty[0].trim() });
    } else {
      await el.click(); await el.fill(''); await el.type(value, { delay: 30 });
    }
    console.log(`    → "${field}" = "${value}"`);
  }
}

/**
 * submitModal()
 * Clicks the submit button inside a modal.
 */
export async function submitModal(modalLocator, submitTextRegex) {
  const typed = modalLocator.locator('button[type="submit"], input[type="submit"]').first();
  if (await typed.count() > 0 && await typed.isVisible()) { await typed.click(); return; }

  const texted = modalLocator.locator('button').filter({ hasText: submitTextRegex }).first();
  if (await texted.count() > 0 && await texted.isVisible()) { await texted.click(); return; }

  const any = modalLocator.locator('button').last();
  if (await any.count() > 0 && await any.isVisible()) { await any.click(); return; }

  throw new Error('No submit button found inside modal');
}

/**
 * assertModalSuccess()
 * Checks for a success state inside a modal or on the broader page.
 */
export async function assertModalSuccess(page, modalLocator, successTextRegex) {
  await page.waitForTimeout(1_500);

  const modalText = await modalLocator.textContent().catch(() => '');
  if (successTextRegex.test(modalText) || SUCCESS_PATTERNS.some(p => p.test(modalText))) {
    console.log('  ✅  Success in modal'); return;
  }
  if (!await modalLocator.isVisible().catch(() => true)) {
    console.log('  ✅  Modal hidden – treating as success'); return;
  }
  const bodyText = await page.locator('body').textContent();
  if (successTextRegex.test(bodyText) || SUCCESS_PATTERNS.some(p => p.test(bodyText))) {
    console.log('  ✅  Success in page body'); return;
  }
  const path = `test-results/failure_modal_${Date.now()}.png`;
  await page.screenshot({ path, fullPage: true });
  throw new Error(`No success state detected. Screenshot: ${path}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7 – PRIVATE HELPERS (used internally, not exported)
// ─────────────────────────────────────────────────────────────────────────────

async function _mapFieldToData(field, data) {
  const type        = (await field.getAttribute('type') || '').toLowerCase();
  const name        = (await field.getAttribute('name') || '').toLowerCase();
  const id          = (await field.getAttribute('id')   || '').toLowerCase();
  const placeholder = (await field.getAttribute('placeholder') || '').toLowerCase();
  const ariaLabel   = (await field.getAttribute('aria-label') || '').toLowerCase();
  const hints       = `${name} ${id} ${placeholder} ${ariaLabel}`;

  if (['hidden','submit','button','reset','file','image'].includes(type)) return null;
  if (['checkbox','radio'].includes(type)) return '__SKIP__';

  if (/first.?name|fname/.test(hints))          return data.firstName;
  if (/last.?name|lname/.test(hints))           return data.lastName;
  if (/full.?name|your.?name|^name/.test(hints))return data.fullName;
  if (/name/.test(hints))                        return data.fullName;
  if (/email/.test(hints))                       return data.email;
  if (/phone|mobile|tel|contact.?no/.test(hints))return data.phone;
  if (/company|organisation|firm/.test(hints))   return data.company;
  if (/city/.test(hints))                        return data.city    || 'Jaipur';
  if (/pincode|pin.?code|zip/.test(hints))       return data.pincode || '302001';
  if (/order.?id|order.?no/.test(hints))         return data.orderId || 'WS123456789';
  if (/subject/.test(hints))                     return data.subject || 'Product Enquiry';
  if (/message|comment|note|query|enquiry/.test(hints)) return data.message;
  if (['text','search','','number'].includes(type)) return 'Test value';
  return null;
}

async function _handleDropdown(selectLocator, data) {
  const options   = await selectLocator.locator('option').allTextContents();
  const preferred = Object.values(data.dropdowns || {}).flat().map(v => v.toLowerCase());
  const match     = options.find(o => preferred.includes(o.trim().toLowerCase()));
  const nonEmpty  = options.filter(o => o.trim() && !/select|choose|pick/i.test(o));
  if (match)            await selectLocator.selectOption({ label: match.trim() });
  else if (nonEmpty[0]) await selectLocator.selectOption({ label: nonEmpty[0].trim() });
}

function _getValueForField(field, data) {
  const map = {
    name: data.fullName, fullname: data.fullName, firstname: data.firstName,
    lastname: data.lastName, email: data.email, phone: data.phone,
    mobile: data.mobile || data.phone, city: data.city || 'Jaipur',
    pincode: data.pincode || '302001', message: data.message,
    company: data.company, subject: data.subject || 'Product Enquiry',
    orderid: data.orderId || 'WS123456789',
  };
  return map[field.toLowerCase()] ?? 'Test value';
}
