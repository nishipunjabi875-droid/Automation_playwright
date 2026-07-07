const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const urls = [
    '/modular-kitchen-designs',
    '/modular-wardrobe-designs',
    '/sofa',
    '/product/lorenz-3-seater-sofa-cotton-jade-ivory'
  ];

  for (const url of urls) {
    console.log(`\nURL: https://www.woodenstreet.com${url}`);
    try {
      await page.goto(`https://www.woodenstreet.com${url}`, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(3000);
      
      const formInfo = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map(f => ({
          id: f.id,
          class: f.className,
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            name: i.name,
            type: i.type,
            placeholder: i.placeholder
          }))
        }));
      });
      console.log('Forms found:', JSON.stringify(formInfo, null, 2));

      const buttonTexts = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button, a, [role="button"]'))
          .map(el => el.innerText ? el.innerText.trim() : '')
          .filter(t => t.length > 0 && t.length < 50);
      });
      console.log('Button/Link texts:', buttonTexts.slice(0, 50));

      // Also look for divs that look like forms
      const divInfo = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('div[class*="form"], section[class*="form"], div[id*="form"]'))
          .slice(0, 5)
          .map(d => ({
            id: d.id,
            class: d.className
          }));
      });
      console.log('Divs resembling forms:', divInfo);

    } catch (e) {
      console.log('Error:', e.message);
    }
  }

  await browser.close();
})();
