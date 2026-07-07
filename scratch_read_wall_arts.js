const xlsx = require('xlsx');

const reportFile = './results/sale_validation_report.xlsx';
const wb = xlsx.readFile(reportFile);
const sheet = wb.Sheets["Validation Results"];
const data = xlsx.utils.sheet_to_json(sheet);

const wallArts = data.filter(r => r["URL"] && r["URL"].includes("wall-arts"));
wallArts.forEach(r => {
  console.log(`Row: ${r["#"]} | View: ${r["View"]} | Page Type: ${r["Page Type"]} | Status: ${r["Status"]}`);
  console.log(`URL: ${r["URL"]}`);
  console.log(`Notes: ${r["Notes"]}`);
  console.log(`Screenshot: ${r["Screenshot File"]}`);
  console.log("-".repeat(40));
});
