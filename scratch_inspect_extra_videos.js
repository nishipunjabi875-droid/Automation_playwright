const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  try {
    const url = 'https://www.woodenstreet.com/product/lorenz-3-seater-sofa-cotton-jade-ivory';
    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);
    await page.keyboard.press('Escape'); // dismiss modals
    await page.waitForTimeout(2000);

    console.log('\n--- Scanning for other video indicators/sections on the page ---');

    // 1. Check for headings or labels with "video" or "play"
    const textLocators = page.locator('text=/video/i, text=/watch/i, text=/play/i');
    const txtCount = await textLocators.count();
    console.log(`Found ${txtCount} elements with video/watch/play text.`);
    for (let i = 0; i < Math.min(txtCount, 15); i++) {
      const tag = await textLocators.nth(i).evaluate(el => el.tagName);
      const text = await textLocators.nth(i).innerText();
      const cls = await textLocators.nth(i).getAttribute('class').catch(() => '');
      console.log(`- Text Match ${i}: tag=${tag} | text="${text.trim()}" | class="${cls}"`);
    }

    // 2. Find any video or iframe elements present outside the gallery slide initially
    const videos = page.locator('video');
    const vCount = await videos.count();
    console.log(`\nInitially found ${vCount} <video> elements on page:`);
    for (let i = 0; i < vCount; i++) {
      const html = await videos.nth(i).evaluate(el => el.outerHTML);
      console.log(`- Video ${i}: ${html.substring(0, 200)}...`);
    }

    const iframes = page.locator('iframe');
    const iCount = await iframes.count();
    console.log(`\nInitially found ${iCount} <iframe> elements on page:`);
    for (let i = 0; i < iCount; i++) {
      const src = await iframes.nth(i).getAttribute('src').catch(() => '');
      console.log(`- Iframe ${i} Src: ${src}`);
    }

    // 3. Look for sections related to reviews, video reviews, or product videos
    // Scroll down to trigger lazy load of lower sections
    console.log('\nScrolling page down to trigger lazy loading of footer/reviews sections...');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(3000);

    // Let's recheck video/iframe count
    const vCountScroll = await page.locator('video').count();
    const iCountScroll = await page.locator('iframe').count();
    console.log(`\nAfter scrolling, found:`);
    console.log(`- <video> tags: ${vCountScroll}`);
    for (let i = 0; i < vCountScroll; i++) {
      const html = await page.locator('video').nth(i).evaluate(el => el.outerHTML);
      console.log(`  Video ${i} HTML: ${html.substring(0, 200)}...`);
    }
    console.log(`- <iframe> tags: ${iCountScroll}`);
    for (let i = 0; i < iCountScroll; i++) {
      const src = await page.locator('iframe').nth(i).getAttribute('src').catch(() => '');
      console.log(`  Iframe ${i} Src: ${src}`);
    }

    // Let's capture a screenshot of the scrolled sections
    await page.screenshot({ path: 'reports/lorenz_scrolled_state.png', fullPage: false });
    console.log('Saved reports/lorenz_scrolled_state.png');

  } catch (err) {
    console.error('Error during scan:', err.message);
  } finally {
    await browser.close();
  }
})();
