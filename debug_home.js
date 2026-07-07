const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://beta.teamwoodenstreet.com/');
  
  const coupon = 'summer26';
  const sale = 'summer season sale';
  
  const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
  console.log(`Found '${coupon}' in visible body:`, bodyText.includes(coupon));
  console.log(`Found '${sale}' in visible body:`, bodyText.includes(sale));
  
  // Find where it is
  const locators = await page.evaluate((terms) => {
    const results = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while(node = walk.nextNode()) {
      const txt = node.textContent.toLowerCase();
      if (txt.includes(terms[0]) || txt.includes(terms[1])) {
        let parent = node.parentElement;
        results.push({
            tag: parent.tagName,
            class: parent.className,
            text: node.textContent.trim().substring(0, 50)
        });
      }
    }
    return results;
  }, [coupon, sale]);
  
  console.log('Text Locations found:', JSON.stringify(locators, null, 2));

  const imgs = await page.$$eval('img', imgs => imgs.map(i => (i.alt + ' ' + i.src).toLowerCase()));
  console.log(`Images with '${coupon}':`, imgs.filter(i => i.includes(coupon)));
  console.log(`Images with '${sale}':`, imgs.filter(i => i.includes(sale)));

  await browser.close();
})();
