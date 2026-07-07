import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';
import csv from 'csv-parser';
import { Logger } from './logger';

export class FileParser {
  /**
   * Verifies if a file exists and is readable
   */
  public static verifyFile(filePath: string): { exists: boolean; readable: boolean; error?: string } {
    try {
      if (!fs.existsSync(filePath)) {
        return { exists: false, readable: false, error: 'File does not exist' };
      }
      fs.accessSync(filePath, fs.constants.R_OK);
      return { exists: true, readable: true };
    } catch (err: any) {
      return { exists: true, readable: false, error: err.message || 'File is not readable' };
    }
  }

  /**
   * Parses an Excel (.xlsx) file and returns its rows as objects
   */
  public static async parseExcel(filePath: string, sheetNameOrIndex?: string | number): Promise<any[]> {
    const verification = this.verifyFile(filePath);
    if (!verification.exists || !verification.readable) {
      throw new Error(`Excel parse failed: ${verification.error || 'file unreadable'} at ${filePath}`);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    let worksheet: ExcelJS.Worksheet | undefined;
    if (sheetNameOrIndex !== undefined) {
      if (typeof sheetNameOrIndex === 'string') {
        worksheet = workbook.getWorksheet(sheetNameOrIndex);
      } else {
        worksheet = workbook.worksheets[sheetNameOrIndex];
      }
    } else {
      worksheet = workbook.worksheets[0];
    }

    if (!worksheet) {
      throw new Error(`Sheet ${sheetNameOrIndex !== undefined ? sheetNameOrIndex : 0} not found in Excel file: ${filePath}`);
    }

    const rows: any[] = [];
    const headers: string[] = [];

    // Identify header row (row 1) and read data rows
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell({ includeEmpty: true }, (cell) => {
          headers.push(String(cell.value || '').trim());
        });
      } else {
        const rowData: any = {};
        // Iterate through all columns up to the header count to maintain position consistency
        for (let i = 1; i <= headers.length; i++) {
          const header = headers[i - 1];
          if (!header) continue;
          
          const cell = row.getCell(i);
          let val = cell.value;
          
          // Unwrap rich text, hyperlinks, or formula results
          if (val && typeof val === 'object') {
            if ('text' in val && 'hyperlink' in val) {
              val = (val as any).text;
            } else if ('result' in val) {
              val = (val as any).result; // Output of formula
            } else if ('richText' in val) {
              val = (val as any).richText.map((rt: any) => rt.text || '').join('');
            }
          }
          
          // Normalize values
          if (val === null || val === undefined) {
            rowData[header] = '';
          } else {
            rowData[header] = val;
          }
        }
        rows.push(rowData);
      }
    });

    return rows;
  }

  /**
   * Parses a CSV (.csv) file and returns its rows as objects
   */
  public static parseCSV(filePath: string): Promise<any[]> {
    const verification = this.verifyFile(filePath);
    if (!verification.exists || !verification.readable) {
      return Promise.reject(new Error(`CSV parse failed: ${verification.error || 'file unreadable'} at ${filePath}`));
    }

    return new Promise((resolve, reject) => {
      const results: any[] = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          // Trim whitespace from keys and values
          const cleanData: any = {};
          for (const key of Object.keys(data)) {
            const cleanKey = key.trim();
            const val = data[key];
            cleanData[cleanKey] = typeof val === 'string' ? val.trim() : val;
          }
          results.push(cleanData);
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (err) => {
          Logger.error(`Error streaming CSV file: ${filePath}`, err);
          reject(err);
        });
    });
  }

  /**
   * Helper to verify if specified sheets exist in an Excel file
   */
  public static async getExcelSheets(filePath: string): Promise<string[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    return workbook.worksheets.map(w => w.name);
  }
}
