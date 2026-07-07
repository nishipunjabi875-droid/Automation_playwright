const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  // Set up request routing to block unnecessary, heavy resources
  await page.route('**/*', (route) => {
    const request = route.request();
    const type = request.resourceType();
    const url = request.url();

    // Block images, fonts, and analytics/ads/trackers
    const shouldBlock = 
      type === 'image' || 
      type === 'font' || 
      url.includes('google-analytics') || 
      url.includes('googletagmanager') || 
      url.includes('facebook.net') || 
      url.includes('hotjar') || 
      url.includes('doubleclick');

    if (shouldBlock) {
      route.abort();
    } else {
      route.continue();
    }
  });

  const startTime = Date.now();
  try {
    const url = 'https://www.woodenstreet.com/product/lorenz-3-seater-sofa-cotton-jade-ivory';
    console.log(`Navigating to Lorenz Sofa PDP: ${url}`);
    
    // Using domcontentloaded is much faster than load/networkidle
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    console.log(`Page loaded in ${((Date.now() - startTime) / 1000).toFixed(2)}s`);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    const videoThumb = page.locator('.image-gallery-thumbnail.hasvideo').first();
    await videoThumb.click();
    console.log('Clicked video thumbnail.');
    await page.waitForTimeout(2000);

    const activeSlide = page.locator('.image-gallery-slide.image-gallery-center.isvideo, .image-gallery-slide.image-gallery-center');
    if (await activeSlide.first().isVisible()) {
      await activeSlide.first().click();
      await page.waitForTimeout(2000);
    }

    const videos = page.locator('video');
    const vCount = await videos.count();
    console.log(`Video element count: ${vCount}`);
    if (vCount > 0) {
      const src = await videos.first().getAttribute('src').catch(() => '');
      console.log(`Video Src: ${src}`);
      
      const duration = await videos.first().evaluate(el => el.duration).catch(() => 0);
      console.log(`Video Duration: ${duration}s`);
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Total execution time: ${totalTime}s`);
    await browser.close();
  }
})();
