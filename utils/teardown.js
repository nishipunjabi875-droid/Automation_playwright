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

  if (results.length === 0) {
    console.log('\nNo video validation results were collected.');
    return;
  }

  // Calculate metrics
  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const passPercentage = total > 0 ? ((passed / total) * 100).toFixed(2) : '0.00';
  
  // Calculate total execution time based on item execution times
  const totalTimeMs = results.reduce((acc, r) => acc + (parseFloat(r.executionTimeMs) || 0), 0);
  const totalTimeSec = (totalTimeMs / 1000).toFixed(2);

  // Compile final Excel spreadsheet with fallback logic for locked/open files
  let savedPath = reportPath;
  try {
    await writeExcel(results, reportPath);
  } catch (excelErr) {
    if (excelErr.code === 'EBUSY') {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      savedPath = reportPath.replace('.xlsx', `_backup_${timestamp}.xlsx`);
      console.warn(`\n[WARNING] Could not write to default report because it is open in Excel: ${reportPath}`);
      console.warn(`[WARNING] Saving report backup to: ${savedPath}\n`);
      try {
        await writeExcel(results, savedPath);
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
