export interface ProductRow {
  [key: string]: any;
  SKU: string;
  'Product Name': string;
  Category: string;
  'Sub Category': string;
  Material: string;
  Color: string;
  MRP: number | string;
  'Selling Price': number | string;
  Brand: string;
  'Image URL': string;
  Seater?: string;
  'Storage Type'?: string;
  Size?: string;
  Length?: number | string;
  Width?: number | string;
  Height?: number | string;
  Weight?: number | string;
  'Meta Title'?: string;
  'Meta Description'?: string;
  'URL Slug'?: string;
  Discount?: number | string;
}

export interface ValidationError {
  rowNumber: number;
  sku: string;
  validationType: string; // e.g. "Hierarchy", "Attribute", "Material", "Price", "Image", "SEO", "Consistency", "Dimension", "Missing Data", "File"
  expected: string;
  actual: string;
  errorMessage: string;
}

export interface ValidationWarning {
  rowNumber: number;
  sku: string;
  warningType: string;
  message: string;
}

export interface DuplicateRecord {
  sku: string;
  productName: string;
  imageUrl: string;
  rows: number[]; // Row numbers where duplicate was found
  reason: 'SKU' | 'Product Name' | 'Image URL';
}

export interface ValidationSummary {
  totalRecords: number;
  passed: number;
  failed: number;
  totalWarnings: number;
  totalDuplicates: number;
}

export interface ValidationResult {
  summary: ValidationSummary;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  duplicates: DuplicateRecord[];
  processedRows: ProductRow[];
}

export interface HierarchyRule {
  category: string;
  subCategory: string;
}

export interface AttributeRule {
  category: string;
  attributeName: string;
  allowedValues: string[];
}

export interface MandatoryFieldRule {
  fieldName: string;
  isMandatory: boolean;
  category: string; // 'Global' or specific category
}
