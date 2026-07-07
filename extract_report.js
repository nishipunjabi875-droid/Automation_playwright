const fs = require('fs');
const html = fs.readFileSync('playwright-report/index.html', 'utf8');
const startMatch = 'window.playwrightReportBase64 = "';
const startIdx = html.indexOf(startMatch) + startMatch.length;
const endIdx = html.indexOf('"', startIdx);
const base64 = html.substring(startIdx, endIdx);
fs.writeFileSync('report.zip', Buffer.from(base64, 'base64'));
console.log('Extracted report.zip');
