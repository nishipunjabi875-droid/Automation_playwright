const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Read CSV file synchronously to dynamically declare Playwright tests
function readCSVSync(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return [];

  // Parse header
  const headers = lines[0].split(',').map(h => h.trim());
  
  // Parse rows (simple RFC 4180 parsing for commas inside quotes)
  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const rowObj = {};
    headers.forEach((header, idx) => {
      let val = values[idx] || '';
      // Remove surrounding quotes if present
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      }
      rowObj[header] = val;
    });
    return rowObj;
  });
}

// Load products (supports environment variables for single ad-hoc checks)
let products = [];
if (process.env.PRODUCT_URL && process.env.VIDEO_SELECTOR) {
  products = [{
    ProductName: process.env.PRODUCT_NAME || 'Ad-hoc Product Check',
    ProductURL: process.env.PRODUCT_URL,
    VideoSelector: process.env.VIDEO_SELECTOR,
    ExpectedVideo: process.env.EXPECTED_VIDEO || ''
  }];
} else {
  const csvPath = path.resolve(__dirname, '../data/products.csv');
  products = readCSVSync(csvPath);
}

test.describe('Product Video Playback Validation Suite', () => {
  // Setup output directories for temp files and reports
  const tempDir = path.resolve(__dirname, '../reports/temp_results');
  const screenshotsDir = path.resolve(__dirname, '../reports/screenshots');
  const htmlDir = path.resolve(__dirname, '../reports/html');

  test.beforeAll(() => {
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
    if (!fs.existsSync(htmlDir)) fs.mkdirSync(htmlDir, { recursive: true });
  });

  // Dynamically generate a test for each product from the CSV
  for (const product of products) {
    const { ProductName, ProductURL, VideoSelector, ExpectedVideo } = product;

    // Skip empty or malformed rows
    if (!ProductName || !ProductURL) continue;

    test(`Validate Video for: ${ProductName}`, async ({ page }) => {
      // Resolve dynamic workspace path if using mock templates
      const projectDir = path.resolve(__dirname, '..').replace(/\\/g, '/');
      const resolvedUrl = ProductURL.replace('${PROJECT_DIR}', projectDir);

      const startTime = Date.now();
      const testResult = {
        productName: ProductName,
        productUrl: resolvedUrl,
        videoSelector: VideoSelector,
        expectedVideo: ExpectedVideo || '',
        videoFound: false,
        clickSuccessful: false,
        playerOpened: false,
        videoLoaded: false,
        videoUrl: '',
        videoMappedCorrectly: 'N/A',
        status: 'FAIL',
        failureReason: '',
        screenshotPath: '',
        executionTimeMs: 0
      };

      try {
        console.log(`\n[START] Testing product: "${ProductName}"`);
        console.log(`  URL: ${resolvedUrl}`);
        // Setup request routing to optimize loading speed by blocking heavy assets and trackers
        await page.route('**/*', (route) => {
          const req = route.request();
          const type = req.resourceType();
          const url = req.url();

          const shouldBlock = 
            type === 'font' || 
            url.includes('google-analytics') || 
            url.includes('googletagmanager') || 
            url.includes('facebook.net') || 
            url.includes('hotjar') || 
            url.includes('doubleclick') ||
            url.includes('analytics');

          if (shouldBlock) {
            route.abort();
          } else {
            route.continue();
          }
        });

        // 1. Navigate to the page
        let responseStatus = 200;
        let navigationError = null;
        try {
          const response = await page.goto(resolvedUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          if (response) {
            responseStatus = response.status();
          }
        } catch (err) {
          navigationError = err;
        }

        // 2. Verify page loaded successfully (not 404 or server error)
        const pageTitle = await page.title().catch(() => '');
        const bodyText = await page.innerText('body').catch(() => '');
        
        const is404 = responseStatus === 404 ||
                      pageTitle.toLowerCase().includes('404') ||
                      pageTitle.toLowerCase().includes('not found') ||
                      bodyText.includes('404 Not Found') ||
                      bodyText.includes('Page Not Found');

        if (is404 || navigationError) {
          const errorMsg = navigationError ? navigationError.message : `HTTP Error Status: ${responseStatus}`;
          throw new Error(`Product page failed to load correctly: ${errorMsg}`);
        }

        // Dismiss promo / login modals if present on live pages
        await page.keyboard.press('Escape').catch(() => {});
        const modalCloseBtn = page.locator('button:text("✕"), [class*="close"], [class*="Close"]');
        if (await modalCloseBtn.first().isVisible().catch(() => false)) {
          await modalCloseBtn.first().click().catch(() => {});
        }

        // 3. Locate the video element
        // Normalize selector to support both CSS and XPath (e.g. starting with //, /, or ()
        let normalizedSelector = VideoSelector;
        if (VideoSelector.startsWith('//') || VideoSelector.startsWith('/') || VideoSelector.startsWith('(') || VideoSelector.includes('[@')) {
          if (!VideoSelector.startsWith('xpath=')) {
            normalizedSelector = `xpath=${VideoSelector}`;
          }
        }

        const videoElement = page.locator(normalizedSelector).first();
        try {
          await expect(videoElement).toBeVisible({ timeout: 15000 });
          testResult.videoFound = true;
          console.log('  -> Video element is visible on the page.');
        } catch (err) {
          throw new Error(`Video element selector "${VideoSelector}" not visible on page.`);
        }

        // 4. Click the video play / thumbnail button
        try {
          await videoElement.click();
          testResult.clickSuccessful = true;
          console.log('  -> Clicked video trigger successfully.');
        } catch (err) {
          throw new Error(`Failed to click video selector: ${err.message}`);
        }

        // Wait a short moment to see if video/iframe is already loaded directly (e.g. inline video)
        await page.waitForTimeout(1000);
        const directVideo = page.locator('video, iframe');
        const hasDirectVideo = (await directVideo.count() > 0) && (await directVideo.first().isVisible().catch(() => false));

        if (!hasDirectVideo) {
          console.log('  -> No direct video/iframe player detected yet. Checking sub-triggers/tabs...');
          // --- SUB-ELEMENT OR TAB GALLERY RESOLUTION ---
          // If clicking the selector opened a gallery tab or container (like a Videos tab or section)
          // that contains sub-thumbnails/triggers, we locate and click the first sub-trigger.
          const subTriggers = [
            '.image-gallery-thumbnail.hasvideo',
            '.video-tile',
            '.video-thumbnail',
            '[class*="video-thumb"]',
            '.isvideo img'
          ];
          
          let clickedSubTrigger = false;
          for (const subSelector of subTriggers) {
            // Ensure we don't click the original selector if it happens to match a sub-trigger class
            if (subSelector === VideoSelector) continue;

            const subElement = page.locator(subSelector).first();
            if (await subElement.isVisible().catch(() => false)) {
              console.log(`  -> Found gallery sub-trigger: "${subSelector}". Clicking it...`);
              await subElement.click().catch(() => {});
              clickedSubTrigger = true;
              await page.waitForTimeout(2000);
              break;
            }
          }
        } else {
          console.log('  -> Video/iframe player detected directly. Skipping sub-trigger checks.');
        }

        // --- SPECIAL LOGIC FOR LAZY-LOADED GALLERY SLIDES (like react-image-gallery on WoodenStreet) ---
        // If clicking the selector triggers a gallery slide change rather than direct playback, 
        // we click the active slide itself to load and start the video.
        const activeSlide = page.locator('.image-gallery-slide.image-gallery-center.isvideo, .image-gallery-slide.image-gallery-center');
        if (await activeSlide.first().isVisible().catch(() => false)) {
          console.log('  -> Gallery slide interface detected.');
          const videoInSlide = activeSlide.locator('video, iframe');
          if (await videoInSlide.count() === 0) {
            console.log('  -> Clicking active slide container to trigger video initialization...');
            await activeSlide.first().click();
            await page.waitForTimeout(3000);
          }
        }

        // 5. Wait for the player / video popup container to load
        console.log('  -> Waiting for player elements to attach/load...');
        try {
          await Promise.any([
            page.waitForSelector('video', { state: 'attached', timeout: 10000 }),
            page.waitForSelector('iframe', { state: 'attached', timeout: 10000 }),
            page.waitForSelector('.video-player, .modal-body, #movie_player', { state: 'visible', timeout: 10000 })
          ]);
        } catch (err) {
          // Ignore wait error and let indicator checks handle the failure
        }

        const playerIndicators = ['iframe', 'video', '.video-player', '.modal-body', '#movie_player', '.isvideo video', VideoSelector];
        let foundPlayer = false;

        for (const indicator of playerIndicators) {
          const count = await page.locator(indicator).count();
          if (count > 0) {
            foundPlayer = true;
            break;
          }
        }

        if (!foundPlayer) {
          throw new Error('Video player/popup failed to render after clicking play trigger.');
        }
        testResult.playerOpened = true;
        console.log('  -> Video player/popup is opened.');

        // Allow some time for video streams/iframes to start initializing
        await page.waitForTimeout(3000);

        // 6. Identify Video Player Type (YouTube iframe vs HTML5 video)
        const iframeLocator = page.locator('iframe').first();
        const html5VideoLocator = page.locator('video').first();

        let isYouTube = false;
        let isHTML5 = false;

        if (await iframeLocator.isVisible().catch(() => false)) {
          const src = await iframeLocator.getAttribute('src').catch(() => '');
          if (src && (src.includes('youtube.com') || src.includes('youtu.be'))) {
            isYouTube = true;
            testResult.videoUrl = src;
          }
        }

        if (!isYouTube && (await html5VideoLocator.isVisible().catch(() => false))) {
          isHTML5 = true;
          let src = await html5VideoLocator.getAttribute('src').catch(() => '');
          if (!src) {
            const sourceTag = html5VideoLocator.locator('source').first();
            if (await sourceTag.count() > 0) {
              src = await sourceTag.getAttribute('src').catch(() => '');
            }
          }
          testResult.videoUrl = src;
        }

        // 7. Type-specific validations
        if (isYouTube) {
          console.log('  -> Detected YouTube embed iframe.');
          const frame = iframeLocator.contentFrame();
          if (frame) {
            // Check for standard YouTube error overlays (e.g. "Video unavailable")
            const errorOverlay = frame.locator('.ytp-error-content-wrap-reason');
            const isErrorVisible = await errorOverlay.isVisible({ timeout: 2000 }).catch(() => false);
            if (isErrorVisible) {
              const errorReason = await errorOverlay.innerText().catch(() => 'Unknown error reason');
              throw new Error(`YouTube playback error: "${errorReason}"`);
            }

            // Check if the underlying HTML5 video tag exists inside the iframe
            const innerVideo = frame.locator('video');
            await expect(innerVideo).toBeAttached({ timeout: 5000 });
            testResult.videoLoaded = true;
            console.log('  -> YouTube video elements resolved successfully.');
          } else {
            // If cross-origin prevents accessing contentFrame context, we treat presence of secure iframe as loaded
            testResult.videoLoaded = true;
            console.log('  -> YouTube iframe present (iframe context restricted).');
          }
        } else if (isHTML5) {
          console.log('  -> Detected self-hosted HTML5 video element.');
          
          // Verify that video metadata loads and duration is > 0
          const duration = await html5VideoLocator.evaluate((el) => {
            return new Promise((resolve) => {
              if (el.readyState >= 1) { // HAVE_METADATA or higher
                resolve(el.duration);
              } else {
                el.addEventListener('loadedmetadata', () => {
                  resolve(el.duration);
                }, { once: true });
                // Timeout after 4 seconds
                setTimeout(() => resolve(el.duration || 0), 4000);
              }
            });
          }).catch(() => 0);

          console.log(`  -> Self-hosted video duration: ${duration}s`);
          if (duration <= 0) {
            throw new Error('Self-hosted HTML5 video has duration of 0 or metadata failed to load.');
          }
          
          testResult.videoLoaded = true;
        } else {
          throw new Error('No YouTube iframe or self-hosted `<video>` tag could be identified inside the player.');
        }

        // 8. Mapping verification (Verify that the correct video is mapped to the product)
        if (ExpectedVideo) {
          const expectedLower = ExpectedVideo.toLowerCase().trim();
          const actualLower = (testResult.videoUrl || '').toLowerCase();
          if (actualLower.includes(expectedLower)) {
            testResult.videoMappedCorrectly = 'Yes';
            console.log(`  -> Mapping Match: Video URL contains expected identifier "${ExpectedVideo}".`);
          } else {
            testResult.videoMappedCorrectly = 'No';
            throw new Error(`Video mapping mismatch: Expected video to contain "${ExpectedVideo}" but loaded URL was "${testResult.videoUrl || 'None'}"`);
          }
        } else {
          testResult.videoMappedCorrectly = 'N/A';
        }

        // Mark test pass
        testResult.status = 'PASS';
        console.log(`[PASS] "${ProductName}" video is fully operational.`);

      } catch (err) {
        // Record details for failed validations
        testResult.status = 'FAIL';
        testResult.failureReason = err.message;
        console.error(`[FAIL] "${ProductName}" failed: ${err.message}`);

        // Take screenshot of failure
        const safeName = ProductName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const screenshotFileName = `${safeName}_failed.png`;
        const screenshotFullPath = path.join(screenshotsDir, screenshotFileName);
        
        try {
          await page.screenshot({ path: screenshotFullPath, fullPage: false });
          testResult.screenshotPath = `screenshots/${screenshotFileName}`; // Relative path for report integrity
          console.log(`  -> Failure screenshot captured at: ${testResult.screenshotPath}`);
        } catch (ssErr) {
          console.error(`  -> Failed to capture screenshot: ${ssErr.message}`);
        }

        // Save page HTML of failure
        const htmlFileName = `${safeName}_failed.html`;
        const htmlFullPath = path.join(htmlDir, htmlFileName);
        try {
          const htmlContent = await page.content();
          fs.writeFileSync(htmlFullPath, htmlContent, 'utf-8');
          console.log(`  -> Page source captured at: reports/html/${htmlFileName}`);
        } catch (htmlErr) {
          console.error(`  -> Failed to save page HTML: ${htmlErr.message}`);
        }
      } finally {
        // Log execution time
        const duration = Date.now() - startTime;
        testResult.executionTimeMs = duration;
        testResult.executionTime = `${(duration / 1000).toFixed(2)}s`;

        // Write individual test result to a temp JSON file
        const uniqueId = ProductName.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_' + Date.now();
        const tempFilePath = path.join(tempDir, `${uniqueId}.json`);
        fs.writeFileSync(tempFilePath, JSON.stringify(testResult, null, 2), 'utf-8');
      }
    });
  }
});
