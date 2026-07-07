const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.woodenstreet.com/furniture-store-kirti-nagar-delhi', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const btn = page.locator('button:has-text("Book an Appointment"), a:has-text("Book an Appointment")').first();
    if (await btn.count() > 0 && await btn.isVisible()) {
      console.log('Clicking "Book an Appointment" button...');
      await btn.click();
      await page.waitForTimeout(2000);

      // Inspect inputs in visible modal
      const inputs = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"], .modal, .popup, [class*="modal"], [class*="popup"]');
        if (!dialog) return 'No visible dialog container found';
        
        return Array.from(dialog.querySelectorAll('input, textarea, select')).map((el, i) => {
          return {
            index: i + 1,
            tag: el.tagName.toLowerCase(),
            type: el.type || '',
            name: el.name || '',
            id: el.id || '',
            placeholder: el.placeholder || ''
          };
        });
      });

      console.log('Modal Inputs:', inputs);
    } else {
      console.log('Book an Appointment button not visible!');
    }

  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
