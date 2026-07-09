const BasePage = require('./BasePage');

class CartPage extends BasePage {
  constructor(page) {
    super(page);
    this.cartIcon = page.locator('.cart-btn, a[href*="cart"], .header-links .cart').first();
    this.cartItems = page.locator('.cart-item, .cart-list-item, .cart-product-row, tr.product');
    this.removeBtn = page.locator('.remove-item, .delete-item, .cart-remove, a[href*="remove"], .remove').first();
    this.qtyInput = page.locator('.quantity input, .qty-input, input[name*="quantity"]').first();
    this.emptyCartMsg = page.locator('.empty-cart, .empty-cart-text, :text("Your cart is empty")').first();
    this.checkoutBtn = page.locator('a[href*="checkout"], .checkout-btn, button:text("Checkout"), button:text("Proceed to Checkout")').first();
  }

  async openCart() {
    if (await this.cartIcon.isVisible()) {
      await this.cartIcon.click();
      await this.page.waitForLoadState('networkidle');
    } else {
      await this.navigate('/cart');
    }
  }

  async getCartCount() {
    try {
      await this.page.waitForTimeout(1000);
      return await this.cartItems.count();
    } catch (e) {
      return 0;
    }
  }

  async isEmpty() {
    try {
      return await this.emptyCartMsg.isVisible({ timeout: 2000 });
    } catch (e) {
      return false;
    }
  }

  async removeItem() {
    if (await this.removeBtn.isVisible()) {
      await this.removeBtn.click();
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(1000);
      return true;
    }
    return false;
  }

  async proceedToCheckout() {
    if (await this.checkoutBtn.isVisible({ timeout: 3000 })) {
      await this.checkoutBtn.click();
      await this.page.waitForLoadState('networkidle');
      return true;
    }
    return false;
  }
}

module.exports = CartPage;
