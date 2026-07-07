const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const urls = [
    '/furniture-franchise',
    '/get-in-touch',
    '/furniture-store-kirti-nagar-delhi',
    '/custom-furniture',
    '/sell-on-woodenstreet'
  ];

  for (const url of urls) {
    console.log(`\n=========================================`);
    console.log(`URL: https://www.woodenstreet.com${url}`);
    console.log(`=========================================`);
    try {
      await page.goto(`https://www.woodenstreet.com${url}`, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(3000);
      
      const inputs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('input, textarea, select')).map((el, i) => {
          let parentClasses = [];
          let p = el.parentElement;
          for (let j = 0; j < 3 && p; j++) {
            parentClasses.push(`${p.tagName.toLowerCase()}${p.id ? '#' + p.id : ''}${p.className ? '.' + p.className.split(' ').join('.') : ''}`);
            p = p.parentElement;
          }
          return {
            index: i + 1,
            tag: el.tagName.toLowerCase(),
            type: el.type || '',
            name: el.name || '',
            id: el.id || '',
            class: el.className || '',
            placeholder: el.placeholder || '',
            parent: parentClasses.reverse().join(' > ')
          };
        });
      });
      
      console.log(`Found ${inputs.length} inputs:`);
      console.log(JSON.stringify(inputs, null, 2));

    } catch (e) {
      console.log('Error:', e.message);
    }
  }

  await browser.close();
})();
