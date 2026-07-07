const { test, expect } = require('@playwright/test');

test.describe('Razorpay Checkout Automation', () => {
    const productUrl = 'https://beta.teamwoodenstreet.com/product/vedic-3-seater-sofa-with-cane-and-brass-detail-teak-finish-jade-ivory';

    test('Razorpay Checkout - Success Scenario', async ({ page }) => {
        test.setTimeout(120000); // 2 minutes

        console.log('Navigating to product page:', productUrl);
        await page.goto(productUrl);
        await page.waitForLoadState('domcontentloaded');

        // Close any popups if they appear
        await page.locator('.close-clone, .close').first().click().catch(() => {});

        // 0. Pincode Check (sometimes required)
        const pincodeInput = page.locator('#pincode, input[placeholder*="Pincode"]').first();
        if (await pincodeInput.isVisible()) {
            await pincodeInput.fill('302001');
            await page.locator('button:has-text("CHECK"), .pincode-check').first().click();
            await page.waitForTimeout(2000);
            console.log('Pincode checked');
        }

        // 1. Add to Cart
        const atcSelector = 'button:has-text("ADD TO CART"), #button-cart, .add-to-cart-btn';
        await page.locator(atcSelector).first().click();
        console.log('Clicked Add to Cart');
        
        // Wait for cart popup or navigation
        await page.waitForTimeout(3000); 
        
        // 2. Go to Checkout
        await page.goto('https://beta.teamwoodenstreet.com/checkout/cart');
        console.log('Navigated to cart page');
        
        // Re-check if cart is empty and retry if needed
        let cartItem = page.locator('.cart-item, .product-details, .cart-table').first();
        if (!(await cartItem.isVisible())) {
            console.log('Cart still empty, trying to add again with direct click');
            await page.goto(productUrl);
            await page.locator(atcSelector).first().click();
            await page.waitForTimeout(3000);
            await page.goto('https://beta.teamwoodenstreet.com/checkout/cart');
        }

        const checkoutBtn = page.locator('a:has-text("Checkout"), button:has-text("Checkout"), .checkout-btn, a[href*="checkout"]').first();
        console.log('Waiting for Checkout button...');
        await checkoutBtn.waitFor({ state: 'visible', timeout: 15000 }).catch(async () => {
            console.log('Checkout button not visible, taking screenshot');
            await page.screenshot({ path: 'debug_checkout_not_found.png' });
            const content = await page.content();
            console.log('Page content length:', content.length);
        });
        await checkoutBtn.click();
        console.log('Clicked Checkout');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'debug_after_checkout_click.png' });
        
        // Let's assume there's a form for name, email, phone, address
        const emailInput = page.locator('input[name="email"], input[placeholder*="Email"]').first();
        if (await emailInput.isVisible()) {
            await emailInput.fill('testuser@example.com');
            await page.locator('input[name="name"], input[placeholder*="Name"]').first().fill('Test User');
            await page.locator('input[name="mobile"], input[placeholder*="Mobile"]').first().fill('9876543210');
            await page.locator('input[name="pincode"], input[placeholder*="Pincode"]').first().fill('302001');
            await page.locator('textarea[name="address"], textarea[placeholder*="Address"]').first().fill('123 Test Street, Test Area');
            
            // Proceed to payment
            const proceedBtn = page.locator('button:has-text("Proceed to Payment"), button:has-text("Place Order")').first();
            await proceedBtn.click();
            console.log('Proceeded to payment');
        }

        // 4. Select Razorpay
        const razorpayOption = page.locator('text=Razorpay, #cardPayment').first();
        await razorpayOption.click();
        
        const placeOrderBtn = page.locator('button:has-text("Place Order")').first();
        await placeOrderBtn.click();
        console.log('Clicked Place Order');

        // 5. Handle Razorpay Iframe (Success)
        const frame = page.frameLocator('iframe.razorpay-checkout-frame');
        await frame.locator('text=Netbanking').click();
        await frame.locator('text=HDFC').click();
        await frame.locator('button:has-text("Pay Now")').click();

        // Razorpay test window might open
        const [popup] = await Promise.all([
            page.waitForEvent('popup'),
            frame.locator('button:has-text("Success")').click().catch(() => {}) 
            // In some test modes, there's a "Success" button in a popup or inside the frame
        ]);
        
        if (popup) {
            await popup.locator('button:has-text("Success")').click();
        }

        // 6. Verify Success Message
        await expect(page).toHaveURL(/success/i);
        await expect(page.locator('text=Thank you for your order')).toBeVisible();
    });

    test('Razorpay Checkout - Failure Scenario', async ({ page }) => {
        test.setTimeout(120000);

        await page.goto(productUrl);
        await page.click('button:has-text("Add to Cart")');
        await page.goto('https://beta.teamwoodenstreet.com/checkout/cart');
        await page.click('a:has-text("Checkout")');

        // Fill details (shortened for brevity, assuming same fields)
        await page.locator('input[name="email"]').fill('testuser@example.com');
        // ... fill other fields ...
        
        await page.click('button:has-text("Place Order")');

        // Handle Razorpay Iframe (Failure)
        const frame = page.frameLocator('iframe.razorpay-checkout-frame');
        await frame.locator('text=Netbanking').click();
        await frame.locator('text=HDFC').click();
        
        // Simulate failure
        const [popup] = await Promise.all([
            page.waitForEvent('popup'),
            frame.locator('button:has-text("Failure")').click().catch(() => {})
        ]);

        if (popup) {
            await popup.locator('button:has-text("Failure")').click();
        }

        // Verify Failure Message or Stay on Checkout
        await expect(page.locator('text=Payment Failed')).toBeVisible();
    });
});
