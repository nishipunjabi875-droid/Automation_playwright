const fs = require('fs');
const csv = require('csv-parser');

/**
 * Reads product data from a CSV file.
 * @param {string} filePath - Absolute path to the CSV file.
 * @returns {Promise<Array<{ProductName: string, ProductURL: string, VideoSelector: string}>>}
 */
function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    if (!fs.existsSync(filePath)) {
      return reject(new Error(`CSV file not found at path: ${filePath}`));
    }
    
    // Read the first line to detect separator (tab vs comma)
    const firstLine = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/)[0];
    const separator = firstLine.includes('\t') ? '\t' : ',';
    
    fs.createReadStream(filePath)
      .pipe(csv({ separator }))
      .on('data', (data) => {
        // Clean up keys and values (trim whitespace)
        const cleanedData = {};
        for (const key of Object.keys(data)) {
          cleanedData[key.trim()] = data[key] ? data[key].trim() : '';
        }
        results.push(cleanedData);
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

module.exports = { readCSV };
