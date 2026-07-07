const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const CATEGORY_URLS = [
        'https://www.woodenstreet.com/sofa-beds',
        'https://www.woodenstreet.com/recliners',
        'https://www.woodenstreet.com/wooden-sofa'
    ];

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const productUrls = new Set();

    console.log('Collecting product URLs from categories...');
    for (const url of CATEGORY_URLS) {
        console.log(`Navigating to ${url}...`);
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(2000); // Wait for dynamic content

            const links = await page.evaluate(() => {
                const anchors = Array.from(document.querySelectorAll('a[href*="/product/"]'));
                return anchors.map(a => a.href); // No limit
            });

            links.forEach(link => productUrls.add(link));
            console.log(`Found ${links.length} product links on ${url}`);
        } catch (e) {
            console.error(`Error navigating to ${url}: ${e.message}`);
        }
    }

    const results = [];
    const csvHeader = 'Product URL,Video Key,Status,Error Message\n';
    fs.writeFileSync('active_videos.csv', csvHeader);

    console.log(`\nChecking ${productUrls.size} unique products for videos...`);
    
    let count = 0;
    for (const productUrl of productUrls) {
        count++;
        console.log(`[${count}/${productUrls.size}] Checking ${productUrl}...`);
        
        try {
            await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(3000); // Wait for potential lazy loading of videos

            // Extract video URLs from JSON-LD
            const videoKeys = await page.evaluate(() => {
                const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
                const keys = new Set();
                scripts.forEach(script => {
                    try {
                        const json = JSON.parse(script.textContent);
                        // Check for VideoObject
                        const findVideos = (obj) => {
                            if (!obj) return;
                            if (obj['@type'] === 'VideoObject' && obj.embedUrl) {
                                const match = obj.embedUrl.match(/embed\/([^?]+)/);
                                if (match) keys.add(match[1]);
                            }
                            if (Array.isArray(obj)) {
                                obj.forEach(findVideos);
                            } else if (typeof obj === 'object') {
                                Object.values(obj).forEach(findVideos);
                            }
                        };
                        findVideos(json);
                    } catch (e) {}
                });
                return Array.from(keys);
            });

            if (videoKeys.length === 0) {
                console.log('  No YouTube video keys found in JSON-LD.');
                continue;
            }

            console.log(`  Found ${videoKeys.length} YouTube video key(s) in JSON-LD.`);

            for (const videoKey of videoKeys) {
                console.log(`  Testing Video: ${videoKey}`);
                const embedUrl = `https://www.youtube.com/embed/${videoKey}?autoplay=1`;
                
                let status = 'Inactive';
                let errorMessage = '';

                const videoPage = await context.newPage();
                try {
                    await videoPage.goto(embedUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    await videoPage.waitForTimeout(5000); // Wait for player to load and potentially start

                    // Check for errors
                    const errorReason = videoPage.locator('.ytp-error-content-wrap-reason');
                    const isErrorVisible = await errorReason.isVisible({ timeout: 2000 }).catch(() => false);

                    if (isErrorVisible) {
                        const errorText = await errorReason.innerText();
                        status = 'Error';
                        errorMessage = errorText;
                        console.log(`    Error: ${errorText}`);
                    } else {
                        // Check if playing
                        const moviePlayer = videoPage.locator('#movie_player');
                        const classAttr = await moviePlayer.getAttribute('class').catch(() => '');
                        if (classAttr && classAttr.includes('playing-mode')) {
                            status = 'Active';
                            console.log(`    Success: Video is active!`);
                        } else {
                            // Try to click play if not playing
                            const playButton = videoPage.locator('.ytp-large-play-button');
                            if (await playButton.isVisible()) {
                                await playButton.click();
                                await videoPage.waitForTimeout(3000);
                                const newClassAttr = await moviePlayer.getAttribute('class').catch(() => '');
                                if (newClassAttr && newClassAttr.includes('playing-mode')) {
                                    status = 'Active';
                                    console.log(`    Success: Video is active after click!`);
                                } else {
                                    status = 'Inactive/Paused';
                                    console.log(`    Warning: Video did not enter playing-mode.`);
                                }
                            } else {
                                status = 'Inactive/Paused';
                                console.log(`    Warning: Video did not enter playing-mode.`);
                            }
                        }
                    }
                } catch (err) {
                    status = 'Error';
                    errorMessage = err.message;
                    console.log(`    Error: ${err.message}`);
                } finally {
                    await videoPage.close();
                }

                const csvLine = `"${productUrl}","${videoKey}","${status}","${errorMessage.replace(/"/g, '""')}"\n`;
                fs.appendFileSync('active_videos.csv', csvLine);
            }
        } catch (e) {
            console.error(`  Error checking product: ${e.message}`);
            fs.appendFileSync('active_videos.csv', `"${productUrl}","N/A","Failed to Load","${e.message.replace(/"/g, '""')}"\n`);
        }
    }

    console.log('\nProcessing complete. Results saved to active_videos.csv');
    await browser.close();
})();
