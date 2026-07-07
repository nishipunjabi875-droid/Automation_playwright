const { chromium } = require("@playwright/test");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    console.log("Navigating to chairs page...");
    await page.goto("https://beta.teamwoodenstreet.com/chairs", { waitUntil: "load" });
    await page.waitForTimeout(2500); // settleMs

    const selectors = ['.mid-banner', '.category-promo', '.middle-strip', '.section-banner', 'img[src*="offer_strip"]'];
    for (const sel of selectors) {
      const els = await page.$$(sel);
      console.log(`Selector '${sel}' found ${els.length} elements.`);
      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        const visible = await el.isVisible();
        const text = await el.textContent();
        const tagName = await el.evaluate(n => n.tagName.toLowerCase());
        const alt = tagName === 'img' ? await el.getAttribute('alt') : '';
        const src = tagName === 'img' ? await el.getAttribute('src') : '';
        console.log(`  Element ${i}: tagName=${tagName}, visible=${visible}, text='${text}', alt='${alt}', src='${src}'`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
}

main();
