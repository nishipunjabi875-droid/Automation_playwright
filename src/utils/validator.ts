import axios from 'axios';
import {
  ProductRow,
  ValidationError,
  ValidationWarning,
  DuplicateRecord,
  HierarchyRule,
  AttributeRule,
  MandatoryFieldRule,
  ValidationResult
} from '../types';
import { Logger } from './logger';
import { FileParser } from './fileParser';

export class CatalogValidator {
  private hierarchyRules: HierarchyRule[] = [];
  private attributeRules: AttributeRule[] = [];
  private mandatoryRules: MandatoryFieldRule[] = [];
  private requiredColumns = [
    'SKU', 'Product Name', 'Category', 'Sub Category', 
    'Material', 'Color', 'MRP', 'Selling Price', 'Brand', 'Image URL'
  ];

  /**
   * Load Master Hierarchy Configuration
   */
  public async loadHierarchy(filePath: string): Promise<void> {
    try {
      const rows = await FileParser.parseExcel(filePath);
      this.hierarchyRules = rows.map(r => ({
        category: String(r.Category || '').trim(),
        subCategory: String(r['Sub Category'] || '').trim()
      }));
      Logger.info(`Loaded ${this.hierarchyRules.length} hierarchy rules.`);
    } catch (err) {
      Logger.error(`Failed to load hierarchy from ${filePath}`, err);
      throw err;
    }
  }

  /**
   * Load Attribute Mapping Master
   */
  public async loadAttributeMaster(filePath: string): Promise<void> {
    try {
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
      Logger.info(`Loaded ${this.attributeRules.length} attribute mapping rules.`);
    } catch (err) {
      Logger.error(`Failed to load attribute master from ${filePath}`, err);
      throw err;
    }
  }

  /**
   * Load Mandatory Fields Configuration
   */
  public async loadMandatoryFields(filePath: string): Promise<void> {
    try {
      const rows = await FileParser.parseExcel(filePath);
      this.mandatoryRules = rows.map(r => ({
        fieldName: String(r['Field Name'] || '').trim(),
        isMandatory: String(r['Is Mandatory'] || '').trim().toLowerCase() === 'yes',
        category: String(r.Category || '').trim()
      }));
      Logger.info(`Loaded ${this.mandatoryRules.length} mandatory field rules.`);
    } catch (err) {
      Logger.error(`Failed to load mandatory fields configuration from ${filePath}`, err);
      throw err;
    }
  }

  /**
   * Main Validation Engine
   */
  public async validate(products: ProductRow[]): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const duplicates: DuplicateRecord[] = [];

    const totalRecords = products.length;
    Logger.info(`Starting validation on ${totalRecords} records.`);

    // --- 1. Duplicate Validation (Global) ---
    const skuMap = new Map<string, number[]>();
    const nameMap = new Map<string, number[]>();
    const imageMap = new Map<string, number[]>();
    const slugMap = new Map<string, number[]>();

    products.forEach((prod, index) => {
      const rowNum = index + 2; // Row number in Excel (header is row 1)
      
      const sku = String(prod.SKU || '').trim();
      const name = String(prod['Product Name'] || '').trim();
      const imageUrl = String(prod['Image URL'] || '').trim();
      const slug = String(prod['URL Slug'] || '').trim();

      if (sku) {
        if (!skuMap.has(sku)) skuMap.set(sku, []);
        skuMap.get(sku)!.push(rowNum);
      }
      if (name) {
        const lowerName = name.toLowerCase();
        if (!nameMap.has(lowerName)) nameMap.set(lowerName, []);
        nameMap.get(lowerName)!.push(rowNum);
      }
      if (imageUrl) {
        if (!imageMap.has(imageUrl)) imageMap.set(imageUrl, []);
        imageMap.get(imageUrl)!.push(rowNum);
      }
      if (slug) {
        const lowerSlug = slug.toLowerCase();
        if (!slugMap.has(lowerSlug)) slugMap.set(lowerSlug, []);
        slugMap.get(lowerSlug)!.push(rowNum);
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
        // Find SKU of first row
        const firstRowIndex = rows[0] - 2;
        const sku = products[firstRowIndex] ? products[firstRowIndex].SKU : '';
        duplicates.push({ sku, productName: name, imageUrl: '', rows, reason: 'Product Name' });
        rows.forEach(r => {
          errors.push({
            rowNumber: r,
            sku: products[r - 2]?.SKU || '',
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
            sku: products[r - 2]?.SKU || '',
            validationType: 'Duplicate',
            expected: 'Unique Image URL',
            actual: `Duplicate Image URL on rows: ${rows.join(', ')}`,
            errorMessage: 'Image URL is duplicated across multiple rows.'
          });
        });
      }
    });

    // Check URL Slug uniqueness as part of SEO
    slugMap.forEach((rows, slug) => {
      if (rows.length > 1) {
        rows.forEach(r => {
          errors.push({
            rowNumber: r,
            sku: products[r - 2]?.SKU || '',
            validationType: 'SEO',
            expected: 'Unique URL Slug',
            actual: `Duplicate URL Slug '${slug}' on rows: ${rows.join(', ')}`,
            errorMessage: 'URL Slug must be unique.'
          });
        });
      }
    });

    // --- 2. Row by Row Validations ---
    const imageCheckPromises: Promise<void>[] = [];

    for (let i = 0; i < products.length; i++) {
      const prod = products[i];
      const rowNum = i + 2;
      const sku = String(prod.SKU || '').trim();
      const category = String(prod.Category || '').trim();
      const subCategory = String(prod['Sub Category'] || '').trim();

      // --- File/Header completeness check for this row ---
      // Ensure all standard required columns are present in keys
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

      // --- Missing Data & Mandatory Fields checks ---
      // Check for empty, null, undefined, NA, N/A in ALL columns
      rowKeys.forEach(col => {
        const rawVal = prod[col];
        const isString = typeof rawVal === 'string';
        const strVal = isString ? rawVal.trim() : String(rawVal || '');
        const isMissingVal = rawVal === null || rawVal === undefined || strVal === '' || 
                             ['na', 'n/a', 'null', 'undefined', 'nan'].includes(strVal.toLowerCase());
        
        // Find if this column is mandatory globally or for this specific category
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

      // Skip remaining detailed logic if category or subcategory is missing (would cause cascade failures)
      if (!category || !subCategory) {
        continue;
      }

      // --- Hierarchy Validation ---
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

      // --- Attribute & Material Validation ---
      const categoryAttributes = this.attributeRules.filter(
        r => r.category.toLowerCase() === category.toLowerCase()
      );

      categoryAttributes.forEach(attrRule => {
        const attrName = attrRule.attributeName;
        // Check if attribute is in columns
        const cellValue = prod[attrName];
        if (cellValue !== undefined && cellValue !== null && String(cellValue).trim() !== '') {
          const cleanVal = String(cellValue).trim().toLowerCase();
          
          // If allowed values are restricted
          if (attrRule.allowedValues.length > 0) {
            if (!attrRule.allowedValues.includes(cleanVal)) {
              // Determine validation type: Material or general attribute validation
              const isMaterial = attrName.toLowerCase() === 'material';
              const isSeater = attrName.toLowerCase() === 'seater';
              
              let valType = 'Attribute';
              if (isMaterial) valType = 'Material';
              else if (isSeater) valType = 'Consistency'; // Handles seater mismatch consistency check

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

      // Special Data Consistency Check: if Category = Sofa, check Seater allowed values (backup consistency check)
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

      // --- Price Validation ---
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

        // Validate Discount calculation if MRP and Selling Price are valid
        const calculatedDiscount = ((mrp - sellingPrice) / mrp) * 100;
        
        if (prod.Discount !== undefined && prod.Discount !== null && String(prod.Discount).trim() !== '') {
          // Clean discount value (remove '%', trim, convert to number)
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
            // Check delta (allow 0.1% rounding error)
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

      // --- Dimension Validation ---
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

      // --- SEO Validation ---
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

      // --- Image URL Validation (Reachability / Format) ---
      const imageUrl = prod['Image URL'] ? String(prod['Image URL']).trim() : '';
      if (imageUrl) {
        // First validate URL format
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
          // Push promise to resolve URL reachability concurrently
          imageCheckPromises.push(
            this.checkImageReachability(sku, imageUrl, rowNum, errors)
          );
        }
      }
    }

    // Wait for all image reachability HTTP checks to finish
    if (imageCheckPromises.length > 0) {
      Logger.info(`Checking reachability of ${imageCheckPromises.length} image URLs...`);
      await Promise.all(imageCheckPromises);
    }

    // --- 3. Compute Metrics & Compile Result ---
    const failedRowNumbers = new Set(errors.map(e => e.rowNumber));
    const passedCount = totalRecords - failedRowNumbers.size;

    const summary = {
      totalRecords,
      passed: passedCount,
      failed: failedRowNumbers.size,
      totalWarnings: warnings.length,
      totalDuplicates: duplicates.length
    };

    Logger.success(`Validation complete. Passed: ${passedCount}, Failed: ${failedRowNumbers.size}`);

    return {
      summary,
      errors,
      warnings,
      duplicates,
      processedRows: products
    };
  }

  /**
   * Helper to perform HTTP HEAD/GET request to check image reachability
   */
  private async checkImageReachability(
    sku: string, 
    url: string, 
    rowNum: number, 
    errors: ValidationError[]
  ): Promise<void> {
    try {
      // Try HEAD request first for efficiency
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
    } catch (headErr: any) {
      // If HEAD fails, fallback to GET (some servers block HEAD)
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
      } catch (getErr: any) {
        const errorMsg = getErr.message || String(getErr);
        errors.push({
          rowNumber: rowNum,
          sku,
          validationType: 'Image',
          expected: 'HTTP 200 Reachable URL',
          actual: `Network Error: ${errorMsg}`,
          errorMessage: `Image URL is unreachable. Network/DNS Error.`
        });
      }
    }
  }
}
