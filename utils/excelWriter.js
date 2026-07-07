const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

/**
 * Generates an Excel report of the video validation results.
 * @param {Array<Object>} results - The list of validation result objects.
 * @param {string} outputPath - The path to save the Excel file.
 * @returns {Promise<void>}
 */
async function writeExcel(results, outputPath) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Video Validation Results');

  // Title Block
  sheet.addRow([]);
  const titleRow = sheet.addRow(['PRODUCT VIDEO VALIDATION REPORT']);
  titleRow.getCell(1).font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FF1F4E78' } };
  
  const dateRow = sheet.addRow([`Generated: ${new Date().toLocaleString()}`]);
  dateRow.getCell(1).font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF595959' } };
  sheet.addRow([]);

  // Setup Column Headers
  const headers = [
    'Product Name',
    'Product URL',
    'Video Selector',
    'Video Found (Yes/No)',
    'Click Successful (Yes/No)',
    'Player Opened (Yes/No)',
    'Video Loaded (Yes/No)',
    'Video URL',
    'Status',
    'Failure Reason',
    'Screenshot Path',
    'Execution Time'
  ];

  const headerRow = sheet.addRow(headers);
  headerRow.height = 28;
  
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E78' } // Premium Dark Navy
    };
    cell.font = {
      name: 'Segoe UI',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      bottom: { style: 'medium', color: { argb: 'FF1F4E78' } },
      left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
    };
  });

  // Add results rows
  results.forEach((item, index) => {
    const row = sheet.addRow([
      item.productName,
      item.productUrl,
      item.videoSelector,
      item.videoFound ? 'Yes' : 'No',
      item.clickSuccessful ? 'Yes' : 'No',
      item.playerOpened ? 'Yes' : 'No',
      item.videoLoaded ? 'Yes' : 'No',
      item.videoUrl || '',
      item.status, // PASS or FAIL
      item.failureReason || '',
      item.screenshotPath || '',
      item.executionTime || ''
    ]);

    row.height = 20;

    // Apply Zebra striping and standard font
    const isEven = index % 2 === 0;
    row.eachCell((cell) => {
      cell.font = { name: 'Segoe UI', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFF2F2F2' } },
        bottom: { style: 'thin', color: { argb: 'FFF2F2F2' } },
        left: { style: 'thin', color: { argb: 'FFF2F2F2' } },
        right: { style: 'thin', color: { argb: 'FFF2F2F2' } }
      };
      if (isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' } // Light gray stripe
        };
      }
    });

    // Formatting for Product URL
    const urlCell = row.getCell(2);
    urlCell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF0563C1' }, underline: true };

    // Format Status Cell (9)
    const statusCell = row.getCell(9);
    if (item.status === 'PASS') {
      statusCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF276A3C' } };
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD4EDDA' } // Light Green
      };
    } else {
      statusCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF721C24' } };
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8D7DA' } // Light Red
      };
    }
  });

  // Calculate and adjust column widths automatically
  sheet.columns.forEach((column) => {
    let maxLen = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const val = cell.value ? cell.value.toString() : '';
      if (val.length > maxLen) {
        maxLen = val.length;
      }
    });
    // Set width with padding, cap at 50 to avoid extra wide columns
    column.width = Math.min(Math.max(maxLen + 4, 12), 50);
  });

  await workbook.xlsx.writeFile(outputPath);
}

module.exports = { writeExcel };
