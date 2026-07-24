const { test, expect } = require('@playwright/test');

test.describe('WoodenStreet Help Center FAQ Clone UI Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the local FAQ clone server running on port 3000
    await page.goto('http://localhost:3000/clone.html', { waitUntil: 'load' });
    await page.waitForLoadState('networkidle').catch(() => {});
  });

  test('Verify Header and Brand Style Alignment', async ({ page }) => {
    // Logo text verification
    const logoTxtOrange = page.locator('.logo-txt-orange');
    const logoTxtBlack = page.locator('.logo-txt-black');
    await expect(logoTxtOrange).toHaveText('wooden');
    await expect(logoTxtBlack).toHaveText('street');

    // Verify main brand highlight color (#F9763A) is active on Ticket buttons
    const ticketBtn = page.locator('#btn-raise-ticket-banner');
    const bgVal = await ticketBtn.evaluate(el => window.getComputedStyle(el).backgroundColor);
    // rgb(249, 118, 58) is the rgb equivalent of #F9763A
    expect(bgVal).toBe('rgb(249, 118, 58)');
  });

  test('Verify 2-Column FAQ Layout and Navigation', async ({ page }) => {
    // 1. Check sidebar categories are rendered
    const categoriesList = page.locator('.category-item');
    await expect(categoriesList).toHaveCount(5);

    // 2. Select Payment & Invoice category
    const paymentCategory = page.locator('.category-item:has-text("Payment & Invoice")');
    await paymentCategory.click();
    await expect(paymentCategory).toHaveClass(/active/);

    // 3. Confirm questions list updates
    const activeTitle = page.locator('#active-category-title');
    await expect(activeTitle).toHaveText('Payment & Invoice');

    // 4. Click an accordion header to expand it
    const accordionItem = page.locator('.accordion-item').first();
    const accordionHeader = accordionItem.locator('.accordion-header');
    await accordionHeader.click();

    // Confirm accordion expands and displays answer content
    await expect(accordionItem).toHaveClass(/expanded/);
    const accordionContent = accordionItem.locator('.accordion-content');
    await expect(accordionContent).toBeVisible();
    await expect(accordionContent).toContainText('EMI');
  });

  test('Verify Live Search Filters Questions', async ({ page }) => {
    const searchInput = page.locator('#faq-search-input');
    await searchInput.fill('refund');
    
    // Category title updates to Search Results
    const categoryTitle = page.locator('#active-category-title');
    await expect(categoryTitle).toHaveText('Search Results');

    // Ensure matched questions count updates
    const activeCount = page.locator('#active-question-count');
    await expect(activeCount).toContainText('questions found');
  });

  test('Verify Support Chatbot Integration and Keyword Answers', async ({ page }) => {
    const chatbotTrigger = page.locator('#chatbot-trigger-btn');
    await chatbotTrigger.click();

    const chatWindow = page.locator('#chat-window-element');
    await expect(chatWindow).toBeVisible();

    // Test a quick reply chip (Track Order)
    const trackChip = page.locator('.chip-reply').first();
    await trackChip.click();

    // Bot replies with tracking options
    await expect(page.locator('.message-bot').locator('text=/Order ID/i').first()).toBeVisible({ timeout: 5000 });

    // Test custom input text
    const chatInput = page.locator('#chat-text-input');
    await chatInput.fill('wood quality');
    await page.locator('#chat-send-btn').click();

    // Bot replies with wood specifications
    await expect(page.locator('.message-bot').locator('text=/Sheesham/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('Verify Modals Action and Submissions', async ({ page }) => {
    // 1. Track Order Modal
    await page.locator('#action-track-order').click();
    const trackModal = page.locator('#modal-track-order');
    await expect(trackModal).toBeVisible();

    await page.locator('#track-order-id').fill('582910');
    await page.locator('#btn-submit-track').click();

    const result = page.locator('#track-result');
    await expect(result).toBeVisible();
    await expect(result).toContainText('Out of Jodhpur');

    // Close Track modal
    await trackModal.locator('.modal-close-btn').click();
    await expect(trackModal).not.toBeVisible();
  });
});
