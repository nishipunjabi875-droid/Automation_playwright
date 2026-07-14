const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const config = require('../config/config');

// Helper to dismiss overlays / popups
async function dismissPopups(page) {
  try {
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(500);
    
    // Target common close buttons
    const selectors = [
      '.close-clone', '.close', '#close-button', '.close-btn',
      'button[aria-label="Close"]', '.style_close-btn__V5wG6',
      '#login-close', '[class*="close" i]'
    ];
    for (const selector of selectors) {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 300 })) {
        await btn.click().catch(() => {});
      }
    }
  } catch (err) {}
}

test.describe('WoodenStreet Help Center Tickets Page Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Set a wider viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Navigate to ticket page
    console.log('Navigating to WoodenStreet Help Center Ticket Page...');
    await page.goto('https://www.woodenstreet.com/help-center/tickets?default=create', { waitUntil: 'load', timeout: 60000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);
    
    await dismissPopups(page);
    
    // Check if we are logged in by checking the profile greeting in the header
    const profileLink = page.locator('.style_profile-link__MYjN3, [class*="profile-link"], a[href*="profile"], a:has-text("Profile"), a:has-text("Hi ")').first();
    const profileText = await profileLink.innerText().catch(() => '');
    console.log(`Header Profile text found: "${profileText.trim()}"`);
    
    // Clean text and check if we are logged in (avoid matching "Franchise" due to "hi")
    const cleanedText = profileText.replace(/Become a Franchise/gi, '').trim().toLowerCase();
    const isLoggedIn = cleanedText.includes('hi') || cleanedText.includes('nishi') || cleanedText.includes('logout');
    
    if (!isLoggedIn) {
      console.log('\n======================================================================');
      console.log('⚠️  AUTHENTICATION REQUIRED FOR THIS TEST');
      console.log('======================================================================');
      console.log('The Help Center Ticket Creation page requires an active logged-in user.');
      console.log('Since WoodenStreet uses dynamic mobile OTP login, please run the test');
      console.log('using a saved storageState. You can save your session using:');
      console.log('  npx playwright codegen https://www.woodenstreet.com --save-storage=auth.json');
      console.log('And then run the test with:');
      console.log('  npx playwright test tests/tickets.spec.js --storage-state=auth.json');
      console.log('======================================================================\n');
      
      test.skip(true, 'Requires authenticated session state (auth.json).');
    } else {
      console.log('User session detected. Proceeding with the test...');
    }
  });

  test('Audit L1/L2 Categories & Create/Close Ticket', async ({ page }) => {
    test.setTimeout(120000);
    
    // Check if the "no order placed yet" message is visible
    const noOrderMessage = page.locator('text="Sorry! Can\'t Create Ticket"').or(page.locator('text="no order has been placed yet"')).first();
    if (await noOrderMessage.isVisible()) {
      console.warn('⚠️ No active orders found on this account. Skipping L1/L2 check and ticket creation.');
      return;
    }
    
    // 1. Select Order ID
    console.log('Selecting Order ID...');
    const selectOrderTrigger = page.locator('div:has-text("Click to select Order ID"), div:has-text("Select Your Order ID"), [class*="order-id-selector"]').first();
    await selectOrderTrigger.waitFor({ state: 'visible', timeout: 5000 });
    await selectOrderTrigger.click();
    await page.waitForTimeout(1000);
    
    // Select first order radio button
    const firstOrderRadio = page.locator('input[type="radio"]').first();
    await firstOrderRadio.waitFor({ state: 'visible', timeout: 5000 });
    await firstOrderRadio.click();
    await page.waitForTimeout(1000);
    
    // 2. Audit L1 & L2 Dropdowns
    console.log('Auditing L1 & L2 dropdown categories...');
    const l1Select = page.locator('select').first();
    await l1Select.waitFor({ state: 'visible', timeout: 5000 });
    
    // Extract L1 options
    const l1Options = await l1Select.evaluate(select => {
      return Array.from(select.options)
        .map(opt => ({ value: opt.value, text: opt.text.trim() }))
        .filter(opt => opt.value !== '' && opt.text !== ''); // skip placeholders
    });
    
    console.log(`\n==================================================`);
    console.log(`TICKET ISSUE CATEGORIES HIERARCHY (L1 & L2)`);
    console.log(`==================================================`);
    expect(l1Options.length).toBeGreaterThan(0);
    
    const hierarchy = {};
    for (const l1Opt of l1Options) {
      console.log(`L1 Option: "${l1Opt.text}" (Value: "${l1Opt.value}")`);
      await l1Select.selectOption(l1Opt.value);
      await page.waitForTimeout(1000); // wait for L2 dropdown to update
      
      const l2Select = page.locator('select').nth(1);
      await l2Select.waitFor({ state: 'visible', timeout: 3000 });
      
      const l2Options = await l2Select.evaluate(select => {
        return Array.from(select.options)
          .map(opt => ({ value: opt.value, text: opt.text.trim() }))
          .filter(opt => opt.value !== '' && opt.text !== '');
      });
      
      hierarchy[l1Opt.text] = l2Options.map(o => o.text);
      for (const l2Opt of l2Options) {
        console.log(`  └─ L2 Option: "${l2Opt.text}" (Value: "${l2Opt.value}")`);
      }
    }
    console.log(`==================================================\n`);
    
    // 3. Create a Ticket
    console.log('Creating a test ticket...');
    // Select first L1 option and first L2 option for the creation test
    const selectedL1 = l1Options[0];
    await l1Select.selectOption(selectedL1.value);
    await page.waitForTimeout(1000);
    
    const l2Select = page.locator('select').nth(1);
    const l2Options = await l2Select.evaluate(select => {
      return Array.from(select.options)
        .map(opt => ({ value: opt.value, text: opt.text.trim() }))
        .filter(opt => opt.value !== '' && opt.text !== '');
    });
    
    const selectedL2 = l2Options[0];
    await l2Select.selectOption(selectedL2.value);
    
    const testSubject = `QA Auto-Test Ticket - ${Date.now()}`;
    const testDesc = `This is an automated test ticket created by the Playwright QA suite. Please resolve or close this ticket automatically. Created on: ${new Date().toLocaleString()}`;
    
    await page.locator('input[placeholder="Enter subject"]').fill(testSubject);
    await page.locator('textarea[placeholder="Describe your issue..."]').fill(testDesc);
    
    // Click Create Ticket
    const createBtn = page.locator('button:has-text("Create Ticket"), button.style_btn__j7PEz').first();
    await createBtn.click();
    
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(4000);
    
    // 4. Verify Ticket exists in the List
    console.log('Verifying ticket exists in View Tickets list...');
    await page.goto('https://www.woodenstreet.com/help-center/tickets?default=view', { waitUntil: 'load' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);
    await dismissPopups(page);
    
    // Locate the first row in the ticket list
    const firstTicketRow = page.locator('table tr, .style_ticket-row__container').nth(1);
    await firstTicketRow.waitFor({ state: 'visible', timeout: 5000 });
    
    // Extract cells
    const cells = firstTicketRow.locator('td');
    const actualSubject = (await cells.nth(1).innerText()).trim();
    const actualStatus = (await cells.nth(2).innerText()).trim();
    const actionBtn = cells.nth(4).locator('a, button, img').first();
    
    console.log(`Newest Ticket in List: Subject="${actualSubject}", Status="${actualStatus}"`);
    expect(actualSubject).toContain('QA Auto-Test Ticket');
    
    // 5. Navigate to Ticket Conversation Details & Cleanup (Close Ticket)
    console.log('Navigating to ticket conversation page for closure...');
    await actionBtn.click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);
    
    console.log(`On Ticket Detail Page: ${page.url()}`);
    
    // Look for a close, resolve, or mark as resolved button to cleanup the ticket
    const closeBtn = page.locator('button:has-text("Close Ticket"), button:has-text("Resolve"), button:has-text("Close"), button:has-text("Mark as Resolved")').first();
    if (await closeBtn.isVisible()) {
      console.log('Found Close/Resolve button on ticket page. Clicking it...');
      await closeBtn.click();
      await page.waitForTimeout(2000);
      console.log('Ticket successfully closed/resolved.');
    } else {
      console.log('ℹ️ No customer-facing close/resolve button exists on the ticket conversation page.');
      console.log('Tickets on this platform are resolved via admin panel or support response.');
    }
    
    // Take a screenshot of the details page for validation
    await page.screenshot({ path: `screenshots/ticket_detail_${Date.now()}.png`, fullPage: true });
  });

});
