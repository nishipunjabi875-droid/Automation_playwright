const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('Scrape EMI options from Razorpay', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes

    console.log('Navigating to product page...');
    await page.goto('https://www.woodenstreet.com/product/lorenz-3-seater-sofa-cotton-jade-ivory', { waitUntil: 'domcontentloaded' });

    // Handle any close buttons for popups
    try {
        await page.locator('.close-clone, .close, #close-button, .close-btn').first().click({ timeout: 5000 });
        console.log('Closed popup/modal if any.');
    } catch (e) {
        console.log('No popup to close.');
    }

    // ATC button click
    const atcButton = page.locator('#button-cart, .add-to-cart-btn, button:has-text("ADD TO CART")').first();
    await atcButton.waitFor({ state: 'visible', timeout: 15000 });
    await atcButton.click();
    console.log('Clicked ADD TO CART');

    await page.waitForTimeout(3000);

    // Go to checkout / cart
    await page.goto('https://www.woodenstreet.com/cart', { waitUntil: 'domcontentloaded' });
    console.log('Navigated to cart');

    // Place Order button
    const placeOrderBtn = page.getByRole('button', { name: 'Place Order' }).first();
    await placeOrderBtn.waitFor({ state: 'visible', timeout: 15000 });
    await placeOrderBtn.click();
    console.log('Clicked Place Order on Cart');

    await page.waitForTimeout(2000);

    // Fill shipping details
    console.log('Filling shipping details...');
    
    // Mobile number
    const mobileInput = page.getByRole('textbox', { name: 'Mobile No.*' });
    await mobileInput.waitFor({ state: 'visible', timeout: 10000 });
    await mobileInput.fill('9748746546');
    console.log('Filled mobile number');

    const continueBtn = page.getByRole('button', { name: 'CONTINUE' });
    await continueBtn.click();
    console.log('Clicked CONTINUE');

    await page.waitForTimeout(2000);

    // Full name, Email, Pin code, address fields
    const nameInput = page.getByRole('textbox', { name: 'Full Name*' });
    await nameInput.waitFor({ state: 'visible', timeout: 10000 });
    await nameInput.fill('Test Scraper');

    const emailInput = page.getByRole('textbox', { name: 'Email Address*' });
    await emailInput.fill('scraper@test.com');

    const pincodeInput = page.getByRole('textbox', { name: 'Pin Code*' });
    await pincodeInput.fill('800001');

    const address1Input = page.getByRole('textbox', { name: 'Flat, House no., Building,' });
    await address1Input.fill('Flat 101, Test Building');

    const address2Input = page.getByRole('textbox', { name: 'Area, Street, Sector, Village*' });
    await address2Input.fill('Test Sector 1');

    const landmarkInput = page.getByRole('textbox', { name: 'Landmark (optional)' });
    await landmarkInput.fill('Test Landmark');
    console.log('Filled address details');

    // Save address and proceed to payment
    const saveAddressBtn = page.locator('button:has-text("SAVE AND CONTINUE"), button:has-text("placeOrder"), #placeOrder').first();
    await saveAddressBtn.click();
    console.log('Clicked SAVE AND CONTINUE / placeOrder');
    await page.waitForTimeout(3000);

    // Select EMI option
    const emiOptionText = page.getByText('(NO Cost EMI, Card EMI & Easy').first();
    await emiOptionText.waitFor({ state: 'visible', timeout: 10000 });
    await emiOptionText.click();
    console.log('Selected EMI Option on Wooden Street checkout');

    // Click placeOrder to trigger Razorpay
    const finalPlaceOrderBtn = page.getByRole('button', { name: 'placeOrder' }).first();
    await finalPlaceOrderBtn.click();
    console.log('Clicked final Place Order button');

    // Wait for Razorpay frame
    console.log('Waiting for Razorpay frame...');
    const iframeSelector = 'iframe.razorpay-checkout-frame';
    const razorpayIframe = page.frameLocator(iframeSelector);
    
    await page.waitForSelector(iframeSelector, { state: 'visible', timeout: 30000 });
    console.log('Razorpay iframe detected!');

    // Click EMI option inside the Razorpay iframe
    const emiTab = razorpayIframe.locator('[data-testid="emi"]')
        .or(razorpayIframe.locator('text=Pay Via EMI'))
        .or(razorpayIframe.locator('text=EMI'))
        .first();
    await emiTab.waitFor({ state: 'visible', timeout: 15000 });
    await emiTab.click();
    console.log('Clicked EMI tab inside Razorpay');

    await page.waitForTimeout(2000);

    // Select Credit Card EMI
    const creditEmiOption = razorpayIframe.locator('[data-testid="emi-credit"]')
        .or(razorpayIframe.locator('text=Credit Card'))
        .first();
    await creditEmiOption.waitFor({ state: 'visible', timeout: 15000 });
    await creditEmiOption.click();
    console.log('Clicked Credit Card EMI option');

    await page.waitForTimeout(2000);

    // Let's get the list of banks available.
    const banksLocator = razorpayIframe.locator('[data-testid^="bank-"]');
    const bankCount = await banksLocator.count();
    console.log(`Found ${bankCount} banks in Credit Card EMI section.`);

    const bankLinkMap = {
        'HDFC': 'HDFC_Bank',
        'ICIC': 'ICICI_Bank',
        'UTIB': 'AXIS_Bank',
        'KOTK': 'KOTAK_Bank',
        'YESB': 'YES_Bank',
        'HSBC': 'HSBC_Bank',
        'SBIN': 'SBI_bank',
        'SCBL': 'Standard_Bank',
        'INDB': 'IndusInd_Bank',
        'RATN': 'RBL_Bank',
        'AUBL': 'AUBL',
        'IDFB': 'IDFC_First_Bank'
    };

    const parsePlan = (text1, text2) => {
        const tenureMatch = text1.match(/(\d+)\s*month/i);
        const tenure = tenureMatch ? parseInt(tenureMatch[1]) : 0;
        
        const emiAmountMatch = text1.replace(/,/g, '').match(/₹\s*([\d.]+)/);
        const emiamount = emiAmountMatch ? parseFloat(emiAmountMatch[1]) : 0;
        
        let interestRate = 0;
        if (text2.includes('%')) {
            const interestMatch = text2.match(/([\d.]+)\s*%\s*p\.a\./i);
            interestRate = interestMatch ? parseFloat(interestMatch[1]) : 0;
        }
        
        const isNoCost = text2.toLowerCase().includes('no cost') || text2.toLowerCase().includes('0%') || text2.toLowerCase().includes('0 interest');
        const totalamount = emiamount * tenure;
        
        return {
            month: String(tenure),
            interest: interestRate,
            emi: isNoCost ? 'No Cost EMI' : '',
            emiamount: Math.round(emiamount).toLocaleString('en-IN'),
            totalamount: Math.round(totalamount).toLocaleString('en-IN')
        };
    };

    const scrapedData = [];

    // Loop through each bank accordion
    for (let i = 0; i < bankCount; i++) {
        const bankElement = banksLocator.nth(i);
        const bankTestId = await bankElement.getAttribute('data-testid');
        const bankName = (await bankElement.locator('p').first().innerText()).trim();
        const bankImage = await bankElement.locator('img').first().getAttribute('src').catch(() => '');
        
        const key = bankTestId.replace('bank-', '');
        const mappedLink = bankLinkMap[key] || key;

        console.log(`\nProcessing bank ${i+1}/${bankCount}: ${bankName} (${bankTestId})`);

        // Click the bank to expand it
        await bankElement.scrollIntoViewIfNeeded();
        await bankElement.click();
        await page.waitForTimeout(2000);

        // Take a screenshot of the expanded state
        const safeBankName = bankName.replace(/[^a-zA-Z0-9]/g, '_');
        const screenshotPath = `emi_plans_${safeBankName}.png`;
        await page.screenshot({ path: screenshotPath });
        console.log(`Saved screenshot: ${screenshotPath}`);

        // Locate all visible EMI plans inside the active/expanded bank container
        const plansLocator = razorpayIframe.locator('[data-testid^="emi-plan-"]');
        const planCount = await plansLocator.count();
        console.log(`Found ${planCount} plans for ${bankName}`);

        const emiOptions = [];
        let hasNoCost = 'no';

        for (let j = 0; j < planCount; j++) {
            const planEl = plansLocator.nth(j);
            
            // Extract the first text line (e.g. ₹14,333 x 3 month)
            const text1 = await planEl.locator('p').first().innerText();
            
            // Extract the second text line (e.g. No Cost EMI • ₹0 interest)
            // It might be the second p tag
            const pTags = planEl.locator('p');
            const pCount = await pTags.count();
            let text2 = '';
            if (pCount > 1) {
                text2 = await pTags.nth(1).innerText();
            }

            console.log(`  Plan ${j+1}: "${text1}" | "${text2}"`);
            
            const parsed = parsePlan(text1, text2);
            if (parsed.emi === 'No Cost EMI') {
                hasNoCost = 'yes';
            }
            emiOptions.push(parsed);
        }

        // Calculate offer text (e.g. HDFC has 18%, we can show the 24 month interest text or default text)
        const offerPlan24 = emiOptions.find(p => p.month === '24') || emiOptions[emiOptions.length - 1];
        const offerTextVal = offerPlan24 ? parseInt(offerPlan24.emiamount.replace(/,/g, '')) : 0;

        scrapedData.push({
            Bankname: bankName,
            image: bankImage,
            link: mappedLink,
            nocost: hasNoCost,
            Offer_text: offerTextVal,
            tc_link: 'emi',
            EMI_Options: emiOptions
        });
    }

    // Save scraped data to JSON file
    const outputPath = path.join(__dirname, '../emi_scraped_data.json');
    fs.writeFileSync(outputPath, JSON.stringify(scrapedData, null, 2));
    console.log(`\nSuccessfully scraped data and saved to ${outputPath}`);
});
