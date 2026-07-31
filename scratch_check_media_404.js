const { chromium } = require('@playwright/test');
const fs = require('fs');

(async () => {
    console.log('Launching browser to check https://www.woodenstreet.com/media ...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    const targetUrl = 'https://www.woodenstreet.com/media';
    console.log(`Navigating to ${targetUrl} ...`);
    
    try {
        await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 45000 });
    } catch (e) {
        console.log(`Page load timeout/warning: ${e.message}, continuing...`);
    }

    // Scroll down to ensure lazy loaded elements appear
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 300;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight || totalHeight > 10000) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });

    console.log('Extracting links and media assets from page...');
    const hrefs = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a'));
        const links = anchors.map(a => {
            const rawHref = a.getAttribute('href');
            return {
                text: (a.textContent || '').trim().replace(/\s+/g, ' '),
                href: a.href,
                rawHref: rawHref
            };
        });
        
        // Also extract images
        const imgs = Array.from(document.querySelectorAll('img')).map(img => {
            return {
                text: `[IMG] ${img.alt || 'No alt'}`,
                href: img.src,
                rawHref: img.getAttribute('src')
            };
        });

        return [...links, ...imgs];
    });

    // Clean & filter valid URLs
    const validItems = hrefs.filter(item => {
        if (!item.href || item.href.startsWith('javascript:') || item.href.startsWith('mailto:') || item.href.startsWith('tel:') || item.href.startsWith('#')) {
            return false;
        }
        return item.href.startsWith('http://') || item.href.startsWith('https://');
    });

    // Deduplicate by URL
    const uniqueItemsMap = new Map();
    validItems.forEach(item => {
        if (!uniqueItemsMap.has(item.href)) {
            uniqueItemsMap.set(item.href, item);
        }
    });

    const uniqueItems = Array.from(uniqueItemsMap.values());
    console.log(`Found ${uniqueItems.length} unique links/assets to check on ${targetUrl}\n`);

    const broken404s = [];
    const otherErrors = [];
    const requestContext = context.request;

    const batchSize = 10;
    for (let i = 0; i < uniqueItems.length; i += batchSize) {
        const batch = uniqueItems.slice(i, i + batchSize);
        await Promise.all(batch.map(async (item) => {
            try {
                const response = await requestContext.get(item.href, { timeout: 15000, maxRedirects: 5 });
                const status = response.status();
                if (status === 404) {
                    broken404s.push({ ...item, status });
                    console.log(`❌ [404] ${item.href} (Text: "${item.text}")`);
                } else if (status >= 400) {
                    otherErrors.push({ ...item, status });
                    console.log(`⚠️ [${status}] ${item.href}`);
                }
            } catch (err) {
                // Check if head request or get fails
                otherErrors.push({ ...item, status: 'Error', error: err.message });
            }
        }));
    }

    console.log('\n==================================================');
    console.log(`404 RESULTS SUMMARY FOR: ${targetUrl}`);
    console.log('==================================================');
    console.log(`Total URLs Checked: ${uniqueItems.length}`);
    console.log(`404 Not Found Count: ${broken404s.length}`);
    console.log(`Other Status Codes / Errors Count: ${otherErrors.length}`);
    console.log('==================================================\n');

    if (broken404s.length > 0) {
        console.log('--- DETAILED LIST OF 404 LINKS ---');
        broken404s.forEach((b, idx) => {
            console.log(`${idx + 1}. URL: ${b.href}`);
            console.log(`   Element Text: "${b.text}"`);
            console.log(`   Raw Href: ${b.rawHref}\n`);
        });
    } else {
        console.log('✅ No 404 links found on https://www.woodenstreet.com/media !');
    }

    await browser.close();
})();
