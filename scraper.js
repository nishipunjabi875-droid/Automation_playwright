const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://www.woodenstreet.com/', { waitUntil: 'load' });
  const data = await page.evaluate(() => {
    const mainLinks = Array.from(document.querySelectorAll('a'))
        .filter(a => {
            const inHeader = a.closest('header');
            const inFooter = a.closest('footer');
            const isMenu = a.closest('.menu') || a.closest('#menu') || a.closest('.header');
            return !inHeader && !inFooter && !isMenu;
        })
        .map(a => a.href);
    return {
       mainLinksCount: mainLinks.length,
       sample: mainLinks.slice(0, 10)
    }
  });
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
