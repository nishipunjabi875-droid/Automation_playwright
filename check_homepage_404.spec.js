const { test, expect } = require('@playwright/test');

test('Check 404 links on WoodenStreet Homepage', async ({ page, request }) => {
    test.setTimeout(180000); // 3 minutes timeout for the test
    const targetUrl = 'https://www.woodenstreet.com/';
    
    console.log(`\nNavigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

    // Extract all valid 'href' attributes from anchor tags
    const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
            .map(a => a.href)
            .filter(href => {
                // Ensure the link is valid, not a JS function, and belongs to the domain
                return href && 
                       href.startsWith('https://www.woodenstreet.com') && 
                       !href.startsWith('javascript:') && 
                       !href.startsWith('mailto:') && 
                       !href.startsWith('tel:');
            });
    });

    // Remove duplicates using a Set
    const uniqueLinks = [...new Set(links)];
    console.log(`Found ${uniqueLinks.length} unique internal links to check on the home page.\n`);

    const brokenLinks = [];
    const batchSize = 10; // Check links in batches to prevent overwhelming the server

    // Check link status using Playwright's API request context
    for (let i = 0; i < uniqueLinks.length; i += batchSize) {
        const batch = uniqueLinks.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (link) => {
            try {
                // Make a GET request
                const response = await request.get(link, { timeout: 15000 });
                const status = response.status();
                
                if (status === 404) {
                    brokenLinks.push({ url: link, status: 404 });
                    console.log(`❌ [404] Not Found: ${link}`);
                } else if (status >= 400) {
                    // Log other HTTP errors like 500, 403, etc., but don't strictly classify them as 404s
                    console.log(`⚠️ [${status}] Error Status: ${link}`);
                }
            } catch (error) {
                // Catch timeouts or network failures
                console.log(`⚠️ [Fetch Error] ${link} - ${error.message}`);
                brokenLinks.push({ url: link, status: 'Error', message: error.message });
            }
        }));
    }

    console.log('\n====== FINAL REPORT ======');
    if (brokenLinks.length === 0) {
        console.log('✅ SUCCESS: No 404 or broken links found on the homepage!');
    } else {
        console.log(`🚨 FAILURE: Found ${brokenLinks.length} broken/failed link(s):\n`);
        brokenLinks.forEach((bl, index) => {
            console.log(`${index + 1}. URL: ${bl.url} | Status: ${bl.status}`);
        });
    }
    console.log('==========================\n');

    // Fail the test if there are any broken links
    expect(brokenLinks.length, `Test failed because ${brokenLinks.length} broken links were found.`).toBe(0);
});
