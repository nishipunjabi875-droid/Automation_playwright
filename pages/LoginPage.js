const BasePage = require('./BasePage');

class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    this.loginIcon = page.locator('.header-links .login, a[href*="login"], .login-btn, #login-form-toggle').first();
    this.emailInput = page.locator('#login-email, input[name="email"], input[type="email"]').first();
    this.passwordInput = page.locator('#login-password, input[name="password"], input[type="password"]').first();
    this.submitButton = page.locator('#login-submit, button[type="submit"], input[type="submit"]').first();
    this.profileLink = page.locator('a[href*="profile"], .profile-icon, .user-name').first();
    this.logoutButton = page.locator('a[href*="logout"], button.logout').first();
  }

  async login(email, password) {
    // If there is an explicit login button in header, click it to show modal/page
    if (await this.loginIcon.isVisible()) {
      await this.loginIcon.click();
    }
    
    // Fill credentials (supporting standard fields or fallback to locator evaluation)
    await this.emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    
    // Wait for either navigation or dashboard indication
    try {
      await this.page.waitForLoadState('networkidle');
      return true;
    } catch (e) {
      return false;
    }
  }

  async isLoggedIn() {
    try {
      return await this.profileLink.isVisible({ timeout: 3000 });
    } catch (e) {
      return false;
    }
  }

  async logout() {
    if (await this.profileLink.isVisible()) {
      await this.profileLink.hover();
      if (await this.logoutButton.isVisible()) {
        await this.logoutButton.click();
        await this.page.waitForLoadState('networkidle');
      }
    }
  }
}

module.exports = LoginPage;
