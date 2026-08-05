const { test, expect } = require('@playwright/test');

test('Check linking, redirections, and 404 status on Sofa Buying Guide page', async ({ page, request }) => {
    test.setTimeout(300000); // 5 minutes timeout for auditing all links
    const targetUrl = 'https://beta.teamwoodenstreet.com/sofa-buying-guide';
    
    console.log(`\nNavigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

    // Scroll to lazy-load images and dynamic elements
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 300;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    window.scrollTo(0, 0);
                    resolve();
                }
            }, 100);
        });
    });

    // Extract all link elements with text & context
    const extractedLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a')).map((a, idx) => {
            const text = (a.innerText || a.textContent || '').trim().replace(/\s+/g, ' ');
            const rawHref = a.getAttribute('href');
            const resolvedHref = a.href;
            
            let section = 'Body';
            const container = a.closest('header, footer, nav, section, article, div[class*="header"], div[class*="footer"], div[id]');
            if (container) {
                if (a.closest('header, nav, .header')) section = 'Header / Navigation';
                else if (a.closest('footer, .footer')) section = 'Footer';
                else {
                    const heading = container.querySelector('h1, h2, h3, h4, h5, h6');
                    if (heading) section = heading.innerText.trim().replace(/\s+/g, ' ');
                    else if (container.id) section = '#' + container.id;
                }
            }

            return { index: idx + 1, text, rawHref, resolvedHref, section };
        });
    });

    const validLinks = extractedLinks.filter(l => {
        if (!l.rawHref) return false;
        if (l.rawHref.startsWith('javascript:') || l.rawHref.startsWith('mailto:') || l.rawHref.startsWith('tel:') || l.rawHref === '#') {
            return false;
        }
        return true;
    });

    // Group occurrences by resolved URL
    const uniqueUrlMap = new Map();
    validLinks.forEach(item => {
        if (!uniqueUrlMap.has(item.resolvedHref)) {
            uniqueUrlMap.set(item.resolvedHref, []);
        }
        uniqueUrlMap.get(item.resolvedHref).push(item);
    });

    console.log(`Found ${extractedLinks.length} total anchor tags, ${validLinks.length} valid links, across ${uniqueUrlMap.size} unique URLs.\n`);

    const broken404Links = [];
    const redirectedLinks = [];
    const otherErrorLinks = [];

    // Check link status in batches
    const uniqueUrls = Array.from(uniqueUrlMap.keys());
    const batchSize = 10;

    for (let i = 0; i < uniqueUrls.length; i += batchSize) {
        const batch = uniqueUrls.slice(i, i + batchSize);

        await Promise.all(batch.map(async (link) => {
            const occurrences = uniqueUrlMap.get(link);
            const sampleText = occurrences[0].text;
            const section = occurrences[0].section;

            try {
                const response = await request.get(link, { timeout: 15000, maxRedirects: 10 });
                const status = response.status();
                const finalUrl = response.url();

                const isRedirected = (finalUrl !== link && finalUrl !== link + '/');

                if (status === 404) {
                    broken404Links.push({ link, status, finalUrl, sampleText, section, isRedirected });
                    console.log(`❌ [404] ${link} (Text: "${sampleText}")`);
                } else if (isRedirected) {
                    redirectedLinks.push({ link, status, finalUrl, sampleText, section });
                    console.log(`↪️ [${status} -> Redirect] ${link} ===> ${finalUrl}`);
                } else if (status >= 400) {
                    otherErrorLinks.push({ link, status, sampleText, section });
                    console.log(`⚠️ [${status}] ${link}`);
                }
            } catch (err) {
                otherErrorLinks.push({ link, status: 'Error', message: err.message, sampleText, section });
                console.log(`⚠️ [Fetch Error] ${link}: ${err.message}`);
            }
        }));
    }

    console.log('\n================ AUDIT SUMMARY REPORT ================');
    console.log(`Total Unique URLs Audited: ${uniqueUrls.length}`);
    console.log(`404 Broken Links Found:    ${broken404Links.length}`);
    console.log(`Redirected Links Found:    ${redirectedLinks.length}`);
    console.log(`Other Status / Network Errors: ${otherErrorLinks.length}`);

    if (broken404Links.length > 0) {
        console.log('\n🚨 DETAILED 404 BROKEN LINKS:');
        broken404Links.forEach((item, idx) => {
            console.log(`${idx + 1}. URL: ${item.link}`);
            console.log(`   Text: "${item.sampleText}" | Section: ${item.section}`);
            if (item.isRedirected) {
                console.log(`   Redirection Target (404): ${item.finalUrl}`);
            }
        });
    }

    if (redirectedLinks.length > 0) {
        console.log('\n↪️ DETAILED REDIRECTED LINKS:');
        redirectedLinks.forEach((item, idx) => {
            console.log(`${idx + 1}. From: ${item.link}`);
            console.log(`   To:   ${item.finalUrl} [Status: ${item.status}]`);
        });
    }
    console.log('======================================================\n');

    expect(broken404Links.length, `Found ${broken404Links.length} 404 broken links on ${targetUrl}`).toBe(0);
});
