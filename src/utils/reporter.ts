import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';
import { ValidationResult, ValidationError, ValidationWarning, DuplicateRecord } from '../types';
import { Logger } from './logger';

export class Reporter {
  /**
   * Generates the multi-sheet Excel Report (Validation_Report.xlsx)
   */
  public static async generateExcelReport(result: ValidationResult, outputPath: string): Promise<void> {
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Catalog Verification Framework';
      wb.created = new Date();

      // --- Sheet 1: Summary ---
      const summarySheet = wb.addWorksheet('Summary');
      summarySheet.views = [{ showGridLines: true }];
      
      summarySheet.columns = [
        { header: 'Metric', key: 'metric', width: 30 },
        { header: 'Value', key: 'value', width: 15 }
      ];

      // Format Header
      const summaryHeaderRow = summarySheet.getRow(1);
      summaryHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      summaryHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E78' } // Navy Blue
      };
      summaryHeaderRow.alignment = { vertical: 'middle', horizontal: 'left' };

      summarySheet.addRows([
        { metric: 'Total Records Processed', value: result.summary.totalRecords },
        { metric: 'Passed Records', value: result.summary.passed },
        { metric: 'Failed Records', value: result.summary.failed },
        { metric: 'Total Duplicate Groups', value: result.summary.totalDuplicates },
        { metric: 'Total Warnings', value: result.summary.totalWarnings },
        { metric: 'Pass Rate (%)', value: result.summary.totalRecords > 0 
            ? Number(((result.summary.passed / result.summary.totalRecords) * 100).toFixed(2)) 
            : 100 
        }
      ]);

      // Style summary rows
      summarySheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        
        // Borders and font
        row.font = { size: 11 };
        row.getCell('metric').font = { bold: true };
        row.getCell('value').alignment = { horizontal: 'right' };
        
        // Highlight Status
        const metricVal = row.getCell('metric').value;
        if (metricVal === 'Passed Records') {
          row.getCell('value').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } }; // Soft green
          row.getCell('value').font = { bold: true, color: { argb: 'FF375623' } };
        } else if (metricVal === 'Failed Records' && result.summary.failed > 0) {
          row.getCell('value').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } }; // Soft red
          row.getCell('value').font = { bold: true, color: { argb: 'FFC65911' } };
        } else if (metricVal === 'Pass Rate (%)') {
          const passVal = Number(row.getCell('value').value);
          row.getCell('value').numFmt = '0.0"%"';
          if (passVal === 100) {
            row.getCell('value').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
          } else if (passVal < 80) {
            row.getCell('value').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
          }
        }
      });

      // --- Sheet 2: Failed Records ---
      const failedSheet = wb.addWorksheet('Failed Records');
      failedSheet.views = [{ state: 'frozen', ySplit: 1, showGridLines: true }];
      failedSheet.columns = [
        { header: 'Row #', key: 'rowNumber', width: 10 },
        { header: 'SKU', key: 'sku', width: 15 },
        { header: 'Validation Type', key: 'validationType', width: 20 },
        { header: 'Expected Rule / Limit', key: 'expected', width: 40 },
        { header: 'Actual Value', key: 'actual', width: 45 },
        { header: 'Error Message', key: 'errorMessage', width: 50 }
      ];

      const failedHeaderRow = failedSheet.getRow(1);
      failedHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      failedHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFC00000' } // Red
      };

      result.errors.forEach(err => {
        failedSheet.addRow(err);
      });

      // Style rows
      failedSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        
        row.font = { size: 10 };
        row.getCell('rowNumber').alignment = { horizontal: 'center' };
        row.getCell('sku').font = { bold: true };
        
        // Warning light red fill for error rows
        row.eachCell((cell) => {
          cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFE5E5E5' } }
          };
        });
      });

      // --- Sheet 3: Duplicates ---
      const dupsSheet = wb.addWorksheet('Duplicates');
      dupsSheet.views = [{ state: 'frozen', ySplit: 1, showGridLines: true }];
      dupsSheet.columns = [
        { header: 'Duplicate Item', key: 'duplicateItem', width: 40 },
        { header: 'Duplicate Type', key: 'reason', width: 20 },
        { header: 'First Associated SKU', key: 'sku', width: 15 },
        { header: 'Found on Rows', key: 'rowsStr', width: 20 }
      ];

      const dupsHeaderRow = dupsSheet.getRow(1);
      dupsHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      dupsHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF7030A0' } // Purple
      };

      result.duplicates.forEach(dup => {
        const itemVal = dup.reason === 'SKU' ? dup.sku : dup.reason === 'Product Name' ? dup.productName : dup.imageUrl;
        dupsSheet.addRow({
          duplicateItem: itemVal,
          reason: dup.reason,
          sku: dup.sku,
          rowsStr: dup.rows.join(', ')
        });
      });

      dupsSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.font = { size: 10 };
        row.getCell('rowsStr').alignment = { horizontal: 'center' };
      });

      // --- Sheet 4: Warnings ---
      const warnSheet = wb.addWorksheet('Warnings');
      warnSheet.views = [{ state: 'frozen', ySplit: 1, showGridLines: true }];
      warnSheet.columns = [
        { header: 'Row #', key: 'rowNumber', width: 10 },
        { header: 'SKU', key: 'sku', width: 15 },
        { header: 'Warning Type', key: 'warningType', width: 25 },
        { header: 'Recommendation Message', key: 'message', width: 65 }
      ];

      const warnHeaderRow = warnSheet.getRow(1);
      warnHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      warnHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE3A21A' } // Amber / Orange
      };

      result.warnings.forEach(warn => {
        warnSheet.addRow(warn);
      });

      warnSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.font = { size: 10 };
        row.getCell('rowNumber').alignment = { horizontal: 'center' };
      });

      // Ensure directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      await wb.xlsx.writeFile(outputPath);
      Logger.success(`Excel verification report generated: ${outputPath}`);
    } catch (err) {
      Logger.error(`Failed to write Excel report to ${outputPath}`, err);
      throw err;
    }
  }

  /**
   * Generates the gorgeous HTML dashboard report (Validation_Report.html)
   */
  public static generateHtmlReport(result: ValidationResult, outputPath: string): void {
    try {
      const timestamp = new Date().toLocaleString();
      const passRate = result.summary.totalRecords > 0 
        ? ((result.summary.passed / result.summary.totalRecords) * 100).toFixed(1) 
        : '100';
      const parsedErrorsJson = JSON.stringify(result.errors);
      const parsedWarningsJson = JSON.stringify(result.warnings);
      const parsedDuplicatesJson = JSON.stringify(result.duplicates);

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Catalog Validation Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #090d16;
      --bg-secondary: rgba(17, 24, 39, 0.7);
      --border-color: rgba(255, 255, 255, 0.08);
      --text-main: #f3f4f6;
      --text-muted: #9ca3af;
      
      --neon-blue: #00f2fe;
      --neon-green: #00f2a9;
      --neon-red: #ff3366;
      --neon-yellow: #f8b500;
      --neon-purple: #b026ff;

      --blue-glow: rgba(0, 242, 254, 0.15);
      --green-glow: rgba(0, 242, 169, 0.15);
      --red-glow: rgba(255, 51, 102, 0.15);
      --yellow-glow: rgba(248, 181, 0, 0.15);
      --purple-glow: rgba(176, 38, 255, 0.15);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }

    body {
      background-color: var(--bg-primary);
      background-image: 
        radial-gradient(at 10% 20%, rgba(0, 242, 254, 0.05) 0px, transparent 50%),
        radial-gradient(at 90% 80%, rgba(176, 38, 255, 0.05) 0px, transparent 50%);
      color: var(--text-main);
      min-height: 100vh;
      padding: 2rem;
      overflow-x: hidden;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2.5rem;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 1.5rem;
    }

    .logo-area {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      width: 42px;
      height: 42px;
      background: linear-gradient(135deg, var(--neon-blue), var(--neon-purple));
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 1.3rem;
      color: #000;
      box-shadow: 0 0 20px rgba(0, 242, 254, 0.3);
    }

    .logo-title h1 {
      font-size: 1.5rem;
      font-weight: 700;
      background: linear-gradient(90deg, #fff, var(--text-muted));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .logo-title p {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .meta-time {
      text-align: right;
    }

    .meta-time .time {
      font-size: 0.95rem;
      color: var(--neon-blue);
      font-weight: 600;
    }

    .meta-time .label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* Grid Layout for Cards */
    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2.5rem;
    }

    .card {
      background: var(--bg-secondary);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 1.5rem;
      position: relative;
      overflow: hidden;
      transition: transform 0.3s ease, border-color 0.3s ease;
    }

    .card:hover {
      transform: translateY(-4px);
    }

    .card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
    }

    .card-total::before { background-color: var(--neon-blue); }
    .card-passed::before { background-color: var(--neon-green); }
    .card-failed::before { background-color: var(--neon-red); }
    .card-dups::before { background-color: var(--neon-purple); }
    .card-warnings::before { background-color: var(--neon-yellow); }

    .card-total { box-shadow: 0 4px 20px -5px var(--blue-glow); }
    .card-passed { box-shadow: 0 4px 20px -5px var(--green-glow); }
    .card-failed { box-shadow: 0 4px 20px -5px var(--red-glow); }
    .card-dups { box-shadow: 0 4px 20px -5px var(--purple-glow); }
    .card-warnings { box-shadow: 0 4px 20px -5px var(--yellow-glow); }

    .card-total:hover { border-color: var(--neon-blue); }
    .card-passed:hover { border-color: var(--neon-green); }
    .card-failed:hover { border-color: var(--neon-red); }
    .card-dups:hover { border-color: var(--neon-purple); }
    .card-warnings:hover { border-color: var(--neon-yellow); }

    .card-label {
      font-size: 0.85rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.5rem;
    }

    .card-value {
      font-size: 2.2rem;
      font-weight: 800;
      display: flex;
      align-items: baseline;
      gap: 5px;
    }

    .card-subtext {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 0.5rem;
    }

    /* Main Content Wrapper */
    .content-wrapper {
      background: var(--bg-secondary);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 2rem;
    }

    /* Tabs & Controls */
    .tabs-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1.5rem;
    }

    .tabs {
      display: flex;
      background: rgba(0, 0, 0, 0.3);
      padding: 4px;
      border-radius: 10px;
      border: 1px solid var(--border-color);
    }

    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 0.6rem 1.2rem;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tab-btn.active {
      background: linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(176, 38, 255, 0.2));
      color: #fff;
      box-shadow: inset 0 0 10px rgba(0, 242, 254, 0.1);
      border: 1px solid rgba(0, 242, 254, 0.3);
    }

    .badge {
      font-size: 0.75rem;
      padding: 2px 6px;
      border-radius: 6px;
      font-weight: 700;
    }

    .badge-error { background: var(--neon-red); color: #fff; }
    .badge-warn { background: var(--neon-yellow); color: #000; }
    .badge-dup { background: var(--neon-purple); color: #fff; }

    .search-filter {
      display: flex;
      gap: 10px;
      flex-grow: 1;
      max-width: 500px;
    }

    .search-input {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--border-color);
      padding: 0.7rem 1rem;
      border-radius: 10px;
      color: #fff;
      font-size: 0.9rem;
      width: 100%;
      outline: none;
      transition: border-color 0.2s;
    }

    .search-input:focus {
      border-color: var(--neon-blue);
      box-shadow: 0 0 10px rgba(0, 242, 254, 0.2);
    }

    .filter-select {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--border-color);
      padding: 0.7rem 1rem;
      border-radius: 10px;
      color: #fff;
      font-size: 0.9rem;
      outline: none;
      cursor: pointer;
    }

    .filter-select:focus {
      border-color: var(--neon-blue);
    }

    /* Table styles */
    .table-container {
      overflow-x: auto;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      background: rgba(0, 0, 0, 0.2);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    th {
      background: rgba(0, 0, 0, 0.4);
      color: var(--text-muted);
      padding: 1rem;
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border-color);
    }

    td {
      padding: 1rem;
      font-size: 0.9rem;
      border-bottom: 1px solid var(--border-color);
      vertical-align: middle;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }

    .row-num {
      font-weight: 700;
      color: var(--neon-blue);
      text-align: center;
    }

    .sku-cell {
      font-weight: 700;
    }

    .type-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .tb-hierarchy { background: rgba(0, 242, 254, 0.1); color: var(--neon-blue); border: 1px solid rgba(0, 242, 254, 0.2); }
    .tb-attribute { background: rgba(176, 38, 255, 0.1); color: var(--neon-purple); border: 1px solid rgba(176, 38, 255, 0.2); }
    .tb-material { background: rgba(176, 38, 255, 0.1); color: var(--neon-purple); border: 1px solid rgba(176, 38, 255, 0.2); }
    .tb-price { background: rgba(0, 242, 169, 0.1); color: var(--neon-green); border: 1px solid rgba(0, 242, 169, 0.2); }
    .tb-image { background: rgba(255, 51, 102, 0.1); color: var(--neon-red); border: 1px solid rgba(255, 51, 102, 0.2); }
    .tb-seo { background: rgba(248, 181, 0, 0.1); color: var(--neon-yellow); border: 1px solid rgba(248, 181, 0, 0.2); }
    .tb-consistency { background: rgba(0, 242, 254, 0.1); color: var(--neon-blue); border: 1px solid rgba(0, 242, 254, 0.2); }
    .tb-dimension { background: rgba(0, 242, 169, 0.1); color: var(--neon-green); border: 1px solid rgba(0, 242, 169, 0.2); }
    .tb-missing { background: rgba(255, 51, 102, 0.1); color: var(--neon-red); border: 1px solid rgba(255, 51, 102, 0.2); }
    .tb-warning { background: rgba(248, 181, 0, 0.1); color: var(--neon-yellow); border: 1px solid rgba(248, 181, 0, 0.2); }
    .tb-duplicate { background: rgba(176, 38, 255, 0.1); color: var(--neon-purple); border: 1px solid rgba(176, 38, 255, 0.2); }

    .code-val {
      font-family: monospace;
      background: rgba(0, 0, 0, 0.3);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.85rem;
      border: 1px solid rgba(255, 255, 255, 0.05);
      word-break: break-all;
    }

    .error-msg {
      color: rgba(255, 255, 255, 0.95);
      font-weight: 500;
    }

    .empty-state {
      padding: 3rem;
      text-align: center;
      color: var(--text-muted);
      font-size: 1rem;
    }

    .empty-state-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      display: block;
    }

    .text-green { color: var(--neon-green) !important; }
    .text-red { color: var(--neon-red) !important; }
    .text-blue { color: var(--neon-blue) !important; }

    /* Custom Scrollbars */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: var(--bg-primary);
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  </style>
</head>
<body>

  <header>
    <div class="logo-area">
      <div class="logo-icon">C</div>
      <div class="logo-title">
        <h1>Catalog Upload Validator</h1>
        <p>Pre-upload compliance auditing framework</p>
      </div>
    </div>
    <div class="meta-time">
      <div class="time">${timestamp}</div>
      <div class="label">Audit Timestamp</div>
    </div>
  </header>

  <div class="dashboard-grid">
    <div class="card card-total">
      <div class="card-label">Total Records</div>
      <div class="card-value text-blue">${result.summary.totalRecords}</div>
      <div class="card-subtext">Excel / CSV rows parsed</div>
    </div>
    <div class="card card-passed">
      <div class="card-label">Passed Compliance</div>
      <div class="card-value text-green">${result.summary.passed}</div>
      <div class="card-subtext">${passRate}% compliance rate</div>
    </div>
    <div class="card card-failed">
      <div class="card-label">Failed Audits</div>
      <div class="card-value text-red">${result.summary.failed}</div>
      <div class="card-subtext">Blocking upload errors found</div>
    </div>
    <div class="card card-dups">
      <div class="card-label">Duplicate Groups</div>
      <div class="card-value" style="color: var(--neon-purple)">${result.summary.totalDuplicates}</div>
      <div class="card-subtext">Critical duplication errors</div>
    </div>
    <div class="card card-warnings">
      <div class="card-label">Warnings</div>
      <div class="card-value text-warn" style="color: var(--neon-yellow)">${result.summary.totalWarnings}</div>
      <div class="card-subtext">Non-blocking recommendations</div>
    </div>
  </div>

  <div class="content-wrapper">
    <div class="tabs-controls">
      <div class="tabs">
        <button class="tab-btn active" onclick="switchTab('errors')">
          Errors <span class="badge badge-error">${result.errors.length}</span>
        </button>
        <button class="tab-btn" onclick="switchTab('warnings')">
          Warnings <span class="badge badge-warn">${result.warnings.length}</span>
        </button>
        <button class="tab-btn" onclick="switchTab('duplicates')">
          Duplicates <span class="badge badge-dup">${result.duplicates.length}</span>
        </button>
      </div>

      <div class="search-filter">
        <input type="text" id="searchInput" class="search-input" placeholder="Search by SKU, Rule, or Type..." oninput="applyFilters()">
        <select id="typeFilter" class="filter-select" onchange="applyFilters()">
          <option value="ALL">All Types</option>
        </select>
      </div>
    </div>

    <div class="table-container">
      <table id="dataTable">
        <thead>
          <tr id="tableHeaders">
            <!-- Dynamic Headers -->
          </tr>
        </thead>
        <tbody id="tableBody">
          <!-- Dynamic Rows -->
        </tbody>
      </table>
      <div id="emptyState" class="empty-state" style="display: none;">
        <span class="empty-state-icon">🎉</span>
        <p>No records match the selected filters!</p>
      </div>
    </div>
  </div>

  <script>
    const errors = ${parsedErrorsJson};
    const warnings = ${parsedWarningsJson};
    const duplicates = ${parsedDuplicatesJson};
    
    let currentTab = 'errors';

    function switchTab(tabName) {
      currentTab = tabName;
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      const activeBtnIndex = tabName === 'errors' ? 0 : tabName === 'warnings' ? 1 : 2;
      document.querySelectorAll('.tab-btn')[activeBtnIndex].classList.add('active');

      // Populate Type Filter options based on data
      const filterSelect = document.getElementById('typeFilter');
      filterSelect.innerHTML = '<option value="ALL">All Types</option>';
      
      const types = new Set();
      if (tabName === 'errors') {
        errors.forEach(e => types.add(e.validationType));
      } else if (tabName === 'warnings') {
        warnings.forEach(w => types.add(w.warningType));
      } else if (tabName === 'duplicates') {
        duplicates.forEach(d => types.add(d.reason));
      }

      types.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        filterSelect.appendChild(opt);
      });

      document.getElementById('searchInput').value = '';
      applyFilters();
    }

    function applyFilters() {
      const search = document.getElementById('searchInput').value.toLowerCase();
      const typeFilter = document.getElementById('typeFilter').value;
      const tHeaders = document.getElementById('tableHeaders');
      const tBody = document.getElementById('tableBody');
      const emptyState = document.getElementById('emptyState');

      tBody.innerHTML = '';

      if (currentTab === 'errors') {
        tHeaders.innerHTML = \`
          <th style="width: 8%">Row #</th>
          <th style="width: 12%">SKU</th>
          <th style="width: 15%">Validation Type</th>
          <th style="width: 25%">Expected Rule</th>
          <th style="width: 20%">Actual Value</th>
          <th style="width: 20%">Error Message</th>
        \`;

        const filtered = errors.filter(e => {
          const matchesSearch = e.sku.toLowerCase().includes(search) || 
                                e.validationType.toLowerCase().includes(search) || 
                                e.errorMessage.toLowerCase().includes(search);
          const matchesType = typeFilter === 'ALL' || e.validationType === typeFilter;
          return matchesSearch && matchesType;
        });

        if (filtered.length === 0) {
          emptyState.style.display = 'block';
        } else {
          emptyState.style.display = 'none';
          filtered.forEach(e => {
            const tr = document.createElement('tr');
            tr.innerHTML = \`
              <td class="row-num">\${e.rowNumber}</td>
              <td class="sku-cell">\${e.sku || '<span class="text-red">MISSING</span>'}</td>
              <td><span class="type-badge tb-\${e.validationType.toLowerCase().replace(/\\s+/g, '')}">\${e.validationType}</span></td>
              <td><span class="code-val">\${escapeHtml(e.expected)}</span></td>
              <td><span class="code-val">\${escapeHtml(e.actual)}</span></td>
              <td class="error-msg">\${e.errorMessage}</td>
            \`;
            tBody.appendChild(tr);
          });
        }

      } else if (currentTab === 'warnings') {
        tHeaders.innerHTML = \`
          <th style="width: 10%">Row #</th>
          <th style="width: 15%">SKU</th>
          <th style="width: 20%">Warning Type</th>
          <th style="width: 55%">Recommendation Message</th>
        \`;

        const filtered = warnings.filter(w => {
          const matchesSearch = w.sku.toLowerCase().includes(search) || 
                                w.warningType.toLowerCase().includes(search) || 
                                w.message.toLowerCase().includes(search);
          const matchesType = typeFilter === 'ALL' || w.warningType === typeFilter;
          return matchesSearch && matchesType;
        });

        if (filtered.length === 0) {
          emptyState.style.display = 'block';
        } else {
          emptyState.style.display = 'none';
          filtered.forEach(w => {
            const tr = document.createElement('tr');
            tr.innerHTML = \`
              <td class="row-num">\${w.rowNumber}</td>
              <td class="sku-cell">\${w.sku || 'N/A'}</td>
              <td><span class="type-badge tb-warning">\${w.warningType}</span></td>
              <td>\${w.message}</td>
            \`;
            tBody.appendChild(tr);
          });
        }

      } else if (currentTab === 'duplicates') {
        tHeaders.innerHTML = \`
          <th style="width: 40%">Duplicate Item</th>
          <th style="width: 20%">Duplicate Type</th>
          <th style="width: 20%">Associated SKU</th>
          <th style="width: 20%">Found on Rows</th>
        \`;

        const filtered = duplicates.filter(d => {
          const itemVal = d.reason === 'SKU' ? d.sku : d.reason === 'Product Name' ? d.productName : d.imageUrl;
          const matchesSearch = itemVal.toLowerCase().includes(search) || 
                                d.sku.toLowerCase().includes(search) || 
                                d.reason.toLowerCase().includes(search);
          const matchesType = typeFilter === 'ALL' || d.reason === typeFilter;
          return matchesSearch && matchesType;
        });

        if (filtered.length === 0) {
          emptyState.style.display = 'block';
        } else {
          emptyState.style.display = 'none';
          filtered.forEach(d => {
            const itemVal = d.reason === 'SKU' ? d.sku : d.reason === 'Product Name' ? d.productName : d.imageUrl;
            const tr = document.createElement('tr');
            tr.innerHTML = \`
              <td><span class="code-val">\${escapeHtml(itemVal)}</span></td>
              <td><span class="type-badge tb-duplicate">\${d.reason}</span></td>
              <td class="sku-cell">\${d.sku || 'N/A'}</td>
              <td class="row-num" style="color: var(--neon-purple)">\${d.rows.join(', ')}</td>
            \`;
            tBody.appendChild(tr);
          });
        }
      }
    }

    function escapeHtml(text) {
      if (!text) return '';
      return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    // Init tab
    switchTab('errors');
  </script>
</body>
</html>`;

      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(outputPath, htmlContent, 'utf8');
      Logger.success(`HTML report dashboard generated: ${outputPath}`);
    } catch (err) {
      Logger.error(`Failed to write HTML report to ${outputPath}`, err);
      throw err;
    }
  }
}
