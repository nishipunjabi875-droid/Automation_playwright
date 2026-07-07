const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  try {
    const url = 'https://www.woodenstreet.com/product/lorenz-3-seater-sofa-cotton-jade-ivory';
    console.log(`Navigating to Lorenz Sofa PDP: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);
    await page.keyboard.press('Escape'); // dismiss modals
    await page.waitForTimeout(2000);

    // Locate the first tile in the videoSlider
    const videoTile = page.locator('.videoSlider .swiper-slide-active, .videoSlider .cursor-pointer').first();
    const isVisible = await videoTile.isVisible().catch(() => false);
    console.log(`Product Videos Slider Tile visible: ${isVisible}`);

    if (isVisible) {
      console.log('Clicking the video slider tile...');
      await videoTile.click();
      await page.waitForTimeout(5000);

      // Check if a <video> element was loaded inline
      const inlineVideos = videoTile.locator('video');
      const inlineVideoCount = await inlineVideos.count();
      console.log(`Inline video tags count in the clicked tile: ${inlineVideoCount}`);
      if (inlineVideoCount > 0) {
        const html = await inlineVideos.first().evaluate(el => el.outerHTML);
        console.log(`Inline Video HTML: ${html}`);
      }

      // Check if a <video> or <iframe> tag was loaded anywhere on the page (e.g. inside a modal dialog)
      const pageVideos = page.locator('video');
      const pvCount = await pageVideos.count();
      console.log(`Total <video> tags on page: ${pvCount}`);
      for (let i = 0; i < pvCount; i++) {
        const html = await pageVideos.nth(i).evaluate(el => el.outerHTML);
        const src = await pageVideos.nth(i).getAttribute('src').catch(() => '');
        console.log(`Video ${i} HTML: ${html.substring(0, 300)}`);
        console.log(`Video ${i} Src: ${src}`);
      }

      const pageIframes = page.locator('iframe');
      const piCount = await pageIframes.count();
      console.log(`Total <iframe> tags on page: ${piCount}`);
      for (let i = 0; i < piCount; i++) {
        const src = await pageIframes.nth(i).getAttribute('src').catch(() => '');
        console.log(`Iframe ${i} Src: ${src}`);
      }

      await page.screenshot({ path: 'reports/lorenz_after_slider_tile_click.png' });
      console.log('Saved reports/lorenz_after_slider_tile_click.png');
    } else {
      console.log('No video slider tile found.');
    }

  } catch (err) {
    console.error('Click error:', err.message);
  } finally {
    await browser.close();
  }
})();
