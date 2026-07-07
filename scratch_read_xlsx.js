const ExcelJS = require('exceljs');
const path = require('path');

async function readReport() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(__dirname, 'results', 'lead_validation_report.xlsx'));
  const ws = wb.getWorksheet('Lead Verification Results');
  ws.eachRow((row, rowNumber) => {
    // Columns: SRN, Name, URL, Status, Intercepted ReqType, Intercepted SourceID, Expected SourceID, Lead ID, Screenshot, Video, Payload, Notes
    const vals = row.values;
    console.log(`SRN ${vals[1] || 'SRN'}: Name=${vals[2]} Status=${vals[4]}, ReqType=${vals[5]}, Video=${vals[10]}, Notes=${vals[12]}`);
  });
}

readReport().catch(console.error);
