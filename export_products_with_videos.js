const mysql = require('mysql2/promise');
const { createObjectCsvWriter } = require('csv-writer');
const axios = require('axios');

const dbConfig = {
    host: '10.4.1.9',
    user: 'root',
    password: 'wood@123',
    database: 'woodenstreetnew'
};

async function checkYouTubeStatus(youtubeId) {
    if (!youtubeId || youtubeId.trim() === '') return 'invalid';
    if (!/^[a-zA-Z0-9_-]{11}$/.test(youtubeId)) return 'invalid';

    try {
        const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`;
        const res = await axios.get(oEmbedUrl, { timeout: 5000 });
        if (res.status !== 200) return 'invalid';
    } catch (_) {
        return 'invalid';
    }

    try {
        const sdRes = await axios.head(
            `https://img.youtube.com/vi/${youtubeId}/sddefault.jpg`,
            { timeout: 5000 }
        );
        if (sdRes.status === 200) return 'valid';
    } catch (_) { }

    return 'no_thumbnail';
}

const VALID_HEADER = [
    { id: 'productId',  title: 'Product ID' },
    { id: 'name',       title: 'Product Name' },
    { id: 'youtubeId',  title: 'YouTube ID' },
    { id: 'youtubeUrl', title: 'YouTube URL' },
    { id: 'productUrl', title: 'Product URL' }
];

const ISSUES_HEADER = [
    { id: 'productId',  title: 'Product ID' },
    { id: 'name',       title: 'Product Name' },
    { id: 'youtubeId',  title: 'YouTube ID' },
    { id: 'youtubeUrl', title: 'YouTube URL' },
    { id: 'issueType',  title: 'Issue Type' },
    { id: 'productUrl', title: 'Product URL' }
];

(async () => {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected successfully.');

        const [rows] = await connection.execute(`
            SELECT
                product_id,
                name,
                isbn    AS youtube_id,
                url     AS url_alias
            FROM oc_product
            WHERE status = 1
              AND quantity > 0
              AND isbn IS NOT NULL
              AND isbn != ''
        `);
        console.log(`Found ${rows.length} products with YouTube IDs.`);

        const validProducts = [];
        const issueProducts = [];

        const baseUrl = 'https://www.woodenstreet.com/';
        let processed = 0;
        let totalIds  = 0;

        console.log('Checking YouTube IDs...');

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            const rawIds = (row.youtube_id || '')
                .split(',')
                .map(id => id.trim())
                .filter(id => id !== '');

            const productUrl = row.url_alias
                ? `${baseUrl}${row.url_alias}`
                : `${baseUrl}index.php?route=product/product&product_id=${row.product_id}`;

            for (const youtubeId of rawIds) {
                totalIds++;
                processed++;

                if (processed % 50 === 0) {
                    console.log(`Processing ${processed} IDs (product ${i + 1}/${rows.length})...`);
                }

                const status = await checkYouTubeStatus(youtubeId);

                const base = {
                    productId:  row.product_id,
                    name:       row.name,
                    youtubeId:  youtubeId,
                    youtubeUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
                    productUrl: productUrl
                };

                if (status === 'valid') {
                    validProducts.push(base);
                } else {
                    issueProducts.push({
                        ...base,
                        issueType: status === 'no_thumbnail'
                            ? 'Missing Thumbnail'
                            : 'Video Not Working'
                    });
                }
            }
        }

        const missingCount = issueProducts.filter(r => r.issueType === 'Missing Thumbnail').length;
        const notWorkCount = issueProducts.filter(r => r.issueType === 'Video Not Working').length;

        console.log(`\nTotal products   : ${rows.length}`);
        console.log(`Total IDs checked: ${totalIds}`);
        console.log(`\nResults:`);
        console.log(`  Videos with thumbnail    : ${validProducts.length}`);
        console.log(`  Missing thumbnail        : ${missingCount}`);
        console.log(`  Video not working        : ${notWorkCount}`);
        console.log(`  Total issues             : ${issueProducts.length}`);

        await createObjectCsvWriter({ path: 'products_valid.csv',  header: VALID_HEADER  }).writeRecords(validProducts);
        await createObjectCsvWriter({ path: 'products_issues.csv', header: ISSUES_HEADER }).writeRecords(issueProducts);

        console.log('\nExported: products_valid.csv');
        console.log('Exported: products_issues.csv  (Missing Thumbnail + Video Not Working)');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\nDatabase connection closed.');
        }
    }
})();