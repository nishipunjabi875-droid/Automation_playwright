const ExcelJS = require('exceljs');
const fs = require('fs-extra');
const path = require('path');

class ExcelReporter {
  static async generate(results, healthInfo, outputPath) {
    await fs.ensureDir(path.dirname(outputPath));
    const workbook = new ExcelJS.Workbook();
    
    // Header Style Helper
    const styleHeader = (sheet, columns) => {
      sheet.columns = columns.map(c => ({ header: c.header, key: c.key, width: c.width || 25 }));
      sheet.getRow(1).font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E78' } // Navy blue
      };
      sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'left' };
      sheet.getRow(1).height = 25;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 1. SUMMARY SHEET
    // ─────────────────────────────────────────────────────────────────────────
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.views = [{ showGridLines: true }];
    
    // Add Dashboard title
    summarySheet.mergeCells('A1:D1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = 'Website Health Check - Executive Summary';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1F4E78' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(1).height = 35;

    summarySheet.addRow([]); // Blank row
    
    // Score Dashboard Callout
    summarySheet.addRow(['Website Health Score', `${healthInfo.score}%`, 'Status', healthInfo.status]);
    summarySheet.mergeCells('B3:B3');
    summarySheet.getCell('B3').font = { name: 'Arial', size: 24, bold: true, color: { argb: healthInfo.score >= 90 ? 'FF385723' : (healthInfo.score >= 70 ? 'FFC65911' : 'FFC00000') } };
    summarySheet.getCell('D3').font = { name: 'Arial', size: 14, bold: true };
    summarySheet.getRow(3).height = 40;

    summarySheet.addRow([]); // Blank row

    // Statistics Table
    summarySheet.addRow(['Metric / Category', 'Count / Value', 'Deduction Points', 'Status Details']);
    summarySheet.getRow(5).font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
    summarySheet.getRow(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } };
    summarySheet.getRow(5).height = 20;

    const stats = [
      ['Critical Issues', healthInfo.issuesCount.critical, healthInfo.issuesCount.critical * 15, '🔴 Must resolve immediately'],
      ['High Issues', healthInfo.issuesCount.high, healthInfo.issuesCount.high * 5, '🟠 Major functionality broken'],
      ['Medium Issues', healthInfo.issuesCount.medium, healthInfo.issuesCount.medium * 2, '🟡 Warnings & SEO/A11y Gaps'],
      ['Low Issues', healthInfo.issuesCount.low, healthInfo.issuesCount.low * 0.5, '🔵 Best practice notices'],
      ['Total Checked URLs', results.checkedUrlsCount || 0, '-', 'Total pages processed'],
      ['Broken Links Found', healthInfo.issues.high.filter(i => i.msg.includes('Broken Link')).length + healthInfo.issues.medium.filter(i => i.msg.includes('Broken Link')).length, '-', 'HTTP 4xx/5xx links'],
      ['Broken Images Found', healthInfo.issues.high.filter(i => i.msg.includes('Broken Image')).length, '-', 'Failed asset loads'],
      ['Video Failures', healthInfo.issues.high.filter(i => i.msg.includes('Video Playback')).length, '-', 'Failed embedded playback'],
      ['Console Errors/Exceptions', healthInfo.issues.high.filter(i => i.msg.includes('Console exception')).length + healthInfo.issues.low.filter(i => i.msg.includes('Console error')).length, '-', 'Uncaught browser exceptions'],
      ['API Response Failures', results.apiErrors?.length || 0, '-', 'Failed REST calls']
    ];

    stats.forEach(row => {
      summarySheet.addRow(row);
    });

    // Formatting widths
    summarySheet.getColumn(1).width = 30;
    summarySheet.getColumn(2).width = 15;
    summarySheet.getColumn(3).width = 20;
    summarySheet.getColumn(4).width = 30;

    // Border grid
    for (let r = 5; r <= 15; r++) {
      const row = summarySheet.getRow(r);
      row.alignment = { vertical: 'middle' };
      for (let c = 1; c <= 4; c++) {
        row.getCell(c).border = {
          top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
        };
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. BROKEN LINKS SHEET
    // ─────────────────────────────────────────────────────────────────────────
    const blSheet = workbook.addWorksheet('Broken Links');
    styleHeader(blSheet, [
      { header: 'Source Page', key: 'sourcePage', width: 45 },
      { header: 'Broken URL', key: 'url', width: 55 },
      { header: 'HTTP Status', key: 'status', width: 15 },
      { header: 'Error Message', key: 'error', width: 45 }
    ]);
    if (results.brokenLinks) {
      results.brokenLinks.forEach(bl => blSheet.addRow(bl));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. BROKEN IMAGES SHEET
    // ─────────────────────────────────────────────────────────────────────────
    const biSheet = workbook.addWorksheet('Broken Images');
    styleHeader(biSheet, [
      { header: 'Source Page', key: 'sourcePage', width: 45 },
      { header: 'Image URL', key: 'url', width: 55 },
      { header: 'Alt Available', key: 'altAvailable', width: 15 },
      { header: 'Alt Text', key: 'alt', width: 25 },
      { header: 'Dimensions', key: 'dimensions', width: 15 },
      { header: 'Lazy Loading', key: 'isLazy', width: 15 }
    ]);
    if (results.brokenImages) {
      results.brokenImages.forEach(bi => biSheet.addRow(bi));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. VIDEO ISSUES SHEET
    // ─────────────────────────────────────────────────────────────────────────
    const vidSheet = workbook.addWorksheet('Video Issues');
    styleHeader(vidSheet, [
      { header: 'Product Name', key: 'productName', width: 35 },
      { header: 'Product Page URL', key: 'productUrl', width: 45 },
      { header: 'Expected Video', key: 'expectedVideo', width: 20 },
      { header: 'Video Found', key: 'videoFound', width: 15 },
      { header: 'Player Opened', key: 'playerOpened', width: 15 },
      { header: 'Video Loaded', key: 'videoLoaded', width: 15 },
      { header: 'Video URL', key: 'videoUrl', width: 45 },
      { header: 'Failure Reason', key: 'failureReason', width: 35 }
    ]);
    if (results.videoIssues) {
      results.videoIssues.forEach(v => vidSheet.addRow(v));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. API ERRORS SHEET
    // ─────────────────────────────────────────────────────────────────────────
    const apiSheet = workbook.addWorksheet('API Errors');
    styleHeader(apiSheet, [
      { header: 'Endpoint', key: 'url', width: 55 },
      { header: 'Method', key: 'method', width: 12 },
      { header: 'Status Code', key: 'status', width: 15 },
      { header: 'Latency (ms)', key: 'responseTime', width: 15 },
      { header: 'Parent Page URL', key: 'pageUrl', width: 45 }
    ]);
    if (results.apiErrors) {
      results.apiErrors.forEach(api => apiSheet.addRow(api));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. CONSOLE ERRORS SHEET
    // ─────────────────────────────────────────────────────────────────────────
    const conSheet = workbook.addWorksheet('Console Errors');
    styleHeader(conSheet, [
      { header: 'Page URL', key: 'url', width: 45 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Message', key: 'text', width: 55 },
      { header: 'Location / Stack', key: 'stack', width: 55 }
    ]);
    if (results.consoleErrors) {
      results.consoleErrors.forEach(err => conSheet.addRow({
        url: err.url,
        type: err.type,
        text: err.text,
        stack: err.stack || err.location || ''
      }));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. NETWORK ERRORS SHEET
    // ─────────────────────────────────────────────────────────────────────────
    const netSheet = workbook.addWorksheet('Network Errors');
    styleHeader(netSheet, [
      { header: 'Failed Request URL', key: 'url', width: 55 },
      { header: 'Resource Type', key: 'resourceType', width: 15 },
      { header: 'Status / Error', key: 'errorText', width: 25 },
      { header: 'Parent Page URL', key: 'pageUrl', width: 45 }
    ]);
    if (results.networkErrors) {
      results.networkErrors.forEach(net => netSheet.addRow({
        url: net.url,
        resourceType: net.resourceType,
        errorText: net.errorText || net.status || 'Failed',
        pageUrl: net.pageUrl
      }));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8. PERFORMANCE SHEET
    // ─────────────────────────────────────────────────────────────────────────
    const perfSheet = workbook.addWorksheet('Performance');
    styleHeader(perfSheet, [
      { header: 'Page URL', key: 'url', width: 45 },
      { header: 'Page Load (ms)', key: 'pageLoadTime', width: 18 },
      { header: 'DOMContentLoaded (ms)', key: 'domContentLoaded', width: 22 },
      { header: 'FCP (ms)', key: 'fcp', width: 15 },
      { header: 'LCP (ms)', key: 'lcp', width: 15 },
      { header: 'TTI (ms)', key: 'tti', width: 15 },
      { header: 'TBT (ms)', key: 'tbt', width: 15 }
    ]);
    if (results.performance) {
      results.performance.forEach(p => perfSheet.addRow(p));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 9. PRODUCT VALIDATION SHEET
    // ─────────────────────────────────────────────────────────────────────────
    const prodSheet = workbook.addWorksheet('Product Validation');
    styleHeader(prodSheet, [
      { header: 'Product Page URL', key: 'path', width: 45 },
      { header: 'Product Name', key: 'name', width: 35 },
      { header: 'Price', key: 'price', width: 15 },
      { header: 'Discount', key: 'discount', width: 15 },
      { header: 'Stock Availability', key: 'availability', width: 20 },
      { header: 'Has Variants', key: 'hasVariants', width: 15 },
      { header: 'Pincode Checked', key: 'pincodeChecked', width: 18 },
      { header: 'Cart Btn Visible', key: 'hasAddToCart', width: 15 },
      { header: 'Buy Btn Visible', key: 'hasBuyNow', width: 15 },
      { header: 'Issues Found', key: 'issues', width: 40 }
    ]);
    if (results.productValidations) {
      results.productValidations.forEach(prod => prodSheet.addRow({
        ...prod,
        issues: prod.issues.join(', ') || 'None'
      }));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 10. FAILED TESTS SHEET
    // ─────────────────────────────────────────────────────────────────────────
    const ftSheet = workbook.addWorksheet('Failed Tests');
    styleHeader(ftSheet, [
      { header: 'Test Specification', key: 'name', width: 45 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Assertion Error', key: 'error', width: 65 },
      { header: 'Screenshot Taken', key: 'screenshot', width: 45 }
    ]);
    if (results.tests) {
      results.tests.filter(t => t.status === 'failed').forEach(t => ftSheet.addRow({
        name: t.name,
        status: t.status.toUpperCase(),
        error: t.error,
        screenshot: t.screenshot || 'None'
      }));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 11. EXECUTION SUMMARY SHEET
    // ─────────────────────────────────────────────────────────────────────────
    const execSheet = workbook.addWorksheet('Execution Summary');
    styleHeader(execSheet, [
      { header: 'Configuration Key', key: 'key', width: 30 },
      { header: 'Configuration Value', key: 'value', width: 50 }
    ]);

    const info = results.summary || {};
    const executionMeta = [
      ['Start Time', info.startTime || new Date().toISOString()],
      ['End Time', info.endTime || new Date().toISOString()],
      ['Total Execution Duration', info.duration || 'N/A'],
      ['Browser Mode', info.browser || 'Chromium'],
      ['Environment Name', info.env || 'Production'],
      ['Node Version', process.version],
      ['Platform', process.platform],
      ['Total URLs Swept', results.checkedUrlsCount || 0]
    ];
    executionMeta.forEach(meta => execSheet.addRow({ key: meta[0], value: meta[1] }));

    // Save
    await workbook.xlsx.writeFile(outputPath);
  }
}

module.exports = ExcelReporter;
