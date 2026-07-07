const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.woodenstreet.com/furniture-store-kirti-nagar-delhi', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, a, [role="button"]'))
        .map(el => ({
          text: el.innerText ? el.innerText.trim().replace(/\n/g, ' ') : '',
          tag: el.tagName.toLowerCase(),
          class: el.className,
          href: el.getAttribute('href') || ''
        }))
        .filter(b => b.text.length > 0 && b.text.length < 60);
    });

    console.log(`Found ${buttons.length} buttons/links:`);
    console.log(JSON.stringify(buttons, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
