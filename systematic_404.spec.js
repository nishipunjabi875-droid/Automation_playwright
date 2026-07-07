const { test, expect } = require('@playwright/test');

test('Systematic 404 scan on Home Page', async ({ page, request }) => {
    const hubs = ['https://www.woodenstreet.com/'];
    const allLinks = new Map();
    const brokenLinks = [];

    console.log('\n===== SCANNING HUB PAGES =====\n');

    for (const hub of hubs) {
        console.log(`Scanning: ${hub}`);
        await page.goto(hub, { waitUntil: 'domcontentloaded' });

        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a'))
                .map(a => ({
                    href: a.href,
                    text: a.innerText.trim()
                }))
                .filter(link =>
                    link.href &&
                    link.href.startsWith('https://www.woodenstreet.com') &&
                    !link.href.startsWith('javascript') &&
                    !link.href.startsWith('mailto') &&
                    !link.href.startsWith('tel')
                );
        });

        links.forEach(link => {
            if (!allLinks.has(link.href)) {
                allLinks.set(link.href, link.text);
            }
        });
        console.log(`Links Found: ${links.length}\n`);
    }

    console.log(`Total Unique Links: ${allLinks.size}`);
    console.log('\n===== CHECKING LINKS =====\n');

    const linkArray = [...allLinks.entries()];
    const batchSize = 15;

    for (let i = 0; i < linkArray.length; i += batchSize) {
        const batch = linkArray.slice(i, i + batchSize);

        await Promise.all(batch.map(async ([href, text]) => {
            try {
                const response = await request.get(href, { timeout: 15000 });
                if (response.status() === 404) {
                    console.log(`\n❌ 404 FOUND`);
                    console.log(`Text   : ${text}`);
                    console.log(`URL    : ${href}`);
                    console.log(`Status : 404`);
                    console.log('----------------------');
                    brokenLinks.push(href);
                } else {
                    process.stdout.write('.');
                }
            } catch (err) {
                console.log(`\nError checking: ${href}`);
            }
        }));
    }

    console.log('\n\n===== FINAL REPORT =====\n');

    if (brokenLinks.length === 0) {
        console.log('✅ No 404 links found');
    } else {
        console.log(`Broken Links Found: ${brokenLinks.length}\n`);
        brokenLinks.forEach((link, i) => console.log(`${i + 1}. ${link}`));
    }

    // Report failure if there are broken links
    expect(brokenLinks.length, `Found ${brokenLinks.length} broken links`).toBe(0);
});
