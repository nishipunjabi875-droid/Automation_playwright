const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('Dump Razorpay HTML', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('https://www.woodenstreet.com/product/lorenz-3-seater-sofa-cotton-jade-ivory', { waitUntil: 'domcontentloaded' });

    try {
        await page.locator('.close-clone, .close, #close-button, .close-btn').first().click({ timeout: 3000 });
    } catch (e) {}

    await page.locator('#button-cart, .add-to-cart-btn, button:has-text("ADD TO CART")').first().click();
    await page.waitForTimeout(2000);

    await page.goto('https://www.woodenstreet.com/cart', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Place Order' }).first().click();
    await page.waitForTimeout(1000);

    await page.getByRole('textbox', { name: 'Mobile No.*' }).fill('9748746546');
    await page.getByRole('button', { name: 'CONTINUE' }).click();
    await page.waitForTimeout(1000);

    await page.getByRole('textbox', { name: 'Full Name*' }).fill('Test Scraper');
    await page.getByRole('textbox', { name: 'Email Address*' }).fill('scraper@test.com');
    await page.getByRole('textbox', { name: 'Pin Code*' }).fill('800001');
    await page.getByRole('textbox', { name: 'Flat, House no., Building,' }).fill('Flat 101, Test Building');
    await page.getByRole('textbox', { name: 'Area, Street, Sector, Village*' }).fill('Test Sector 1');
    await page.getByRole('textbox', { name: 'Landmark (optional)' }).fill('Test Landmark');

    await page.locator('button:has-text("SAVE AND CONTINUE"), button:has-text("placeOrder"), #placeOrder').first().click();
    await page.waitForTimeout(2000);

    await page.getByText('(NO Cost EMI, Card EMI & Easy').first().click();
    await page.getByRole('button', { name: 'placeOrder' }).first().click();

    const iframeSelector = 'iframe.razorpay-checkout-frame';
    const razorpayIframe = page.frameLocator(iframeSelector);
    await page.waitForSelector(iframeSelector, { state: 'visible', timeout: 20000 });

    await razorpayIframe.locator('[data-testid="emi"]').or(razorpayIframe.locator('text=Pay Via EMI')).or(razorpayIframe.locator('text=EMI')).first().click();
    await page.waitForTimeout(1000);

    await razorpayIframe.locator('[data-testid="emi-credit"]').or(razorpayIframe.locator('text=Credit Card')).first().click();
    await page.waitForTimeout(1000);

    // Expand HDFC Credit Cards
    const hdfcBank = razorpayIframe.locator('[data-testid="bank-HDFC"]').first();
    await hdfcBank.click();
    await page.waitForTimeout(1500);

    // Dump body HTML
    const bodyHtml = await razorpayIframe.locator('body').innerHTML();
    fs.writeFileSync(path.join(__dirname, '../razorpay_body.html'), bodyHtml);
    console.log('Successfully wrote razorpay_body.html');
});
