const { test, expect } = require('@playwright/test');

// The video keys provided
const VIDEO_KEYS = ['GozmhLhFQ3g', 'STUG8shm0hg'];

// TODO: Replace with the actual product page URL where these videos are located
const PRODUCT_PAGE_URL = 'https://www.woodenstreet.com/';

test.describe('YouTube Videos playback validation on Product Page', () => {

    test('Verify YouTube videos are present, playable, and have no errors', async ({ page }) => {
        // Set a reasonable timeout in case videos take time to load
        test.setTimeout(90000);

        // Navigate to the target page
        console.log(`Navigating to ${PRODUCT_PAGE_URL}`);
        await page.goto(PRODUCT_PAGE_URL, { waitUntil: 'domcontentloaded' });

        for (const videoKey of VIDEO_KEYS) {
            await test.step(`Testing Video Key: ${videoKey}`, async () => {
                console.log(`\nTesting Video Key: ${videoKey}`);

                // Locate the iframe element containing the video key in its src attribute.
                // Note: If the iframes are lazy-loaded upon clicking a thumbnail, you will 
                // need to add code here to click the thumbnail first.
                const iframeLocator = page.locator(`iframe[src*="${videoKey}"]`);

                try {
                    await expect(iframeLocator.first()).toBeVisible({ timeout: 15000 });
                } catch (e) {
                    console.error(`Iframe for video key ${videoKey} was not found on the page or is not visible.`);
                    throw new Error(`Video frame for ${videoKey} missing.`);
                }

                const iframeCount = await iframeLocator.count();
                console.log(`Found ${iframeCount} iframe(s) for video key ${videoKey}`);

                // Extract the frame context to query inner elements
                const frame = iframeLocator.first().contentFrame();

                // Wait for the YouTube player to be attached securely
                await page.waitForTimeout(2000);

                // Check for the large play button, and click it if visible
                const playButton = frame.locator('.ytp-large-play-button');
                const isPlayVisible = await playButton.isVisible().catch(() => false);
                if (isPlayVisible) {
                    console.log(`Clicking play button for video ${videoKey}`);
                    await playButton.click();

                    // Wait after clicking play for video to buffer / spin up
                    await page.waitForTimeout(3000);
                }

                // --------------------- Assertion 1: No errors -------------------------
                // Check for the YouTube error overlay (e.g. "Video unavailable")
                const errorReason = frame.locator('.ytp-error-content-wrap-reason');
                const isErrorVisible = await errorReason.isVisible().catch(() => false);

                if (isErrorVisible) {
                    const errorText = await errorReason.innerText();
                    throw new Error(`Video ${videoKey} has an availability error: "${errorText}"`);
                } else {
                    console.log(`No execution/availability errors for video ${videoKey}.`);
                }

                // --------------------- Assertion 2: Playback State --------------------
                // In a valid YouTube embed, the movie player component gets a 'playing-mode' 
                // class when the video successfully plays.
                const moviePlayer = frame.locator('#movie_player');
                const classAttr = await moviePlayer.getAttribute('class').catch(() => '');

                if (classAttr && classAttr.includes('playing-mode')) {
                    console.log(`Success: Video ${videoKey} is confirmed playing!`);
                } else {
                    console.log(`Warning: Video ${videoKey} did not enter 'playing-mode'. It might be paused, buffered, or autoplay restricted.`);
                }

                // Extra basic check: Validate HTML5 video tag is rendered within the player
                const videoTag = frame.locator('video');
                await expect(videoTag, 'Underlying video tag should exist inside the iframe').toBeAttached();
            });
        }
    });

});
