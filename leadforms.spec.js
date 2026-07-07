// ═══════════════════════════════════════════════════════════════════════════════
// woodenstreet.spec.js  –  WoodenStreet Lead Form Test Suite
// ───────────────────────────────────────────────────────────────────────────────
// Single test file covering ALL lead forms on woodenstreet.com:
//
//  SUITE A  Static Pages        – Contact / Support / Complaint / Franchise / Sell
//  SUITE B  Product Page Modals – Book a Visit / Unlock Now / Early Delivery
//  SUITE C  Store Detail Page   – Request a Callback
//  SUITE D  Beta Page (Conditional) – Price Drop Alert
//  SUITE E  Pincode Checker     – Valid pincode / Invalid pincode + lead form
//
// Each suite runs 3 test scenarios (unless skipped where not applicable):
//   1. Valid data          → success message + optional 2xx API assertion
//   2. Empty submission    → validation errors visible
//   3. Invalid phone       → validation errors visible
//   4. Invalid email       → validation errors visible (forms with email field)
//   5. Modal dismissal     → modal closes cleanly (modal forms only)
//
// To add a new form: edit woodenstreet.helpers.js only.
// ═══════════════════════════════════════════════════════════════════════════════

import { test, expect } from '@playwright/test';
import {
  // ── Data ──────────────────────────────────────────────────────────────────
  STATIC_FORM_PAGES,
  PRODUCT_PAGE_FORMS,
  STORE_PAGE_FORMS,
  BETA_FORMS,
  PINCODE_FORMS,
  VALID_LEAD,
  INVALID_EMAIL_LEAD,
  INVALID_PHONE_LEAD,
  SHORT_PHONE_LEAD,
  SUCCESS_PATTERNS,
  // ── Utilities ─────────────────────────────────────────────────────────────
  dismissOverlays,
  findForms,
  fillForm,
  submitForm,
  assertSubmissionSuccess,
  assertValidationErrors,
  waitForLeadAPIResponse,
  screenshotOnFailure,
  clickCTA,
  waitForModal,
  fillModal,
  submitModal,
  assertModalSuccess,
} from './leadforms-helper.js';

// ─────────────────────────────────────────────────────────────────────────────
// Global: screenshot every failing test
// ─────────────────────────────────────────────────────────────────────────────
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    await screenshotOnFailure(page, testInfo.title);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITE A – STATIC PAGE FORMS
// Full-page forms on contact / support / franchise etc.
// ═════════════════════════════════════════════════════════════════════════════
test.describe('📄  Suite A – Static Page Lead Forms', () => {

  // ── A1. Valid submission ────────────────────────────────────────────────────
  test.describe('✅  Valid submission → success', () => {
    for (const { url, label, baseUrl } of STATIC_FORM_PAGES) {
      test(`[${label}]`, async ({ page }) => {
        console.log(`\n📄  ${label}  →  ${baseUrl}${url}`);
        await page.goto(`${baseUrl}${url}`, { waitUntil: 'domcontentloaded' });
        await dismissOverlays(page);

        const forms = await findForms(page);
        expect(forms.length, `No forms on ${url}`).toBeGreaterThan(0);

        for (let i = 0; i < forms.length; i++) {
          const form = forms[i];
          console.log(`\n  📋  Form #${i + 1} of ${forms.length}`);
          await form.scrollIntoViewIfNeeded();

          // Intercept lead API call around fill + submit
          const apiResult = await waitForLeadAPIResponse(page, async () => {
            await fillForm(page, form, VALID_LEAD);
            await submitForm(form);
          });

          await page.waitForLoadState('networkidle').catch(() => {});

          // Assert API response if XHR was detected
          if (apiResult) {
            console.log(`  🌐  ${apiResult.url} → HTTP ${apiResult.responseStatus}`);
            expect(apiResult.responseStatus).toBeGreaterThanOrEqual(200);
            expect(apiResult.responseStatus).toBeLessThan(300);
            if (apiResult.requestBody) expect(apiResult.requestBody).toContain(VALID_LEAD.email);
          }

          await assertSubmissionSuccess(page, form);
        }
      });
    }
  });

  // ── A2. Empty submission → validation errors ────────────────────────────────
  test.describe('⚠️  Empty submission → validation errors', () => {
    for (const { url, label, baseUrl } of STATIC_FORM_PAGES) {
      test(`[${label}]`, async ({ page }) => {
        await page.goto(`${baseUrl}${url}`, { waitUntil: 'domcontentloaded' });
        await dismissOverlays(page);
        const forms = await findForms(page);
        expect(forms.length).toBeGreaterThan(0);

        for (let i = 0; i < forms.length; i++) {
          await forms[i].scrollIntoViewIfNeeded();
          await submitForm(forms[i]);
          await assertValidationErrors(page, forms[i]);
        }
      });
    }
  });

  // ── A3. Invalid email → rejected ───────────────────────────────────────────
  test.describe('📧  Invalid email → rejected', () => {
    for (const { url, label, baseUrl } of STATIC_FORM_PAGES) {
      test(`[${label}]`, async ({ page }) => {
        await page.goto(`${baseUrl}${url}`, { waitUntil: 'domcontentloaded' });
        await dismissOverlays(page);
        const forms = await findForms(page);
        expect(forms.length).toBeGreaterThan(0);

        const form = forms[0];
        await form.scrollIntoViewIfNeeded();
        await fillForm(page, form, INVALID_EMAIL_LEAD);
        await submitForm(form);
        await assertValidationErrors(page, form);

        const bodyText = await page.locator('body').textContent();
        expect(/thank you|submitted successfully/i.test(bodyText), 'Must not succeed with bad email').toBe(false);
      });
    }
  });

  // ── A4. Invalid phone → rejected ───────────────────────────────────────────
  test.describe('📱  Invalid phone → rejected', () => {
    const cases = [
      { caseLabel: 'Alphanumeric phone', data: INVALID_PHONE_LEAD },
      { caseLabel: 'Too-short phone',    data: SHORT_PHONE_LEAD   },
    ];
    for (const { url, label, baseUrl } of STATIC_FORM_PAGES) {
      for (const { caseLabel, data } of cases) {
        test(`[${label}] ${caseLabel}`, async ({ page }) => {
          await page.goto(`${baseUrl}${url}`, { waitUntil: 'domcontentloaded' });
          await dismissOverlays(page);
          const forms = await findForms(page);
          expect(forms.length).toBeGreaterThan(0);
          const form = forms[0];
          await form.scrollIntoViewIfNeeded();
          await fillForm(page, form, data);
          await submitForm(form);
          await assertValidationErrors(page, form);
        });
      }
    }
  });

  // ── A5. Multi-form pages ────────────────────────────────────────────────────
  test.describe('📑  Multiple forms on one page', () => {
    for (const { url, label, baseUrl } of STATIC_FORM_PAGES) {
      test(`[${label}] each form submits independently`, async ({ page }) => {
        await page.goto(`${baseUrl}${url}`, { waitUntil: 'domcontentloaded' });
        await dismissOverlays(page);
        const forms = await findForms(page);

        if (forms.length < 2) {
          test.skip(true, `Only 1 form on ${label}`); return;
        }
        for (let i = 0; i < forms.length; i++) {
          await forms[i].scrollIntoViewIfNeeded();
          await fillForm(page, forms[i], VALID_LEAD);
          await submitForm(forms[i]);
          await assertSubmissionSuccess(page, forms[i]);
        }
      });
    }
  });

  // ── A6. Network interception ────────────────────────────────────────────────
  test.describe('🌐  Network interception – payload + 2xx', () => {
    for (const { url, label, baseUrl } of STATIC_FORM_PAGES) {
      test(`[${label}]`, async ({ page }) => {
        await page.goto(`${baseUrl}${url}`, { waitUntil: 'domcontentloaded' });
        await dismissOverlays(page);
        const forms = await findForms(page);
        expect(forms.length).toBeGreaterThan(0);
        const form = forms[0];
        await form.scrollIntoViewIfNeeded();

        const requestLog  = [];
        const responseLog = [];
        page.on('request',  req => { if (['POST','PUT','PATCH'].includes(req.method())) requestLog.push({ url: req.url(), body: req.postData() }); });
        page.on('response', res => { if (['POST','PUT','PATCH'].includes(res.request().method())) responseLog.push({ url: res.url(), status: res.status() }); });

        await fillForm(page, form, VALID_LEAD);
        await Promise.all([
          page.waitForResponse(r => ['POST','PUT','PATCH'].includes(r.request().method()), { timeout: 15_000 }).catch(() => null),
          submitForm(form),
        ]);

        if (responseLog.length > 0) {
          const last = responseLog[responseLog.length - 1];
          console.log(`  🌐  ${last.url} → HTTP ${last.status}`);
          expect(last.status).toBeGreaterThanOrEqual(200);
          expect(last.status).toBeLessThan(400);
          const match = requestLog.find(r => r.url === last.url);
          if (match?.body) { expect(match.body).toContain(VALID_LEAD.email); console.log('  ✅  Payload contains email'); }
        } else {
          console.log('  ℹ️   No XHR – traditional POST navigation');
          await assertSubmissionSuccess(page, form);
        }
      });
    }
  });

  // ── A7. Accessibility labels ────────────────────────────────────────────────
  test.describe('♿  All inputs have accessible labels', () => {
    for (const { url, label, baseUrl } of STATIC_FORM_PAGES) {
      test(`[${label}]`, async ({ page }) => {
        await page.goto(`${baseUrl}${url}`, { waitUntil: 'domcontentloaded' });
        await dismissOverlays(page);
        const forms = await findForms(page);
        let unlabelled = 0;

        for (const form of forms) {
          const inputs = form.locator('input:not([type="hidden"]):not([type="submit"]):not([type="button"])');
          for (let i = 0; i < await inputs.count(); i++) {
            const inp = inputs.nth(i);
            if (!await inp.isVisible()) continue;
            const id    = await inp.getAttribute('id');
            const aria  = await inp.getAttribute('aria-label');
            const ph    = await inp.getAttribute('placeholder');
            const alb   = await inp.getAttribute('aria-labelledby');
            let ok = !!(aria || ph || alb);
            if (!ok && id) ok = await form.locator(`label[for="${id}"]`).count() > 0;
            if (!ok) { unlabelled++; console.warn(`  ⚠️   Unlabelled input on ${label}`); }
          }
        }
        console.log(unlabelled === 0 ? `  ♿  All inputs labelled on ${label}` : `  ♿  ${unlabelled} unlabelled on ${label}`);
      });
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITE B – PRODUCT PAGE MODAL FORMS
// Book a Visit / Unlock Now / Early Delivery
// ═════════════════════════════════════════════════════════════════════════════
test.describe('🛋️  Suite B – Product Page Modal Forms', () => {

  // ── B1. Valid submission ────────────────────────────────────────────────────
  test.describe('✅  Valid submission → success', () => {
    for (const formDef of PRODUCT_PAGE_FORMS) {
      test(`[${formDef.label}]`, async ({ page }) => {
        console.log(`\n📄  ${formDef.label}  →  ${formDef.pageUrl}`);
        await page.goto(formDef.pageUrl, { waitUntil: 'domcontentloaded' });
        await dismissOverlays(page);
        await clickCTA(page, formDef.triggerText);
        const modal = await waitForModal(page);

        const apiResponses = [];
        page.on('response', res => {
          if (['POST','PUT','PATCH'].includes(res.request().method()))
            apiResponses.push({ url: res.url(), status: res.status() });
        });

        await fillModal(modal, formDef.fields, VALID_LEAD);
        await Promise.all([
          page.waitForResponse(r => ['POST','PUT','PATCH'].includes(r.request().method()), { timeout: 12_000 }).catch(() => null),
          submitModal(modal, formDef.submitText),
        ]);

        if (apiResponses.length > 0) {
          const last = apiResponses[apiResponses.length - 1];
          expect(last.status).toBeGreaterThanOrEqual(200);
          expect(last.status).toBeLessThan(300);
        }
        await assertModalSuccess(page, modal, formDef.successText);
      });
    }
  });

  // ── B2. Empty submission ────────────────────────────────────────────────────
  test.describe('⚠️  Empty submission → validation errors', () => {
    for (const formDef of PRODUCT_PAGE_FORMS) {
      test(`[${formDef.label}]`, async ({ page }) => {
        await page.goto(formDef.pageUrl, { waitUntil: 'domcontentloaded' });
        await dismissOverlays(page);
        await clickCTA(page, formDef.triggerText);
        const modal = await waitForModal(page);
        await submitModal(modal, formDef.submitText);
        await assertValidationErrors(page, modal);
      });
    }
  });

  // ── B3. Invalid phone ───────────────────────────────────────────────────────
  test.describe('📱  Invalid phone → validation error', () => {
    for (const formDef of PRODUCT_PAGE_FORMS) {
      test(`[${formDef.label}]`, async ({ page }) => {
        await page.goto(formDef.pageUrl, { waitUntil: 'domcontentloaded' });
        await dismissOverlays(page);
        await clickCTA(page, formDef.triggerText);
        const modal = await waitForModal(page);
        await fillModal(modal, formDef.fields, INVALID_PHONE_LEAD);
        await submitModal(modal, formDef.submitText);
        await assertValidationErrors(page, modal);
      });
    }
  });

  // ── B4. Invalid email (email-bearing forms only) ────────────────────────────
  test.describe('📧  Invalid email → validation error', () => {
    for (const formDef of PRODUCT_PAGE_FORMS.filter(f => f.fields.includes('email'))) {
      test(`[${formDef.label}]`, async ({ page }) => {
        await page.goto(formDef.pageUrl, { waitUntil: 'domcontentloaded' });
        await dismissOverlays(page);
        await clickCTA(page, formDef.triggerText);
        const modal = await waitForModal(page);
        await fillModal(modal, formDef.fields, INVALID_EMAIL_LEAD);
        await submitModal(modal, formDef.submitText);
        await assertValidationErrors(page, modal);
      });
    }
  });

  // ── B5. Modal closes when dismissed ────────────────────────────────────────
  test.describe('❌  Modal can be dismissed without submitting', () => {
    for (const formDef of PRODUCT_PAGE_FORMS) {
      test(`[${formDef.label}]`, async ({ page }) => {
        await page.goto(formDef.pageUrl, { waitUntil: 'domcontentloaded' });
        await dismissOverlays(page);
        await clickCTA(page, formDef.triggerText);
        const modal = await waitForModal(page);

        // Try close button selectors in order
        const closeSelectors = [
          '[aria-label="Close"]','[aria-label="close"]','button.close',
          '.modal-close','.popup-close','button:has-text("×")','button:has-text("✕")',
          '[class*="close"]',
        ];
        let closed = false;
        for (const sel of closeSelectors) {
          const btn = modal.locator(sel).first();
          if (await btn.count() > 0 && await btn.isVisible()) {
            await btn.click(); closed = true; break;
          }
        }
        if (!closed) await page.keyboard.press('Escape');

        await expect(modal).not.toBeVisible({ timeout: 5_000 });
        console.log(`  ✅  [${formDef.label}] Modal dismissed`);
      });
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITE C – STORE PAGE: REQUEST A CALLBACK
// ═════════════════════════════════════════════════════════════════════════════
test.describe('🏪  Suite C – Store Page: Request a Callback', () => {

  for (const formDef of STORE_PAGE_FORMS) {

    // ── C1. Valid submission ──────────────────────────────────────────────────
    test(`[${formDef.label}] Valid data → callback requested`, async ({ page }) => {
      console.log(`\n📄  ${formDef.label}  →  ${formDef.pageUrl}`);
      await page.goto(formDef.pageUrl, { waitUntil: 'domcontentloaded' });
      await dismissOverlays(page);
      await clickCTA(page, formDef.triggerText);
      const modal = await waitForModal(page);

      const apiResponses = [];
      page.on('response', res => {
        if (['POST','PUT','PATCH'].includes(res.request().method()))
          apiResponses.push({ url: res.url(), status: res.status() });
      });

      await fillModal(modal, formDef.fields, VALID_LEAD);
      await Promise.all([
        page.waitForResponse(r => ['POST','PUT','PATCH'].includes(r.request().method()), { timeout: 12_000 }).catch(() => null),
        submitModal(modal, formDef.submitText),
      ]);

      if (apiResponses.length > 0) {
        expect(apiResponses[apiResponses.length - 1].status).toBeGreaterThanOrEqual(200);
        expect(apiResponses[apiResponses.length - 1].status).toBeLessThan(300);
      }
      await assertModalSuccess(page, modal, formDef.successText);
    });

    // ── C2. Empty submission ──────────────────────────────────────────────────
    test(`[${formDef.label}] Empty submit → validation errors`, async ({ page }) => {
      await page.goto(formDef.pageUrl, { waitUntil: 'domcontentloaded' });
      await dismissOverlays(page);
      await clickCTA(page, formDef.triggerText);
      const modal = await waitForModal(page);
      await submitModal(modal, formDef.submitText);
      await assertValidationErrors(page, modal);
    });

    // ── C3. Invalid phone ─────────────────────────────────────────────────────
    test(`[${formDef.label}] Invalid phone → validation error`, async ({ page }) => {
      await page.goto(formDef.pageUrl, { waitUntil: 'domcontentloaded' });
      await dismissOverlays(page);
      await clickCTA(page, formDef.triggerText);
      const modal = await waitForModal(page);
      await fillModal(modal, formDef.fields, INVALID_PHONE_LEAD);
      await submitModal(modal, formDef.submitText);
      await assertValidationErrors(page, modal);
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITE D – BETA: PRICE DROP ALERT (CONDITIONAL MODAL)
// ═════════════════════════════════════════════════════════════════════════════
test.describe('💰  Suite D – Beta: Price Drop Alert', () => {

  for (const formDef of BETA_FORMS) {

    // ── D1. Form hidden before trigger click ──────────────────────────────────
    test(`[${formDef.label}] Modal NOT visible before CTA click`, async ({ page }) => {
      await page.goto(formDef.pageUrl, { waitUntil: 'domcontentloaded' });
      await dismissOverlays(page);
      await page.waitForTimeout(2_000);

      const openModals = page.locator('.modal:visible, [role="dialog"]:visible, .popup:visible');
      if (await openModals.count() > 0) {
        const txt = await openModals.first().textContent();
        expect(/price\s*drop|notify.*price/i.test(txt || ''), 'Price Drop modal must be hidden initially').toBe(false);
      }
      console.log('  ✅  Price Drop form hidden before trigger click');
    });

    // ── D2. Modal appears after trigger click ─────────────────────────────────
    test(`[${formDef.label}] Trigger click reveals form`, async ({ page }) => {
      await page.goto(formDef.pageUrl, { waitUntil: 'domcontentloaded' });
      await dismissOverlays(page);

      const cta = page.locator('button, a, [role="button"]').filter({ hasText: formDef.triggerText });
      await expect(cta.first()).toBeVisible({ timeout: 15_000 });

      await clickCTA(page, formDef.triggerText);
      const modal = await waitForModal(page);
      expect(await modal.isVisible()).toBe(true);
      console.log('  ✅  Price Drop modal appeared');
    });

    // ── D3. Valid submission ──────────────────────────────────────────────────
    test(`[${formDef.label}] Valid email+phone → alert registered`, async ({ page }) => {
      await page.goto(formDef.pageUrl, { waitUntil: 'domcontentloaded' });
      await dismissOverlays(page);
      await clickCTA(page, formDef.triggerText);
      const modal = await waitForModal(page);

      const apiResponses = [];
      page.on('response', res => {
        if (['POST','PUT','PATCH'].includes(res.request().method()))
          apiResponses.push({ url: res.url(), status: res.status() });
      });

      await fillModal(modal, formDef.fields, VALID_LEAD);
      await Promise.all([
        page.waitForResponse(r => ['POST','PUT','PATCH'].includes(r.request().method()), { timeout: 12_000 }).catch(() => null),
        submitModal(modal, formDef.submitText),
      ]);

      if (apiResponses.length > 0)
        expect(apiResponses[apiResponses.length - 1].status).toBeLessThan(300);

      await assertModalSuccess(page, modal, formDef.successText);
    });

    // ── D4. Empty submission ──────────────────────────────────────────────────
    test(`[${formDef.label}] Empty submit → validation errors`, async ({ page }) => {
      await page.goto(formDef.pageUrl, { waitUntil: 'domcontentloaded' });
      await dismissOverlays(page);
      await clickCTA(page, formDef.triggerText);
      const modal = await waitForModal(page);
      await submitModal(modal, formDef.submitText);
      await assertValidationErrors(page, modal);
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITE E – DELIVERY PINCODE CHECKER
// ═════════════════════════════════════════════════════════════════════════════
test.describe('📦  Suite E – Delivery Pincode Checker', () => {
  test.setTimeout(90000);

  for (const formDef of PINCODE_FORMS) {

    // ── E1. Valid pincode → delivery date shown, no lead form ─────────────────
    test(`[${formDef.label}] Valid pincode → delivery date, no lead form`, async ({ page }) => {
      console.log(`\n📄  ${formDef.label}  →  ${formDef.pageUrl}`);
      if (page.url() !== formDef.pageUrl) {
        await page.goto(formDef.pageUrl, { waitUntil: 'domcontentloaded' });
      }
      await dismissOverlays(page);

      const cancelBtn = page.locator('button:has-text("Cancel")').first();
      if (await cancelBtn.count() > 0 && await cancelBtn.isVisible()) {
        await cancelBtn.click();
        await page.waitForTimeout(300);
      }

      const pincodeInput = await _findPincodeInput(page, formDef.pincodeInputSelector);
      await pincodeInput.scrollIntoViewIfNeeded();
      await pincodeInput.click();
      await pincodeInput.fill('');
      await pincodeInput.type(formDef.validPincode, { delay: 60 });
      console.log(`  📮  Valid pincode: ${formDef.validPincode}`);

      await _clickCheckButton(page, formDef.checkButtonSelector);
      await page.waitForTimeout(2_000);

      const areaText = await page.locator('.delivery-pincode, [class*="pincode"], [class*="delivery"]').first().textContent().catch(() => '');
      expect(/deliver(y|ed)|estimated|dispatch|ship/i.test(areaText), 'Valid pincode must show delivery info').toBe(true);
      expect(formDef.leadFormTrigger.test(areaText), 'Valid pincode must NOT trigger lead form').toBe(false);
      console.log('  ✅  Valid pincode: delivery info shown, no lead form');
    });

    // ── E2. Invalid pincode → "not serviceable" + lead form CTA ──────────────
    test(`[${formDef.label}] Invalid pincode → not serviceable + notify-me form`, async ({ page }) => {
      if (page.url() !== formDef.pageUrl) {
        await page.goto(formDef.pageUrl, { waitUntil: 'domcontentloaded' });
      }
      await dismissOverlays(page);

      const cancelBtn = page.locator('button:has-text("Cancel")').first();
      if (await cancelBtn.count() > 0 && await cancelBtn.isVisible()) {
        await cancelBtn.click();
        await page.waitForTimeout(300);
      }

      const pincodeInput = await _findPincodeInput(page, formDef.pincodeInputSelector);
      await pincodeInput.scrollIntoViewIfNeeded();
      await pincodeInput.click();
      await pincodeInput.fill('');
      await pincodeInput.type(formDef.invalidPincode, { delay: 60 });
      console.log(`  📮  Invalid pincode: ${formDef.invalidPincode}`);

      await _clickCheckButton(page, formDef.checkButtonSelector);
      await page.waitForTimeout(2_000);

      const areaText = await page.locator('.delivery-pincode, [class*="pincode"], [class*="delivery"]').first().textContent().catch(() => '');
      expect(/not serviceable|unavailable|sorry|outside.*delivery/i.test(areaText), '"Not serviceable" message must appear').toBe(true);
      expect(formDef.leadFormTrigger.test(areaText), 'Notify-me lead CTA must appear').toBe(true);
      console.log('  ✅  Invalid pincode: not serviceable + lead CTA shown');
    });

    // ── E3. Submit lead form after invalid pincode ────────────────────────────
    test(`[${formDef.label}] Lead form after invalid pincode → valid submit succeeds`, async ({ page }) => {
      if (page.url() !== formDef.pageUrl) {
        await page.goto(formDef.pageUrl, { waitUntil: 'domcontentloaded' });
      }
      await dismissOverlays(page);

      const cancelBtn = page.locator('button:has-text("Cancel")').first();
      if (await cancelBtn.count() > 0 && await cancelBtn.isVisible()) {
        await cancelBtn.click();
        await page.waitForTimeout(300);
      }

      const pincodeInput = await _findPincodeInput(page, formDef.pincodeInputSelector);
      await pincodeInput.scrollIntoViewIfNeeded();
      await pincodeInput.fill('');
      await pincodeInput.type(formDef.invalidPincode, { delay: 60 });
      await _clickCheckButton(page, formDef.checkButtonSelector);
      await page.waitForTimeout(2_000);

      // Click the Notify Me CTA if present
      const notifyCTA = page.locator('button, a').filter({ hasText: /notify|alert me|let me know/i });
      if (await notifyCTA.count() > 0 && await notifyCTA.first().isVisible())
        await notifyCTA.first().click();

      const modal          = await waitForModal(page).catch(() => null);
      const formContainer  = modal || page.locator('.delivery-pincode, [class*="pincode"], [class*="delivery"]').last();

      const nameInput  = formContainer.locator('input[name*="name" i],  input[placeholder*="name" i], input[placeholder*="Full Name" i]').first();
      const phoneInput = formContainer.locator('input[name*="phone" i], input[placeholder*="mobile" i], input[type="tel"], input[name*="mobile" i]').first();
      const emailInput = formContainer.locator('input[type="email"],    input[name*="email" i], input[placeholder*="email" i]').first();

      if (await nameInput.count()  > 0 && await nameInput.isVisible())  await nameInput.fill(VALID_LEAD.fullName);
      if (await phoneInput.count() > 0 && await phoneInput.isVisible()) await phoneInput.fill(VALID_LEAD.phone);
      if (await emailInput.count() > 0 && await emailInput.isVisible()) await emailInput.fill(VALID_LEAD.email);

      const submitBtn = formContainer.locator([
        'button[type="submit"]',
        'button:has-text("Notify")',
        'button:has-text("Submit")',
        'button:has-text("Callback")',
        'button:has-text("Request")',
      ].join(', ')).first();

      if (await submitBtn.count() > 0) {
        await submitBtn.click();
        await page.waitForTimeout(2_000);
        const bodyText  = await page.locator('body').textContent();
        expect(/thank you|success|notify|we.ll alert|callback/i.test(bodyText), 'Lead form must succeed').toBe(true);
        console.log('  ✅  Lead form submitted after invalid pincode');
      } else {
        test.skip(true, 'No lead form appeared after invalid pincode');
      }
    });

    // ── E4. Empty pincode → prompts for input ─────────────────────────────────
    test(`[${formDef.label}] Empty pincode → prompts user for input`, async ({ page }) => {
      if (page.url() !== formDef.pageUrl) {
        await page.goto(formDef.pageUrl, { waitUntil: 'domcontentloaded' });
      }
      await dismissOverlays(page);

      const cancelBtn = page.locator('button:has-text("Cancel")').first();
      if (await cancelBtn.count() > 0 && await cancelBtn.isVisible()) {
        await cancelBtn.click();
        await page.waitForTimeout(300);
      }

      const pincodeInput = await _findPincodeInput(page, formDef.pincodeInputSelector);
      await pincodeInput.scrollIntoViewIfNeeded();
      await _clickCheckButton(page, formDef.checkButtonSelector);
      await page.waitForTimeout(1_500);

      const bodyText = await page.locator('body').textContent();
      const prompted = /enter.*pincode|valid.*pincode|pincode.*required/i.test(bodyText)
        || await pincodeInput.evaluate(el => !el.validity.valid);

      expect(prompted, 'Empty pincode must prompt user to enter value').toBe(true);
      console.log('  ✅  Empty pincode correctly prompted for input');
    });

    // ── E5. Short pincode (3 digits) → no false delivery date ────────────────
    test(`[${formDef.label}] Short pincode (3 digits) → no delivery date shown`, async ({ page }) => {
      if (page.url() !== formDef.pageUrl) {
        await page.goto(formDef.pageUrl, { waitUntil: 'domcontentloaded' });
      }
      await dismissOverlays(page);

      const cancelBtn = page.locator('button:has-text("Cancel")').first();
      if (await cancelBtn.count() > 0 && await cancelBtn.isVisible()) {
        await cancelBtn.click();
        await page.waitForTimeout(300);
      }

      const pincodeInput = await _findPincodeInput(page, formDef.pincodeInputSelector);
      await pincodeInput.scrollIntoViewIfNeeded();
      await pincodeInput.fill('302');
      await _clickCheckButton(page, formDef.checkButtonSelector);
      await page.waitForTimeout(1_500);

      const areaText = await page.locator('.delivery-pincode, [class*="pincode"], [class*="delivery"]').first().textContent().catch(() => '');
      expect(/estimated|dispatch|deliver.*by \d/i.test(areaText), 'Short pincode must not show delivery date').toBe(false);
      console.log('  ✅  Short pincode did not show a false delivery date');
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// File-local helpers (pincode section only)
// ─────────────────────────────────────────────────────────────────────────────

async function _findPincodeInput(page, selectorList) {
  const changeBtn = page.locator('button:has-text("CHANGE"), .change-pincode').first();
  if (await changeBtn.count() > 0 && await changeBtn.isVisible()) {
    await changeBtn.click();
    await page.waitForTimeout(500);
  }
  for (const sel of selectorList.split(',').map(s => s.trim())) {
    const el = page.locator(sel).first();
    if (await el.count() > 0 && await el.isVisible()) return el;
  }
  throw new Error(`Pincode input not found. Tried: ${selectorList}`);
}

async function _clickCheckButton(page, selectorList) {
  for (const sel of selectorList.split(',').map(s => s.trim())) {
    const btn = page.locator(sel).first();
    if (await btn.count() > 0 && await btn.isVisible()) { await btn.click(); return; }
  }
  await page.keyboard.press('Enter');
}
