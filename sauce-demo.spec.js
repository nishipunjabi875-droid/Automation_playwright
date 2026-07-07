import { test, expect } from '@playwright/test';

test('Cart Operations: Add 2, Remove 1', async ({ page }) => {
  // Navigate to SauceDemo
  await page.goto('https://www.saucedemo.com/');

  // Login
  await page.fill('#user-name', 'standard_user');
  await page.fill('#password', 'secret_sauce');
  await page.click('#login-button');
  await expect(page).toHaveURL('https://www.saucedemo.com/inventory.html');

  // Select first and second products
  const products = page.locator('.inventory_item');

  const product1 = products.nth(0);
  const name1 = await product1.locator('.inventory_item_name').innerText();
  const price1 = await product1.locator('.inventory_item_price').innerText();

  const product2 = products.nth(1);
  const name2 = await product2.locator('.inventory_item_name').innerText();
  const price2 = await product2.locator('.inventory_item_price').innerText();

  console.log(`Adding first product: ${name1} (${price1})`);
  console.log(`Adding second product: ${name2} (${price2})`);

  // Add both to cart
  await product1.locator('button[data-test^="add-to-cart-"]').click();
  await product2.locator('button[data-test^="add-to-cart-"]').click();

  // Validate cart count badge
  const cartBadge = page.locator('.shopping_cart_badge');
  await expect(cartBadge).toHaveText('2');

  // Go to cart
  await page.click('.shopping_cart_link');
  await expect(page).toHaveURL('https://www.saucedemo.com/cart.html');

  // Validate both products are in the cart
  const cartItems = page.locator('.cart_item');
  await expect(cartItems).toHaveCount(2);

  // Verify details for both
  await expect(cartItems.nth(0).locator('.inventory_item_name')).toHaveText(name1);
  await expect(cartItems.nth(0).locator('.inventory_item_price')).toHaveText(price1);
  await expect(cartItems.nth(1).locator('.inventory_item_name')).toHaveText(name2);
  await expect(cartItems.nth(1).locator('.inventory_item_price')).toHaveText(price2);

  // Remove the first product from the cart
  console.log(`Removing product: ${name1}`);
  await cartItems.nth(0).locator('button[data-test^="remove-"]').click();

  // Validate cart count badge after removal
  await expect(cartBadge).toHaveText('1');

  // Validate cart items count
  await expect(cartItems).toHaveCount(1);

  // Validate that the remaining product is the second one
  await expect(cartItems.locator('.inventory_item_name')).toHaveText(name2);
  await expect(cartItems.locator('.inventory_item_price')).toHaveText(price2);

  // Click on Checkout
  console.log('Clicking on Checkout');
  await page.click('#checkout');
  await expect(page).toHaveURL('https://www.saucedemo.com/checkout-step-one.html');

  // Fill in Checkout Information
  console.log('Filling checkout information');
  await page.fill('#first-name', 'John');
  await page.fill('#last-name', 'Doe');
  await page.fill('#postal-code', '123456');

  // Click on Continue
  console.log('Clicking on Continue');
  await page.click('#continue');

  // Validate landing on checkout-step-two
  await expect(page).toHaveURL('https://www.saucedemo.com/checkout-step-two.html');
  console.log('Successfully reached the checkout overview page');

  // Validate product details on overview page
  const overviewItemName = await page.locator('.inventory_item_name').innerText();
  const overviewItemPrice = await page.locator('.inventory_item_price').innerText();

  console.log(`Validating product in overview: ${overviewItemName} (${overviewItemPrice})`);
  expect(overviewItemName).toBe(name2);
  expect(overviewItemPrice).toBe(price2);

  // Parse price values (removing currency symbols and labels)
  const getPriceValue = (text) => parseFloat(text.replace(/[^0-9.]/g, ''));

  const itemTotalText = await page.locator('.summary_subtotal_label').innerText();
  const taxText = await page.locator('.summary_tax_label').innerText();
  const totalPriceText = await page.locator('.summary_total_label').innerText();

  const subtotalValue = getPriceValue(itemTotalText);
  const taxValue = getPriceValue(taxText);
  const totalValue = getPriceValue(totalPriceText);
  const itemPriceValue = getPriceValue(price2);

  console.log(`Subtotal: ${subtotalValue}, Tax: ${taxValue}, Total: ${totalValue}`);

  // Assertions
  expect(subtotalValue).toBe(itemPriceValue);
  expect(subtotalValue + taxValue).toBeCloseTo(totalValue, 2);

  console.log('Price validation successful: Subtotal + Tax = Total');

  // Click Finish
  await page.click('#finish');
  await expect(page).toHaveURL('https://www.saucedemo.com/checkout-complete.html');
  console.log('Checkout completed successfully');
});