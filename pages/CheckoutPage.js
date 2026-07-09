const BasePage = require('./BasePage');

class CheckoutPage extends BasePage {
  constructor(page) {
    super(page);
    this.emailInput = page.locator('#checkout-email, input[name="email"], input[type="email"]').first();
    this.phoneInput = page.locator('#checkout-phone, input[name="phone"], input[type="tel"]').first();
    this.firstNameInput = page.locator('#first-name, input[name="firstname"], input[placeholder*="First Name"]').first();
    this.lastNameInput = page.locator('#last-name, input[name="lastname"], input[placeholder*="Last Name"]').first();
    this.addressInput = page.locator('#address, input[name="address1"], textarea[name*="address"]').first();
    this.cityInput = page.locator('#city, input[name="city"]').first();
    this.stateSelect = page.locator('#state, select[name="state"], select[name="zone_id"]').first();
    this.pincodeInput = page.locator('#postcode, input[name="postcode"], input[name="pincode"]').first();
    this.continueBtn = page.locator('#button-shipping-address, button:text("Continue"), button:text("Deliver Here"), .deliver-here').first();
    
    // Coupon Section
    this.couponInput = page.locator('#coupon, input[name="coupon"], input[placeholder*="Coupon"], input[placeholder*="Promo"]').first();
    this.couponApplyBtn = page.locator('#button-coupon, .apply-coupon-btn, button:text("Apply"), .coupon-btn').first();
    this.couponMsg = page.locator('.coupon-message, .coupon-status, .coupon-alert, .alert-success, .alert-danger').first();
    
    // Payment Options Section
    this.paymentOptions = page.locator('.payment-method, .payment-options, #payment-methods-wrapper, .payment-selector');
    this.pincodeStatus = page.locator('.pincode-status, .pincode-response, .delivery-info').first();
  }

  async fillShippingDetails(details = {}) {
    const data = {
      email: details.email || 'guest_user_test@gmail.com',
      phone: details.phone || '9999999999',
      firstName: details.firstName || 'John',
      lastName: details.lastName || 'Doe',
      address: details.address || '123 Test Street, Near Park',
      city: details.city || 'Jaipur',
      pincode: details.pincode || '302015',
      ...details
    };

    try {
      if (await this.emailInput.isVisible({ timeout: 3000 })) {
        await this.emailInput.fill(data.email);
      }
      if (await this.phoneInput.isVisible({ timeout: 1000 })) {
        await this.phoneInput.fill(data.phone);
      }
      if (await this.firstNameInput.isVisible({ timeout: 1000 })) {
        await this.firstNameInput.fill(data.firstName);
      }
      if (await this.lastNameInput.isVisible({ timeout: 1000 })) {
        await this.lastNameInput.fill(data.lastName);
      }
      if (await this.addressInput.isVisible({ timeout: 1000 })) {
        await this.addressInput.fill(data.address);
      }
      if (await this.cityInput.isVisible({ timeout: 1000 })) {
        await this.cityInput.fill(data.city);
      }
      if (await this.pincodeInput.isVisible({ timeout: 1000 })) {
        await this.pincodeInput.fill(data.pincode);
      }

      if (await this.stateSelect.isVisible({ timeout: 1000 })) {
        await this.stateSelect.selectOption({ index: 1 }).catch(() => {});
      }

      if (await this.continueBtn.isVisible({ timeout: 2000 })) {
        await this.continueBtn.click();
        await this.page.waitForTimeout(1000);
        return true;
      }
    } catch (e) {
      console.error('Error filling shipping details: ' + e.message);
    }
    return false;
  }

  async applyCoupon(couponCode = 'WELCOME10') {
    if (await this.couponInput.isVisible({ timeout: 3000 })) {
      await this.couponInput.fill(couponCode);
      await this.couponApplyBtn.click();
      await this.page.waitForTimeout(1500);
      
      const message = await this.couponMsg.isVisible() ? (await this.couponMsg.innerText()).trim() : 'Applied (no message found)';
      return {
        success: true,
        message
      };
    }
    return {
      success: false,
      message: 'Coupon input not found.'
    };
  }

  async hasPaymentOptions() {
    try {
      await this.page.waitForSelector('.payment-method, .payment-options, #payment-methods-wrapper, .payment-selector, :text("Payment")', { timeout: 8000 });
      return await this.paymentOptions.count() > 0 || (await this.page.innerText('body')).includes('Payment');
    } catch (e) {
      return false;
    }
  }
}

module.exports = CheckoutPage;
