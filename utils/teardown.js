const fs = require('fs');
const path = require('path');
const { writeExcel } = require('./excelWriter');

module.exports = async () => {
  const tempDir = path.resolve(__dirname, '../reports/temp_results');
  const reportPath = path.resolve(__dirname, '../reports/report.xlsx');

  const results = [];
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(tempDir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          results.push(JSON.parse(content));
        } catch (e) {
          console.error(`Error reading temp file ${file}:`, e);
        }
      }
    }
  }

  // Load all products from products.csv to ensure 100% data coverage
  const csvPath = path.resolve(__dirname, '../data/products.csv');
  let products = [];
  try {
    if (fs.existsSync(csvPath)) {
      const content = fs.readFileSync(csvPath, 'utf-8');
      const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length > 0) {
        const delimiter = lines[0].includes('\t') ? '\t' : ',';
        const headers = lines[0].split(delimiter).map(h => h.trim());
        
        products = lines.slice(1).map(line => {
          const values = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
              values.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current.trim());

          const rowObj = {};
          headers.forEach((header, idx) => {
            let val = values[idx] || '';
            if (val.startsWith('"') && val.endsWith('"')) {
              val = val.substring(1, val.length - 1);
            }
            rowObj[header] = val;
          });

          const name = rowObj['Product Name'] || rowObj['ProductName'] || '';
          const url = rowObj['Product URL'] || rowObj['ProductURL'] || '';
          const selector = rowObj['VideoSelector'] || rowObj['Video Selector'] || '.image-gallery-thumbnail.hasvideo, .videoSlider .cursor-pointer, .video-tile, #videos-tab, .isvideo img';
          let expected = rowObj['ExpectedVideo'] || rowObj['Expected Video'] || '';
          if (!expected) {
            const videoUrlCol = rowObj['Video URL'] || rowObj['VideoURL'] || '';
            if (videoUrlCol) {
              const parts = videoUrlCol.split('/');
              expected = parts[parts.length - 1].split('.')[0];
            }
          }
          return { name, url, selector, expected };
        }).filter(p => p.name && p.url);
      }
    }
  } catch (e) {
    console.error('Failed to parse products.csv in teardown:', e.message);
  }

  // Merge CSV products with actual results to fill any missing/aborted tests
  let finalResults = [];
  if (products.length > 0) {
    const resultsMap = new Map();
    results.forEach(r => {
      const key = r.productName.trim().toLowerCase();
      resultsMap.set(key, r);
    });

    products.forEach(p => {
      const key = p.name.trim().toLowerCase();
      if (resultsMap.has(key)) {
        finalResults.push(resultsMap.get(key));
      } else {
        finalResults.push({
          productName: p.name,
          productUrl: p.url,
          videoSelector: p.selector,
          expectedVideo: p.expected,
          videoFound: false,
          clickSuccessful: false,
          playerOpened: false,
          videoLoaded: false,
          videoUrl: '',
          videoMappedCorrectly: 'N/A',
          hasDuplicates: false,
          status: 'SKIPPED',
          failureReason: 'Test execution did not run or was aborted before completion',
          screenshotPath: '',
          executionTimeMs: 0,
          executionTime: '0.00s'
        });
      }
    });
  } else {
    finalResults = results;
  }

  if (finalResults.length === 0) {
    console.log('\nNo video validation results were collected.');
    return;
  }

  // Calculate metrics
  const total = finalResults.length;
  const passed = finalResults.filter(r => r.status === 'PASS').length;
  const failed = finalResults.filter(r => r.status === 'FAIL').length;
  const skipped = finalResults.filter(r => r.status === 'SKIPPED').length;
  const passPercentage = total > 0 ? ((passed / total) * 100).toFixed(2) : '0.00';
  
  // Calculate total execution time based on item execution times
  const totalTimeMs = finalResults.reduce((acc, r) => acc + (parseFloat(r.executionTimeMs) || 0), 0);
  const totalTimeSec = (totalTimeMs / 1000).toFixed(2);

  // Compile final Excel spreadsheet with fallback logic for locked/open files
  let savedPath = reportPath;
  try {
    await writeExcel(finalResults, reportPath);
  } catch (excelErr) {
    if (excelErr.code === 'EBUSY') {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      savedPath = reportPath.replace('.xlsx', `_backup_${timestamp}.xlsx`);
      console.warn(`\n[WARNING] Could not write to default report because it is open in Excel: ${reportPath}`);
      console.warn(`[WARNING] Saving report backup to: ${savedPath}\n`);
      try {
        await writeExcel(finalResults, savedPath);
      } catch (backupErr) {
        console.error(`[ERROR] Failed to save backup report: ${backupErr.message}`);
      }
    } else {
      console.error(`[ERROR] Failed to compile Excel report: ${excelErr.message}`);
    }
  }

  // Generate Terminal Summary
  console.log('\n==================================================');
  console.log('         PRODUCT VIDEO VALIDATION SUMMARY         ');
  console.log('==================================================');
  console.log(`Total Products   : ${total}`);
  console.log(`Passed           : ${passed}`);
  console.log(`Failed           : ${failed}`);
  if (skipped > 0) {
    console.log(`Skipped/Aborted  : ${skipped}`);
  }
  console.log(`Pass Percentage  : ${passPercentage}%`);
  console.log(`Total Run Time   : ${totalTimeSec}s`);
  console.log('==================================================');
  console.log(`Excel report written to: ${savedPath}`);
  console.log('==================================================\n');

  // Clean up the temporary results files and directory
  try {
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      fs.unlinkSync(path.join(tempDir, file));
    }
    fs.rmdirSync(tempDir);
  } catch (err) {
    console.error(`Cleanup error: ${err.message}`);
  }
};
