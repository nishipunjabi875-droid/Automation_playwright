const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://beta.teamwoodenstreet.com/home-furnishing');
  
  const bodyText = await page.locator('body').textContent();
  console.log('Contains summer season sale:', bodyText.toLowerCase().includes('summer season sale'));
  console.log('Contains summer26:', bodyText.toLowerCase().includes('summer26'));
  
  const imgs = await page.$$eval('img', imgs => imgs.map(i => (i.alt + ' ' + i.src).toLowerCase()));
  console.log('Images containing summer season sale:', imgs.filter(i => i.includes('summer season sale')));
  console.log('Images containing summer26:', imgs.filter(i => i.includes('summer26')));
  
  await browser.close();
})();
