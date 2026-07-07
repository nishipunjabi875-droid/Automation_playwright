const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  // 1. Check Desktop Modal Contents
  console.log('=== Desktop Modal Contents ===');
  const contextD = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pageD = await contextD.newPage();
  try {
    await pageD.goto('https://www.woodenstreet.com/', { waitUntil: 'networkidle' });
    await pageD.waitForTimeout(3000);
    
    const profileDropdown = pageD.locator('.style_profileDropdown__tn8_Z, span:has-text("Profile")').first();
    await profileDropdown.hover();
    await pageD.waitForTimeout(500);

    const signInBtn = pageD.locator('span:has-text("SIGN IN"), .style_signinbtn__RI5rE').first();
    if (await signInBtn.isVisible()) {
      await signInBtn.click();
      await pageD.waitForTimeout(3000);

      const dialog = pageD.locator('[role="dialog"]').last();
      if (await dialog.isVisible()) {
        const texts = await dialog.evaluate(el => el.innerText);
        console.log('Desktop dialog text content:\n', texts);
        
        const inputs = await dialog.evaluate(el => {
          return Array.from(el.querySelectorAll('input, button, a')).map(i => ({
            tag: i.tagName,
            type: i.type || '',
            placeholder: i.placeholder || '',
            text: i.innerText || i.value || ''
          }));
        });
        console.log('Desktop dialog inputs/buttons/links:', inputs);
      } else {
        console.log('Desktop dialog not visible');
      }
    }
  } catch (e) {
    console.error('Desktop error:', e);
  } finally {
    await contextD.close();
  }

  // 2. Check Mobile Modal Contents
  console.log('\n=== Mobile Modal Contents ===');
  const contextM = await browser.newContext({
    viewport: { width: 375, height: 667 },
    isMobile: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
  });
  const pageM = await contextM.newPage();
  try {
    await pageM.goto('https://www.woodenstreet.com/', { waitUntil: 'networkidle' });
    await pageM.waitForTimeout(3000);

    const hamburger = pageM.locator('.style_menu-mobile-btn__dfbgY, [class*="menu-mobile-btn"]').first();
    await hamburger.click();
    await pageM.waitForTimeout(1000);

    const loginSignupLink = pageM.locator('.style_login-link__Ujw_k, p:has-text("Login / Signup")').first();
    if (await loginSignupLink.isVisible()) {
      await loginSignupLink.click();
      await pageM.waitForTimeout(3000);

      const dialog = pageM.locator('[role="dialog"]').last();
      if (await dialog.isVisible()) {
        const texts = await dialog.evaluate(el => el.innerText);
        console.log('Mobile dialog text content:\n', texts);

        const inputs = await dialog.evaluate(el => {
          return Array.from(el.querySelectorAll('input, button, a')).map(i => ({
            tag: i.tagName,
            type: i.type || '',
            placeholder: i.placeholder || '',
            text: i.innerText || i.value || ''
          }));
        });
        console.log('Mobile dialog inputs/buttons/links:', inputs);
      } else {
        console.log('Mobile dialog not visible');
      }
    }
  } catch (e) {
    console.error('Mobile error:', e);
  } finally {
    await contextM.close();
  }

  await browser.close();
})();
