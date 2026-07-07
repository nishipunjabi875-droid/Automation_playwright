const fs = require('fs');
const html = fs.readFileSync('playwright-report/index.html', 'utf8');
const match = html.match(/window\.playwrightReportBase64\s*=\s*"([^"]+)"/);
if (match) {
    fs.writeFileSync('report.zip', Buffer.from(match[1], 'base64'));
    console.log('Extracted report.zip');
} else {
    console.log('No match for playwrightReportBase64');
}
