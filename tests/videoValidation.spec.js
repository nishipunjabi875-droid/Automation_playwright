const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Read CSV/TSV file synchronously to dynamically declare Playwright tests
function readCSVSync(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return [];

  // Automatically detect separator (tab vs comma)
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : ',';

  // Parse header
  const headers = firstLine.split(delimiter).map(h => h.trim());
  
  // Parse rows (handles delimiter splitting while respecting quoted strings)
  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
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
  const rawRows = readCSVSync(csvPath);
  
  // Map row properties dynamically to support both new TSV headers and old CSV headers
  products = rawRows.map(row => {
    const name = row['Product Name'] || row['ProductName'] || '';
    const url = row['Product URL'] || row['ProductURL'] || '';
    
    // Default video selectors list if not specified: tries gallery, body slider, tab buttons, etc.
    const selector = row['VideoSelector'] || row['Video Selector'] || '.image-gallery-thumbnail.hasvideo, .videoSlider .cursor-pointer, .video-tile, #videos-tab, .isvideo img';
    
    // Auto-extract expected video filename segment from Video URL if ExpectedVideo is not explicitly provided
    let expected = row['ExpectedVideo'] || row['Expected Video'] || '';
    if (!expected) {
      const videoUrlCol = row['Video URL'] || row['VideoURL'] || '';
      if (videoUrlCol) {
        const parts = videoUrlCol.split('/');
        const filename = parts[parts.length - 1]; // e.g. "wsyt1.mp4"
        expected = filename.split('.')[0]; // e.g. "wsyt1"
      }
    }
    
    return {
      ProductName: name,
      ProductURL: url,
      VideoSelector: selector,
      ExpectedVideo: expected
    };
  });
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
      let resolvedUrl = ProductURL.replace('${PROJECT_DIR}', projectDir);

      // Beta domain redirect (Rewrites live woodenstreet.com urls to beta.teamwoodenstreet.com as requested)
      const targetDomain = process.env.TARGET_DOMAIN || 'https://beta.teamwoodenstreet.com';
      if (targetDomain && resolvedUrl.includes('woodenstreet.com')) {
        resolvedUrl = resolvedUrl.replace(/https?:\/\/(www\.)?woodenstreet\.com/, targetDomain);
      }

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
        hasDuplicates: false,
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
            url.includes('facebook.net') || 
            url.includes('hotjar') || 
            url.includes('doubleclick');

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
        await page.evaluate(() => {
          // Click close buttons
          const closeButtons = document.querySelectorAll('button[aria-label="Close"], button[class*="DialogClose"], button[class*="close"], button[class*="Close"]');
          closeButtons.forEach(btn => { try { btn.click(); } catch(e){} });
          
          // Force remove modal overlays from DOM to prevent interception
          const dialogs = document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="popup"], [id*="radix-"]');
          dialogs.forEach(dialog => {
            try {
              dialog.style.display = 'none';
              dialog.remove();
            } catch(e){}
          });
          
          // Restore body pointer events and scrolling
          if (document.body) {
            document.body.style.pointerEvents = 'auto';
            document.body.style.overflow = 'auto';
          }
        }).catch(() => {});
        await page.waitForTimeout(1000);

        // 3. Locate the first visible video element matching the selector(s)
        const selectors = VideoSelector.split(',').map(s => s.trim());
        let videoElement = null;
        let resolvedSelectorUsed = '';

        for (const sel of selectors) {
          let normalized = sel;
          if (sel.startsWith('//') || sel.startsWith('/') || sel.startsWith('(') || sel.includes('[@')) {
            if (!sel.startsWith('xpath=')) {
              normalized = `xpath=${sel}`;
            }
          }
          const loc = page.locator(normalized);
          const count = await loc.count().catch(() => 0);
          for (let i = 0; i < count; i++) {
            const el = loc.nth(i);
            if (await el.isVisible().catch(() => false)) {
              videoElement = el;
              resolvedSelectorUsed = sel;
              break;
            }
          }
          if (videoElement) break;
        }

        // Fallback to first element if none are visible immediately (to let expect.toBeVisible wait if needed)
        if (!videoElement) {
          let fallbackSelector = VideoSelector;
          if (fallbackSelector.startsWith('//') || fallbackSelector.startsWith('/') || fallbackSelector.startsWith('(') || fallbackSelector.includes('[@')) {
            if (!fallbackSelector.startsWith('xpath=')) {
              fallbackSelector = `xpath=${fallbackSelector}`;
            }
          }
          videoElement = page.locator(fallbackSelector).first();
          resolvedSelectorUsed = VideoSelector;
        }

        try {
          await expect(videoElement).toBeVisible({ timeout: 15000 });
          testResult.videoFound = true;
          console.log(`  -> Video element is visible on the page (resolved to: "${resolvedSelectorUsed}").`);
        } catch (err) {
          throw new Error(`Video element selector "${VideoSelector}" not visible on page.`);
        }

        // 4. Click the video play / thumbnail button (uses force/JS fallback to bypass popups)
        try {
          await videoElement.click({ force: true, timeout: 5000 }).catch(async () => {
            console.log('  -> Standard click blocked by overlay. Bypassing via JS click evaluation...');
            await videoElement.evaluate(el => el.click());
          });
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
              await subElement.click({ force: true, timeout: 5000 }).catch(async () => {
                await subElement.evaluate(el => el.click()).catch(() => {});
              });
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
            await activeSlide.first().click({ force: true, timeout: 5000 }).catch(async () => {
              await activeSlide.first().evaluate(el => el.click()).catch(() => {});
            });
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

        // 8. Duplicacy validation (Scan all video elements to check for redundant uploads of the same video source)
        console.log('  -> Scanning page for duplicate video source uploads...');
        const videoElements = page.locator('video, iframe');
        const elementCount = await videoElements.count();
        const urls = [];
        
        for (let i = 0; i < elementCount; i++) {
          const el = videoElements.nth(i);
          
          // Filter out Swiper slide duplicates to avoid false positives in looping swiper components
          const isClone = await el.evaluate(node => {
            let curr = node;
            while (curr) {
              if (curr.classList && (curr.classList.contains('swiper-slide-duplicate') || curr.classList.contains('clone'))) {
                return true;
              }
              curr = curr.parentElement;
            }
            return false;
          });
          if (isClone) continue;

          let src = await el.getAttribute('src').catch(() => '');
          if (!src) {
            const sourceTag = el.locator('source').first();
            if (await sourceTag.count() > 0) {
              src = await sourceTag.getAttribute('src').catch(() => '');
            }
          }
          if (src) {
            // Strip any query strings/anchors and normalize URL
            const normalized = src.split('?')[0].trim().toLowerCase();
            urls.push(normalized);
          }
        }

        const duplicates = urls.filter((url, index) => urls.indexOf(url) !== index);
        const uniqueDuplicates = [...new Set(duplicates)];
        
        if (uniqueDuplicates.length > 0) {
          testResult.hasDuplicates = true;
          throw new Error(`Duplicate video uploads detected on product page: ${uniqueDuplicates.join(', ')}`);
        } else {
          testResult.hasDuplicates = false;
          console.log('  -> Checked duplicacy: No duplicate video uploads found.');
        }

        // 9. Mapping verification (Verify that the correct video is mapped to the product)
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

        // Write individual test result to a temp JSON file atomically
        const uniqueId = ProductName.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_' + Date.now();
        const tempFilePath = path.join(tempDir, `${uniqueId}.json`);
        const tempTmpFilePath = path.join(tempDir, `${uniqueId}.tmp`);
        
        try {
          fs.writeFileSync(tempTmpFilePath, JSON.stringify(testResult, null, 2), 'utf-8');
          fs.renameSync(tempTmpFilePath, tempFilePath);
        } catch (writeErr) {
          console.error(`Failed to write temp result for ${ProductName}:`, writeErr.message);
          // Fallback to direct write if rename fails
          try {
            fs.writeFileSync(tempFilePath, JSON.stringify(testResult, null, 2), 'utf-8');
          } catch (e) {}
        }

        // Calculate real-time progress by scanning the temp results directory
        let checkedCount = 0;
        let passedCount = 0;
        let failedCount = 0;

        try {
          if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir);
            for (const file of files) {
              if (file.endsWith('.json')) {
                try {
                  const content = fs.readFileSync(path.join(tempDir, file), 'utf-8');
                  const data = JSON.parse(content);
                  checkedCount++;
                  if (data.status === 'PASS') {
                    passedCount++;
                  } else {
                    failedCount++;
                  }
                } catch (parseErr) {
                  // Ignore JSON parse/read errors during concurrent disk access
                }
              }
            }
          }
        } catch (dirErr) {
          console.error('Failed to read temp directory for real-time progress:', dirErr.message);
        }

        console.log(`\n[PROGRESS] Videos Checked: ${checkedCount} | Passed: ${passedCount} | Failed: ${failedCount}\n`);
      }
    });
  }
});
