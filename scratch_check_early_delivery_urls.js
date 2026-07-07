const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const urls = [
    '/product/lorenz-3-seater-sofa-velvet-dark-olive-green',
    '/product/osbert-3-seater-curved-sofa-sage-green',
    '/product/lorenz-3-seater-sofa-cotton-jade-ivory'
  ];

  for (const url of urls) {
    try {
      await page.goto('https://www.woodenstreet.com' + url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      const text = await page.locator('body').textContent();
      const hasEarly = text.toLowerCase().includes('early');
      console.log(`URL ${url} has "early":`, hasEarly);
      if (hasEarly) {
        // print snippet around early
        const idx = text.toLowerCase().indexOf('early');
        console.log(`  Snippet: "${text.slice(idx - 20, idx + 80).replace(/\n/g, ' ')}"`);
      }
    } catch (e) {
      console.log(`Error on ${url}:`, e.message);
    }
  }

  await browser.close();
})();
