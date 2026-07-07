const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.woodenstreet.com/get-in-touch', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').textContent();
    console.log('Total text length:', bodyText.length);
    
    // Search for keywords in the page text
    const keywords = ['contact', 'office', 'support', 'enquiry', 'address', 'store', 'phone', 'write to us', 'email'];
    for (const kw of keywords) {
      const idx = bodyText.toLowerCase().indexOf(kw);
      console.log(`Keyword "${kw}": index ${idx} (Snippet: "${idx >= 0 ? bodyText.slice(idx, idx + 80).replace(/\n/g, ' ') : 'N/A'}")`);
    }

    // Let's print all div containers under the main page tag or main container
    const divs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('main div, #__next div, div[class*="content"]')).slice(0, 15).map(d => ({
        class: d.className,
        text: d.innerText ? d.innerText.trim().slice(0, 50) : ''
      }));
    });
    console.log('Top container divs:', divs);

  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
