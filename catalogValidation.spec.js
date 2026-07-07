const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const csvParser = require('csv-parser');
const axios = require('axios');

// ==========================================
// 1. Logger Implementation
// ==========================================
const logFilePath = path.join(process.cwd(), 'logs', 'execution.log');

function ensureLogDir() {
  const logDir = path.dirname(logFilePath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

function writeLog(level, message) {
  ensureLogDir();
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  fs.appendFileSync(logFilePath, logMessage, 'utf8');
}

const Logger = {
  info: (msg) => {
    console.log(`[INFO] ${msg}`);
    writeLog('INFO', msg);
  },
  warn: (msg) => {
    console.warn(`\x1b[33m[WARN] ${msg}\x1b[0m`);
    writeLog('WARN', msg);
  },
  error: (msg, err) => {
    let errMsg = msg;
    if (err) {
      errMsg += ` - ${err.message || err}`;
      if (err.stack) errMsg += `\nStack: ${err.stack}`;
    }
    console.error(`\x1b[31m[ERROR] ${errMsg}\x1b[0m`);
    writeLog('ERROR', errMsg);
  },
  success: (msg) => {
    console.log(`\x1b[32m[SUCCESS] ${msg}\x1b[0m`);
    writeLog('SUCCESS', msg);
  },
  clearLogFile: () => {
    ensureLogDir();
    if (fs.existsSync(logFilePath)) {
      fs.writeFileSync(logFilePath, '', 'utf8');
    }
  }
};

// ==========================================
// 2. File Parser Implementation
// ==========================================
const FileParser = {
  verifyFile: (filePath) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { exists: false, readable: false, error: 'File does not exist' };
      }
      fs.accessSync(filePath, fs.constants.R_OK);
      return { exists: true, readable: true };
    } catch (err) {
      return { exists: true, readable: false, error: err.message || 'File is not readable' };
    }
  },

  parseExcel: async (filePath) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error(`First worksheet not found in ${filePath}`);
    }

    const rows = [];
    const headers = [];

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell({ includeEmpty: true }, (cell) => {
          headers.push(String(cell.value || '').trim());
        });
      } else {
        const rowData = {};
        for (let i = 1; i <= headers.length; i++) {
          const header = headers[i - 1];
          if (!header) continue;

          const cell = row.getCell(i);
          let val = cell.value;

          if (val && typeof val === 'object') {
            if ('text' in val && 'hyperlink' in val) {
              val = val.text;
            } else if ('result' in val) {
              val = val.result;
            } else if ('richText' in val) {
              val = val.richText.map((rt) => rt.text || '').join('');
            }
          }

          rowData[header] = (val === null || val === undefined) ? '' : val;
        }
        rows.push(rowData);
      }
    });

    return rows;
  },

  parseCSV: (filePath) => {
    return new Promise((resolve, reject) => {
      const results = [];
      let separator = ',';
      try {
        const firstLine = fs.readFileSync(filePath, 'utf8').split('\n')[0];
        if (firstLine.includes('\t')) {
          separator = '\t';
        } else if (firstLine.includes(';')) {
          separator = ';';
        }
      } catch (err) {
        // ignore
      }
      fs.createReadStream(filePath)
        .pipe(csvParser({ separator }))
        .on('data', (data) => {
          const cleanData = {};
          for (const key of Object.keys(data)) {
            const cleanKey = key.trim();
            const val = data[key];
            cleanData[cleanKey] = typeof val === 'string' ? val.trim() : val;
          }
          results.push(cleanData);
        })
        .on('end', () => resolve(results))
        .on('error', (err) => reject(err));
    });
  }
};

// ==========================================
// 3. Validator Implementation
// ==========================================
class CatalogValidator {
  constructor() {
    this.hierarchyRules = [];
    this.attributeRules = [];
    this.mandatoryRules = [];
    this.requiredColumns = [
      'SKU', 'Product Name', 'Category', 'Sub Category',
      'Material', 'Color', 'MRP', 'Selling Price', 'Brand', 'Image URL'
    ];
  }

  async loadHierarchy(filePath) {
    const rows = await FileParser.parseExcel(filePath);
    this.hierarchyRules = rows.map(r => ({
      category: String(r.Category || '').trim(),
      subCategory: String(r['Sub Category'] || '').trim()
    }));
  }

  async loadAttributeMaster(filePath) {
    const rows = await FileParser.parseExcel(filePath);
    this.attributeRules = rows.map(r => {
      const allowedStr = String(r['Allowed Values'] || '').trim();
      const allowedValues = allowedStr
        ? allowedStr.split(',').map(v => v.trim().toLowerCase())
        : [];
      return {
        category: String(r.Category || '').trim(),
        attributeName: String(r['Attribute Name'] || '').trim(),
        allowedValues
      };
    });
  }

  async loadMandatoryFields(filePath) {
    const rows = await FileParser.parseExcel(filePath);
    this.mandatoryRules = rows.map(r => ({
      fieldName: String(r['Field Name'] || '').trim(),
      isMandatory: String(r['Is Mandatory'] || '').trim().toLowerCase() === 'yes',
      category: String(r.Category || '').trim()
    }));
  }

  async validate(products) {
    const errors = [];
    const warnings = [];
    const duplicates = [];
    const totalRecords = products.length;

    Logger.info(`Starting validation on ${totalRecords} records.`);

    // --- 1. Duplicate Validation (Global) ---
    const skuMap = new Map();
    const nameMap = new Map();
    const imageMap = new Map();
    const slugMap = new Map();

    products.forEach((prod, index) => {
      const rowNum = index + 2;
      const sku = String(prod.SKU || '').trim();
      const name = String(prod['Product Name'] || '').trim();
      const imageUrl = String(prod['Image URL'] || '').trim();
      const slug = String(prod['URL Slug'] || '').trim();

      if (sku) {
        if (!skuMap.has(sku)) skuMap.set(sku, []);
        skuMap.get(sku).push(rowNum);
      }
      if (name) {
        const lowerName = name.toLowerCase();
        if (!nameMap.has(lowerName)) nameMap.set(lowerName, []);
        nameMap.get(lowerName).push(rowNum);
      }
      if (imageUrl) {
        if (!imageMap.has(imageUrl)) imageMap.set(imageUrl, []);
        imageMap.get(imageUrl).push(rowNum);
      }
      if (slug) {
        const lowerSlug = slug.toLowerCase();
        if (!slugMap.has(lowerSlug)) slugMap.set(lowerSlug, []);
        slugMap.get(lowerSlug).push(rowNum);
      }
    });

    // Report duplicates
    skuMap.forEach((rows, sku) => {
      if (rows.length > 1) {
        duplicates.push({ sku, productName: '', imageUrl: '', rows, reason: 'SKU' });
        rows.forEach(r => {
          errors.push({
            rowNumber: r,
            sku,
            validationType: 'Duplicate',
            expected: 'Unique SKU',
            actual: `Duplicate SKU '${sku}' on rows: ${rows.join(', ')}`,
            errorMessage: 'Product has duplicate SKU.'
          });
        });
      }
    });

    nameMap.forEach((rows, name) => {
      if (rows.length > 1) {
        const firstRowIndex = rows[0] - 2;
        const sku = products[firstRowIndex] ? products[firstRowIndex].SKU : '';
        duplicates.push({ sku, productName: name, imageUrl: '', rows, reason: 'Product Name' });
        rows.forEach(r => {
          errors.push({
            rowNumber: r,
            sku: products[r - 2] ? products[r - 2].SKU : '',
            validationType: 'Duplicate',
            expected: 'Unique Product Name',
            actual: `Duplicate Product Name (case-insensitive) on rows: ${rows.join(', ')}`,
            errorMessage: 'Product Name is duplicated.'
          });
        });
      }
    });

    imageMap.forEach((rows, img) => {
      if (rows.length > 1) {
        const firstRowIndex = rows[0] - 2;
        const sku = products[firstRowIndex] ? products[firstRowIndex].SKU : '';
        duplicates.push({ sku, productName: '', imageUrl: img, rows, reason: 'Image URL' });
        rows.forEach(r => {
          errors.push({
            rowNumber: r,
            sku: products[r - 2] ? products[r - 2].SKU : '',
            validationType: 'Duplicate',
            expected: 'Unique Image URL',
            actual: `Duplicate Image URL on rows: ${rows.join(', ')}`,
            errorMessage: 'Image URL is duplicated across multiple rows.'
          });
        });
      }
    });

    slugMap.forEach((rows, slug) => {
      if (rows.length > 1) {
        rows.forEach(r => {
          errors.push({
            rowNumber: r,
            sku: products[r - 2] ? products[r - 2].SKU : '',
            validationType: 'SEO',
            expected: 'Unique URL Slug',
            actual: `Duplicate URL Slug '${slug}' on rows: ${rows.join(', ')}`,
            errorMessage: 'URL Slug must be unique.'
          });
        });
      }
    });

    // --- 2. Row by Row Validations ---
    const imageCheckPromises = [];

    for (let i = 0; i < products.length; i++) {
      const prod = products[i];
      const rowNum = i + 2;
      const sku = String(prod.SKU || '').trim();
      const category = String(prod.Category || '').trim();
      const subCategory = String(prod['Sub Category'] || '').trim();

      // Ensure required columns exist
      const rowKeys = Object.keys(prod);
      const missingHeaders = this.requiredColumns.filter(col => !rowKeys.includes(col));
      if (missingHeaders.length > 0) {
        errors.push({
          rowNumber: rowNum,
          sku,
          validationType: 'File',
          expected: `Required headers: ${this.requiredColumns.join(', ')}`,
          actual: `Missing headers: ${missingHeaders.join(', ')}`,
          errorMessage: 'Required column headers are missing from the data.'
        });
      }

      // Check missing values
      rowKeys.forEach(col => {
        const rawVal = prod[col];
        const strVal = typeof rawVal === 'string' ? rawVal.trim() : String(rawVal || '');
        const isMissingVal = rawVal === null || rawVal === undefined || strVal === '' ||
                             ['na', 'n/a', 'null', 'undefined', 'nan'].includes(strVal.toLowerCase());

        const mandRule = this.mandatoryRules.find(r => r.fieldName === col &&
          (r.category === 'Global' || r.category.toLowerCase() === category.toLowerCase()));

        const isMandatory = mandRule ? mandRule.isMandatory : this.requiredColumns.includes(col);

        if (isMissingVal) {
          if (isMandatory) {
            errors.push({
              rowNumber: rowNum,
              sku,
              validationType: 'Missing Data',
              expected: `Value for mandatory column [${col}]`,
              actual: rawVal === null ? 'null' : rawVal === undefined ? 'undefined' : strVal || 'empty',
              errorMessage: `Mandatory column '${col}' is empty or contains an invalid null/NA value.`
            });
          } else {
            warnings.push({
              rowNumber: rowNum,
              sku,
              warningType: 'Missing Optional Data',
              message: `Optional column '${col}' is empty or null.`
            });
          }
        }
      });

      if (!category || !subCategory) {
        continue;
      }

      // Hierarchy validation
      const matchingHierarchy = this.hierarchyRules.find(
        r => r.category.toLowerCase() === category.toLowerCase() &&
             r.subCategory.toLowerCase() === subCategory.toLowerCase()
      );
      if (!matchingHierarchy) {
        const allowedSubs = this.hierarchyRules
          .filter(r => r.category.toLowerCase() === category.toLowerCase())
          .map(r => r.subCategory)
          .join(', ');
        errors.push({
          rowNumber: rowNum,
          sku,
          validationType: 'Hierarchy',
          expected: `One of: [${allowedSubs}] for Category [${category}]`,
          actual: `Sub Category = '${subCategory}'`,
          errorMessage: `Invalid subcategory '${subCategory}' for category '${category}'.`
        });
      }

      // Attribute validation
      const categoryAttributes = this.attributeRules.filter(
        r => r.category.toLowerCase() === category.toLowerCase()
      );

      categoryAttributes.forEach(attrRule => {
        const attrName = attrRule.attributeName;
        const cellValue = prod[attrName];
        if (cellValue !== undefined && cellValue !== null && String(cellValue).trim() !== '') {
          const cleanVal = String(cellValue).trim().toLowerCase();

          if (attrRule.allowedValues.length > 0) {
            if (!attrRule.allowedValues.includes(cleanVal)) {
              const isMaterial = attrName.toLowerCase() === 'material';
              const isSeater = attrName.toLowerCase() === 'seater';

              let valType = 'Attribute';
              if (isMaterial) valType = 'Material';
              else if (isSeater) valType = 'Consistency';

              errors.push({
                rowNumber: rowNum,
                sku,
                validationType: valType,
                expected: `Allowed ${attrName} values: [${attrRule.allowedValues.join(', ')}]`,
                actual: `${attrName} = '${cellValue}'`,
                errorMessage: `Invalid value '${cellValue}' for attribute '${attrName}' under category '${category}'.`
              });
            }
          }
        }
      });

      // Special Consistency check (Sofa Seater allowed values)
      if (category.toLowerCase() === 'sofa' && prod.Seater) {
        const seaterVal = String(prod.Seater).trim();
        const allowedSofaSeaters = ['1 seater', '2 seater', '3 seater', '4 seater', 'l shape'];
        if (!allowedSofaSeaters.includes(seaterVal.toLowerCase())) {
          errors.push({
            rowNumber: rowNum,
            sku,
            validationType: 'Consistency',
            expected: '1 Seater, 2 Seater, 3 Seater, 4 Seater, or L Shape',
            actual: `Seater = '${seaterVal}'`,
            errorMessage: `Inconsistent data: Sofa category cannot have Seater value '${seaterVal}'.`
          });
        }
      }

      // Price checks
      const mrp = Number(prod.MRP);
      const sellingPrice = Number(prod['Selling Price']);

      if (isNaN(mrp) || mrp <= 0) {
        errors.push({
          rowNumber: rowNum,
          sku,
          validationType: 'Price',
          expected: 'MRP > 0',
          actual: `MRP = ${prod.MRP}`,
          errorMessage: 'MRP must be a positive number.'
        });
      }
      if (isNaN(sellingPrice) || sellingPrice <= 0) {
        errors.push({
          rowNumber: rowNum,
          sku,
          validationType: 'Price',
          expected: 'Selling Price > 0',
          actual: `Selling Price = ${prod['Selling Price']}`,
          errorMessage: 'Selling Price must be a positive number.'
        });
      }
      if (!isNaN(mrp) && !isNaN(sellingPrice) && mrp > 0 && sellingPrice > 0) {
        if (sellingPrice > mrp) {
          errors.push({
            rowNumber: rowNum,
            sku,
            validationType: 'Price',
            expected: `Selling Price <= MRP (${mrp})`,
            actual: `Selling Price = ${sellingPrice}`,
            errorMessage: 'Selling Price cannot exceed MRP.'
          });
        }

        // Validate discount formula
        const calculatedDiscount = ((mrp - sellingPrice) / mrp) * 100;

        if (prod.Discount !== undefined && prod.Discount !== null && String(prod.Discount).trim() !== '') {
          const fileDiscountStr = String(prod.Discount).replace('%', '').trim();
          const fileDiscount = Number(fileDiscountStr);

          if (isNaN(fileDiscount)) {
            errors.push({
              rowNumber: rowNum,
              sku,
              validationType: 'Price',
              expected: 'Discount as numeric value',
              actual: `Discount = '${prod.Discount}'`,
              errorMessage: 'Discount column value is not a valid number.'
            });
          } else {
            const diff = Math.abs(calculatedDiscount - fileDiscount);
            if (diff > 0.1) {
              errors.push({
                rowNumber: rowNum,
                sku,
                validationType: 'Price',
                expected: `Calculated discount: ${calculatedDiscount.toFixed(2)}%`,
                actual: `Discount in sheet: ${fileDiscount.toFixed(2)}%`,
                errorMessage: `Discount calculation mismatch. Expected: ${calculatedDiscount.toFixed(2)}% based on MRP and Selling Price.`
              });
            }
          }
        }
      }

      // Dimensions checks
      const dimensions = ['Length', 'Width', 'Height', 'Weight'];
      dimensions.forEach(dim => {
        const dimVal = prod[dim];
        if (dimVal !== undefined && dimVal !== null && String(dimVal).trim() !== '') {
          const num = Number(dimVal);
          if (isNaN(num) || num <= 0) {
            errors.push({
              rowNumber: rowNum,
              sku,
              validationType: 'Dimension',
              expected: `${dim} > 0`,
              actual: `${dim} = ${dimVal}`,
              errorMessage: `${dim} must be a positive number greater than 0.`
            });
          }
        }
      });

      // SEO checks
      const metaTitle = prod['Meta Title'] ? String(prod['Meta Title']).trim() : '';
      const metaDesc = prod['Meta Description'] ? String(prod['Meta Description']).trim() : '';
      const slug = prod['URL Slug'] ? String(prod['URL Slug']).trim() : '';

      if (metaTitle) {
        if (metaTitle.length < 50 || metaTitle.length > 60) {
          errors.push({
            rowNumber: rowNum,
            sku,
            validationType: 'SEO',
            expected: 'Meta Title length between 50 and 60 characters',
            actual: `Length = ${metaTitle.length} characters ("${metaTitle}")`,
            errorMessage: 'Meta Title length is out of the recommended SEO range (50-60 chars).'
          });
        }
      }
      if (metaDesc) {
        if (metaDesc.length < 150 || metaDesc.length > 160) {
          errors.push({
            rowNumber: rowNum,
            sku,
            validationType: 'SEO',
            expected: 'Meta Description length between 150 and 160 characters',
            actual: `Length = ${metaDesc.length} characters`,
            errorMessage: 'Meta Description length is out of the recommended SEO range (150-160 chars).'
          });
        }
      }
      if (slug) {
        const hasUppercase = /[A-Z]/.test(slug);
        const hasSpaces = /\s/.test(slug);
        if (hasUppercase || hasSpaces) {
          errors.push({
            rowNumber: rowNum,
            sku,
            validationType: 'SEO',
            expected: 'URL Slug in lowercase with no spaces',
            actual: `Slug = '${slug}'`,
            errorMessage: 'URL Slug must contain only lowercase letters and no spaces (use hyphens).'
          });
        }
      }

      // Image checking
      const imageUrl = prod['Image URL'] ? String(prod['Image URL']).trim() : '';
      if (imageUrl) {
        let isValidFormat = false;
        try {
          const urlObj = new URL(imageUrl);
          isValidFormat = urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch (_) {
          isValidFormat = false;
        }

        if (!isValidFormat) {
          errors.push({
            rowNumber: rowNum,
            sku,
            validationType: 'Image',
            expected: 'Valid HTTP/HTTPS image URL format',
            actual: `URL = '${imageUrl}'`,
            errorMessage: 'Image URL is in an invalid format.'
          });
        } else {
          imageCheckPromises.push(
            this.checkImageReachability(sku, imageUrl, rowNum, errors)
          );
        }
      }
    }

    if (imageCheckPromises.length > 0) {
      Logger.info(`Checking reachability of ${imageCheckPromises.length} image URLs...`);
      await Promise.all(imageCheckPromises);
    }

    const failedRowNumbers = new Set(errors.map(e => e.rowNumber));
    const passedCount = totalRecords - failedRowNumbers.size;

    return {
      summary: {
        totalRecords,
        passed: passedCount,
        failed: failedRowNumbers.size,
        totalWarnings: warnings.length,
        totalDuplicates: duplicates.length
      },
      errors,
      warnings,
      duplicates,
      processedRows: products
    };
  }

  async checkImageReachability(sku, url, rowNum, errors) {
    try {
      const res = await axios.head(url, {
        timeout: 3000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (res.status !== 200) {
        errors.push({
          rowNumber: rowNum,
          sku,
          validationType: 'Image',
          expected: 'HTTP 200 Reachable URL',
          actual: `HTTP ${res.status}`,
          errorMessage: `Image URL returned status code ${res.status}.`
        });
      }
    } catch (headErr) {
      try {
        const res = await axios.get(url, {
          timeout: 3000,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        if (res.status !== 200) {
          errors.push({
            rowNumber: rowNum,
            sku,
            validationType: 'Image',
            expected: 'HTTP 200 Reachable URL',
            actual: `HTTP ${res.status}`,
            errorMessage: `Image URL returned status code ${res.status} on GET fallback.`
          });
        }
      } catch (getErr) {
        errors.push({
          rowNumber: rowNum,
          sku,
          validationType: 'Image',
          expected: 'HTTP 200 Reachable URL',
          actual: `Network Error: ${getErr.message || getErr}`,
          errorMessage: `Image URL is unreachable. Network/DNS Error.`
        });
      }
    }
  }
}

// ==========================================
// 4. Reporter Implementation
// ==========================================
const Reporter = {
  generateExcelReport: async (result, outputPath) => {
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

    const summaryHeaderRow = summarySheet.getRow(1);
    summaryHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    summaryHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E78' }
    };

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

    summarySheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.font = { size: 11 };
      row.getCell('metric').font = { bold: true };
      row.getCell('value').alignment = { horizontal: 'right' };

      const metricVal = row.getCell('metric').value;
      if (metricVal === 'Passed Records') {
        row.getCell('value').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
        row.getCell('value').font = { bold: true, color: { argb: 'FF375623' } };
      } else if (metricVal === 'Failed Records' && result.summary.failed > 0) {
        row.getCell('value').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
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
      fgColor: { argb: 'FFC00000' }
    };

    result.errors.forEach(err => {
      failedSheet.addRow(err);
    });

    failedSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.font = { size: 10 };
      row.getCell('rowNumber').alignment = { horizontal: 'center' };
      row.getCell('sku').font = { bold: true };
      row.eachCell((cell) => {
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E5E5' } } };
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
      fgColor: { argb: 'FF7030A0' }
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
      fgColor: { argb: 'FFE3A21A' }
    };

    result.warnings.forEach(warn => {
      warnSheet.addRow(warn);
    });

    warnSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.font = { size: 10 };
      row.getCell('rowNumber').alignment = { horizontal: 'center' };
    });

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await wb.xlsx.writeFile(outputPath);
    Logger.success(`Excel verification report generated: ${outputPath}`);
  },

  generateHtmlReport: (result, outputPath) => {
    const timestamp = new Date().toLocaleString();
    const passRate = result.summary.totalRecords > 0
      ? ((result.summary.passed / result.summary.totalRecords) * 100).toFixed(1)
      : '100';

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
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body {
      background-color: var(--bg-primary);
      background-image:
        radial-gradient(at 10% 20%, rgba(0, 242, 254, 0.05) 0px, transparent 50%),
        radial-gradient(at 90% 80%, rgba(176, 38, 255, 0.05) 0px, transparent 50%);
      color: var(--text-main); min-height: 100vh; padding: 2rem; overflow-x: hidden;
    }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1.5rem; }
    .logo-area { display: flex; align-items: center; gap: 12px; }
    .logo-icon { width: 42px; height: 42px; background: linear-gradient(135deg, var(--neon-blue), var(--neon-purple)); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.3rem; color: #000; box-shadow: 0 0 20px rgba(0, 242, 254, 0.3); }
    .logo-title h1 { font-size: 1.5rem; font-weight: 700; background: linear-gradient(90deg, #fff, var(--text-muted)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .logo-title p { font-size: 0.8rem; color: var(--text-muted); }
    .meta-time { text-align: right; }
    .meta-time .time { font-size: 0.95rem; color: var(--neon-blue); font-weight: 600; }
    .meta-time .label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }
    .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2.5rem; }
    .card { background: var(--bg-secondary); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid var(--border-color); border-radius: 16px; padding: 1.5rem; position: relative; overflow: hidden; transition: transform 0.3s ease, border-color 0.3s ease; }
    .card:hover { transform: translateY(-4px); }
    .card::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; }
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
    .card-label { font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.5rem; }
    .card-value { font-size: 2.2rem; font-weight: 800; display: flex; align-items: baseline; gap: 5px; }
    .card-subtext { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem; }
    .content-wrapper { background: var(--bg-secondary); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid var(--border-color); border-radius: 20px; padding: 2rem; }
    .tabs-controls { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1.5rem; }
    .tabs { display: flex; background: rgba(0, 0, 0, 0.3); padding: 4px; border-radius: 10px; border: 1px solid var(--border-color); }
    .tab-btn { background: transparent; border: none; color: var(--text-muted); padding: 0.6rem 1.2rem; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; gap: 8px; }
    .tab-btn.active { background: linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(176, 38, 255, 0.2)); color: #fff; box-shadow: inset 0 0 10px rgba(0, 242, 254, 0.1); border: 1px solid rgba(0, 242, 254, 0.3); }
    .badge { font-size: 0.75rem; padding: 2px 6px; border-radius: 6px; font-weight: 700; }
    .badge-error { background: var(--neon-red); color: #fff; }
    .badge-warn { background: var(--neon-yellow); color: #000; }
    .badge-dup { background: var(--neon-purple); color: #fff; }
    .search-filter { display: flex; gap: 10px; flex-grow: 1; max-width: 500px; }
    .search-input { background: rgba(0, 0, 0, 0.4); border: 1px solid var(--border-color); padding: 0.7rem 1rem; border-radius: 10px; color: #fff; font-size: 0.9rem; width: 100%; outline: none; transition: border-color 0.2s; }
    .search-input:focus { border-color: var(--neon-blue); box-shadow: 0 0 10px rgba(0, 242, 254, 0.2); }
    .filter-select { background: rgba(0, 0, 0, 0.4); border: 1px solid var(--border-color); padding: 0.7rem 1rem; border-radius: 10px; color: #fff; font-size: 0.9rem; outline: none; cursor: pointer; }
    .filter-select:focus { border-color: var(--neon-blue); }
    .table-container { overflow-x: auto; border-radius: 12px; border: 1px solid var(--border-color); background: rgba(0, 0, 0, 0.2); }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { background: rgba(0, 0, 0, 0.4); color: var(--text-muted); padding: 1rem; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border-color); }
    td { padding: 1rem; font-size: 0.9rem; border-bottom: 1px solid var(--border-color); vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255, 255, 255, 0.02); }
    .row-num { font-weight: 700; color: var(--neon-blue); text-align: center; }
    .sku-cell { font-weight: 700; }
    .type-badge { display: inline-block; padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
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
    .code-val { font-family: monospace; background: rgba(0, 0, 0, 0.3); padding: 2px 6px; border-radius: 4px; font-size: 0.85rem; border: 1px solid rgba(255, 255, 255, 0.05); word-break: break-all; }
    .error-msg { color: rgba(255, 255, 255, 0.95); font-weight: 500; }
    .empty-state { padding: 3rem; text-align: center; color: var(--text-muted); font-size: 1rem; }
    .empty-state-icon { font-size: 3rem; margin-bottom: 1rem; display: block; }
    .text-green { color: var(--neon-green) !important; }
    .text-red { color: var(--neon-red) !important; }
    .text-blue { color: var(--neon-blue) !important; }
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
        <input type="text" id="searchInput" class="search-input" placeholder="Search SKU, message..." oninput="applyFilters()">
        <select id="typeFilter" class="filter-select" onchange="applyFilters()">
          <option value="ALL">All Types</option>
        </select>
      </div>
    </div>

    <div class="table-container">
      <table id="dataTable">
        <thead><tr id="tableHeaders"></tr></thead>
        <tbody id="tableBody"></tbody>
      </table>
      <div id="emptyState" class="empty-state" style="display: none;">
        <span class="empty-state-icon">🎉</span>
        <p>No records match the selected filters!</p>
      </div>
    </div>
  </div>

  <script>
    const errors = ${JSON.stringify(result.errors)};
    const warnings = ${JSON.stringify(result.warnings)};
    const duplicates = ${JSON.stringify(result.duplicates)};
    let currentTab = 'errors';

    function switchTab(tabName) {
      currentTab = tabName;
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      const activeBtnIndex = tabName === 'errors' ? 0 : tabName === 'warnings' ? 1 : 2;
      document.querySelectorAll('.tab-btn')[activeBtnIndex].classList.add('active');

      const filterSelect = document.getElementById('typeFilter');
      filterSelect.innerHTML = '<option value="ALL">All Types</option>';
      const types = new Set();
      if (tabName === 'errors') errors.forEach(e => types.add(e.validationType));
      else if (tabName === 'warnings') warnings.forEach(w => types.add(w.warningType));
      else if (tabName === 'duplicates') duplicates.forEach(d => types.add(d.reason));

      types.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t; opt.textContent = t;
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
        tHeaders.innerHTML = '<th>Row #</th><th>SKU</th><th>Type</th><th>Expected</th><th>Actual</th><th>Message</th>';
        const filtered = errors.filter(e => (e.sku.toLowerCase().includes(search) || e.validationType.toLowerCase().includes(search) || e.errorMessage.toLowerCase().includes(search)) && (typeFilter === 'ALL' || e.validationType === typeFilter));
        if (!filtered.length) emptyState.style.display = 'block';
        else {
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
        tHeaders.innerHTML = '<th>Row #</th><th>SKU</th><th>Type</th><th>Message</th>';
        const filtered = warnings.filter(w => (w.sku.toLowerCase().includes(search) || w.warningType.toLowerCase().includes(search) || w.message.toLowerCase().includes(search)) && (typeFilter === 'ALL' || w.warningType === typeFilter));
        if (!filtered.length) emptyState.style.display = 'block';
        else {
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
        tHeaders.innerHTML = '<th>Duplicate Item</th><th>Type</th><th>SKU</th><th>Rows</th>';
        const filtered = duplicates.filter(d => {
          const itemVal = d.reason === 'SKU' ? d.sku : d.reason === 'Product Name' ? d.productName : d.imageUrl;
          return (itemVal.toLowerCase().includes(search) || d.sku.toLowerCase().includes(search)) && (typeFilter === 'ALL' || d.reason === typeFilter);
        });
        if (!filtered.length) emptyState.style.display = 'block';
        else {
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
      return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
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
  }
};

// ==========================================
// 5. Test Block
// ==========================================
test.describe('Product Catalog Data Validation Suite (JS)', () => {
  const dataDir = path.join(process.cwd(), 'data');
  
  const hierarchyPath = path.join(dataDir, 'hierarchy.xlsx');
  const attributeMasterPath = path.join(dataDir, 'attributeMaster.xlsx');
  const mandatoryFieldsPath = path.join(dataDir, 'mandatoryFields.xlsx');

  const excelReportPath = path.join(process.cwd(), 'Validation_Report.xlsx');
  const htmlReportPath = path.join(process.cwd(), 'Validation_Report.html');

  test.beforeAll(() => {
    Logger.clearLogFile();
    Logger.info('===================================================');
    Logger.info('🚀 Initiating JavaScript Catalog Validation Spec');
    Logger.info('===================================================');
  });

  test('Validate Product Catalog File', async () => {
    const defaultProductPath = path.join(dataDir, 'products.xlsx');
    const inputFilePath = process.env.CATALOG_FILE || defaultProductPath;
    const fileExt = path.extname(inputFilePath).toLowerCase();

    Logger.info(`Target catalog file: ${inputFilePath}`);

    const fileCheck = FileParser.verifyFile(inputFilePath);
    if (!fileCheck.exists || !fileCheck.readable) {
      const errorMsg = `File validation failed: ${fileCheck.error || 'file unreadable'}`;
      Logger.error(errorMsg);
      throw new Error(errorMsg);
    }

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

    const validator = new CatalogValidator();
    Logger.info('Loading master schemas...');
    await validator.loadHierarchy(hierarchyPath);
    await validator.loadAttributeMaster(attributeMasterPath);
    await validator.loadMandatoryFields(mandatoryFieldsPath);

    Logger.info(`Parsing catalog file format: ${fileExt}`);
    let products = [];
    if (fileExt === '.xlsx') {
      products = await FileParser.parseExcel(inputFilePath);
    } else if (fileExt === '.csv') {
      products = await FileParser.parseCSV(inputFilePath);
    } else {
      throw new Error(`Unsupported file extension: ${fileExt}`);
    }

    Logger.info(`Parsed ${products.length} product rows from catalog.`);

    const validationResult = await validator.validate(products);

    Logger.info('Generating reports...');
    await Reporter.generateExcelReport(validationResult, excelReportPath);
    Reporter.generateHtmlReport(validationResult, htmlReportPath);

    const { totalRecords, passed, failed, totalWarnings, totalDuplicates } = validationResult.summary;
    const passRate = totalRecords > 0 ? ((passed / totalRecords) * 100).toFixed(1) : '100';

    Logger.info('===================================================');
    Logger.info('📊 VALIDATION PROCESS SUMMARY (JS)');
    Logger.info('===================================================');
    Logger.info(`  Total Records Scanned   : ${totalRecords}`);
    Logger.info(`  Passed Compliance check : ${passed}  (Compliance: ${passRate}%)`);
    Logger.info(`  Failed Validation       : ${failed}`);
    Logger.info(`  Duplicate Groups Found  : ${totalDuplicates}`);
    Logger.info(`  Warnings / Notices      : ${totalWarnings}`);
    Logger.info('===================================================');

    expect(fs.existsSync(excelReportPath)).toBe(true);
    expect(fs.existsSync(htmlReportPath)).toBe(true);
  });
});
