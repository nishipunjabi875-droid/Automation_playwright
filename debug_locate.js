const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://beta.teamwoodenstreet.com/home-furnishing');
  
  const coupon = 'summer26';
  const foundInBody = await page.evaluate((text) => {
    return document.body.innerText.toLowerCase().includes(text);
  }, coupon);
  
  console.log(`Found '${coupon}' in body:`, foundInBody);
  
  // Find where it is
  const locators = await page.evaluate((text) => {
    const results = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while(node = walk.nextNode()) {
      if (node.textContent.toLowerCase().includes(text)) {
        let parent = node.parentElement;
        results.push({
            tag: parent.tagName,
            class: parent.className,
            text: node.textContent.trim().substring(0, 50)
        });
      }
    }
    return results;
  }, coupon);
  
  console.log('Locations found:', JSON.stringify(locators, null, 2));
  
  await browser.close();
})();
