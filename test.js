const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://www.woodenstreet.com/furniture', { waitUntil: 'load', timeout: 60000 });
  const imgs = await page.$$eval('img', imgs => imgs.map(i => ({ src: i.src, alt: i.alt, class: i.className })));
  console.log('Images containing summer/sale/banner:');
  console.log(imgs.filter(i => {
      const src = i.src ? i.src.toLowerCase() : '';
      const alt = i.alt ? i.alt.toLowerCase() : '';
      const cls = i.class ? i.class.toLowerCase() : '';
      return src.includes('summer') || alt.includes('summer') || 
             src.includes('sale') || alt.includes('sale') || 
             src.includes('banner') || cls.includes('banner');
  }));
  await browser.close();
})();
