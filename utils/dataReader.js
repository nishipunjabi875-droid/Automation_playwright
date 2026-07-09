const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

class DataReader {
  static readJsonSync(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  static readCsvSync(filePath) {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : ',';
    const headers = firstLine.split(delimiter).map(h => h.trim());

    return lines.slice(1).map(line => {
      const values = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const rowObj = {};
      headers.forEach((header, idx) => {
        let val = values[idx] || '';
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        }
        rowObj[header] = val;
      });
      return rowObj;
    });
  }

  static readExcelSync(filePath, sheetIndex = 0) {
    if (!fs.existsSync(filePath)) return [];
    const workbook = XLSX.readFileSync(filePath);
    const sheetName = workbook.SheetNames[sheetIndex];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);
  }

  static loadProductsSync(sourcePath) {
    const absPath = path.isAbsolute(sourcePath) ? sourcePath : path.resolve(process.cwd(), sourcePath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`Product data source not found: ${sourcePath}`);
    }
    const ext = path.extname(absPath).toLowerCase();
    
    if (ext === '.json') {
      const data = this.readJsonSync(absPath);
      return data.map(item => ({
        productId: item.productId || item.id || '',
        name: item.name || item.ProductName || '',
        path: item.path || item.ProductURL || '',
        expectedVideo: item.expectedVideo || item.ExpectedVideo || ''
      }));
    } else if (ext === '.csv') {
      const rawRows = this.readCsvSync(absPath);
      return rawRows.map(row => {
        const name = row['Product Name'] || row['ProductName'] || '';
        const url = row['Product URL'] || row['ProductURL'] || '';
        const id = row['Product ID'] || row['ProductID'] || row['id'] || '';
        
        let expectedVideo = row['ExpectedVideo'] || row['Expected Video'] || '';
        if (!expectedVideo) {
          const videoUrlCol = row['Video URL'] || row['VideoURL'] || '';
          if (videoUrlCol) {
            const parts = videoUrlCol.split('/');
            expectedVideo = parts[parts.length - 1].split('.')[0];
          }
        }
        
        let relativePath = url;
        try {
          if (url.startsWith('http')) {
            relativePath = new URL(url).pathname;
          }
        } catch (e) {}

        return {
          productId: id,
          name,
          path: relativePath,
          expectedVideo
        };
      });
    } else if (ext === '.xlsx' || ext === '.xls') {
      const rawRows = this.readExcelSync(absPath);
      return rawRows.map(row => {
        const name = row['Product Name'] || row['ProductName'] || '';
        const url = row['Product URL'] || row['ProductURL'] || '';
        const id = row['Product ID'] || row['ProductID'] || row['id'] || '';
        const expectedVideo = row['ExpectedVideo'] || row['Expected Video'] || '';
        
        let relativePath = url;
        try {
          if (url.startsWith('http')) {
            relativePath = new URL(url).pathname;
          }
        } catch (e) {}

        return {
          productId: id,
          name,
          path: relativePath,
          expectedVideo
        };
      });
    }
    throw new Error(`Unsupported product data file format: ${ext}`);
  }

  static loadPagesSync(sourcePath) {
    const absPath = path.isAbsolute(sourcePath) ? sourcePath : path.resolve(process.cwd(), sourcePath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`Page data source not found: ${sourcePath}`);
    }
    const ext = path.extname(absPath).toLowerCase();
    
    if (ext === '.json') {
      return this.readJsonSync(absPath);
    } else if (ext === '.csv') {
      const rawRows = this.readCsvSync(absPath);
      return rawRows.map(row => ({
        name: row['Name'] || row['name'] || '',
        path: row['Path'] || row['path'] || '',
        type: row['Type'] || row['type'] || 'general'
      }));
    } else if (ext === '.xlsx' || ext === '.xls') {
      const rawRows = this.readExcelSync(absPath);
      return rawRows.map(row => ({
        name: row['Name'] || row['name'] || '',
        path: row['Path'] || row['path'] || '',
        type: row['Type'] || row['type'] || 'general'
      }));
    }
    throw new Error(`Unsupported page data file format: ${ext}`);
  }
}

module.exports = DataReader;
