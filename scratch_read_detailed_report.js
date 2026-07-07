const ExcelJS = require('exceljs');
const path = require('path');

async function readReport() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(__dirname, 'results', 'lead_validation_report.xlsx'));
  const ws = wb.getWorksheet('Lead Verification Results');
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    const vals = row.values;
    console.log(`\n========================================`);
    console.log(`SRN ${vals[1]} - ${vals[2]}`);
    console.log(`URL: ${vals[3]}`);
    console.log(`Status: ${vals[4]}`);
    console.log(`Intercepted ReqType: ${vals[5]}`);
    console.log(`Intercepted SourceID: ${vals[6]}`);
    console.log(`Expected SourceID: ${vals[7]}`);
    console.log(`Lead ID: ${vals[8]}`);
    console.log(`Payload: ${vals[10]}`);
    console.log(`Notes: ${vals[11]}`);
  });
}

readReport().catch(console.error);
