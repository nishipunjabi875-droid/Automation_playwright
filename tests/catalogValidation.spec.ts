import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { CatalogValidator } from '../src/utils/validator';
import { FileParser } from '../src/utils/fileParser';
import { Reporter } from '../src/utils/reporter';
import { Logger } from '../src/utils/logger';
import { ProductRow } from '../src/types';

test.describe('Product Catalog Data Validation Suite', () => {
  const dataDir = path.join(process.cwd(), 'data');
  const logsDir = path.join(process.cwd(), 'logs');

  // Master Reference Files
  const hierarchyPath = path.join(dataDir, 'hierarchy.xlsx');
  const attributeMasterPath = path.join(dataDir, 'attributeMaster.xlsx');
  const mandatoryFieldsPath = path.join(dataDir, 'mandatoryFields.xlsx');

  // Outputs
  const excelReportPath = path.join(process.cwd(), 'Validation_Report.xlsx');
  const htmlReportPath = path.join(process.cwd(), 'Validation_Report.html');

  test.beforeAll(() => {
    // Clear old execution logs
    Logger.clearLogFile();
    Logger.info('===================================================');
    Logger.info('🚀 Initiating Catalog Validation Framework');
    Logger.info('===================================================');
  });

  test('Validate Product Catalog File', async () => {
    // 1. Dynamic input file detection
    // Can override via CATALOG_FILE environment variable (supports .xlsx and .csv)
    const defaultProductPath = path.join(dataDir, 'products.xlsx');
    const inputFilePath = process.env.CATALOG_FILE || defaultProductPath;
    const fileExt = path.extname(inputFilePath).toLowerCase();

    Logger.info(`Target catalog file: ${inputFilePath}`);

    // 2. Perform File Validation (Exists and is readable)
    const fileCheck = FileParser.verifyFile(inputFilePath);
    if (!fileCheck.exists || !fileCheck.readable) {
      const errorMsg = `File validation failed: ${fileCheck.error || 'file not found or not readable'}`;
      Logger.error(errorMsg);
      // Generate an empty report indicating file check failure
      await Reporter.generateExcelReport({
        summary: { totalRecords: 0, passed: 0, failed: 0, totalWarnings: 0, totalDuplicates: 0 },
        errors: [{
          rowNumber: 0,
          sku: 'N/A',
          validationType: 'File',
          expected: 'Existing and readable catalog file',
          actual: 'File missing or unreadable',
          errorMessage: `The file at path '${inputFilePath}' could not be accessed.`
        }],
        warnings: [],
        duplicates: [],
        processedRows: []
      }, excelReportPath);
      
      throw new Error(errorMsg);
    }

    // 3. Verify Master Configuration Files
    const masterFiles = [
      { name: 'Hierarchy Master', path: hierarchyPath },
      { name: 'Attribute Master', path: attributeMasterPath },
      { name: 'Mandatory Fields Config', path: mandatoryFieldsPath }
    ];

    for (const master of masterFiles) {
      const check = FileParser.verifyFile(master.path);
      if (!check.exists || !check.readable) {
        const err = `Critical master config file missing or unreadable: ${master.name} at ${master.path}`;
        Logger.error(err);
        throw new Error(err);
      }
    }

    // 4. Initialize Validator & Load Master Rules
    const validator = new CatalogValidator();
    Logger.info('Loading master verification schemas...');
    await validator.loadHierarchy(hierarchyPath);
    await validator.loadAttributeMaster(attributeMasterPath);
    await validator.loadMandatoryFields(mandatoryFieldsPath);

    // 5. Parse Catalog Rows
    Logger.info(`Parsing catalog file format: ${fileExt}`);
    let products: ProductRow[] = [];
    
    try {
      if (fileExt === '.xlsx') {
        products = await FileParser.parseExcel(inputFilePath);
      } else if (fileExt === '.csv') {
        products = await FileParser.parseCSV(inputFilePath);
      } else {
        throw new Error(`Unsupported catalog file extension: ${fileExt}. Only .xlsx and .csv are supported.`);
      }
      Logger.info(`Parsed ${products.length} product rows from catalog.`);
    } catch (parseErr: any) {
      Logger.error(`Error parsing catalog data file`, parseErr);
      throw parseErr;
    }

    // 6. Execute Validation Engine
    const validationResult = await validator.validate(products);

    // 7. Generate Excel & HTML Reports
    Logger.info('Generating consolidated reports...');
    await Reporter.generateExcelReport(validationResult, excelReportPath);
    Reporter.generateHtmlReport(validationResult, htmlReportPath);

    // 8. Console Logging Summary Dashboard
    const { totalRecords, passed, failed, totalWarnings, totalDuplicates } = validationResult.summary;
    const passRate = totalRecords > 0 ? ((passed / totalRecords) * 100).toFixed(1) : '100';

    Logger.info('===================================================');
    Logger.info('📊 VALIDATION PROCESS SUMMARY');
    Logger.info('===================================================');
    Logger.info(`  Total Records Scanned   : ${totalRecords}`);
    Logger.info(`  Passed Compliance check : ${passed}  (Compliance: ${passRate}%)`);
    Logger.info(`  Failed Validation       : ${failed}`);
    Logger.info(`  Duplicate Groups Found  : ${totalDuplicates}`);
    Logger.info(`  Warnings / Notices      : ${totalWarnings}`);
    Logger.info('===================================================');
    Logger.info(`📁 Excel Report saved to: ${excelReportPath}`);
    Logger.info(`📁 HTML Dashboard saved to: ${htmlReportPath}`);
    Logger.info(`📁 Detailed logs saved to: ${path.join(logsDir, 'execution.log')}`);
    Logger.info('===================================================');

    // Confirm that the reports were written
    expect(fs.existsSync(excelReportPath)).toBe(true);
    expect(fs.existsSync(htmlReportPath)).toBe(true);
  });
});
