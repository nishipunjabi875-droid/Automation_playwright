const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { ensureDir } = require('./utils');

/**
 * Exporter class for exporting Freshworks messaging data into Excel, CSV, and JSON formats
 */
class DataExporter {
  constructor(outputDir = './output') {
    this.outputDir = outputDir;
    ensureDir(this.outputDir);
  }

  /**
   * Sanitizes text content for CSV/Excel export
   * @param {any} val - Value to sanitize
   * @returns {string} Clean string
   */
  sanitizeText(val) {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val).replace(/\r?\n|\r/g, ' ').trim();
  }

  /**
   * Exports message records to JSON format
   * @param {Array<Object>} records - Array of message objects
   * @param {string} fileName - Base filename
   * @returns {string} File path
   */
  async exportJson(records, fileName = 'conversations_export.json') {
    const filePath = path.join(this.outputDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf8');
    console.log(`📁 JSON export saved to: ${filePath}`);
    return filePath;
  }

  /**
   * Exports summary statistics to JSON format
   * @param {Object} stats - Summary metrics
   * @param {string} fileName - Base filename
   * @returns {string} File path
   */
  async exportSummary(stats, fileName = 'summary_statistics.json') {
    const filePath = path.join(this.outputDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(stats, null, 2), 'utf8');
    console.log(`📊 Summary statistics saved to: ${filePath}`);
    return filePath;
  }

  /**
   * Exports message records to CSV format
   * @param {Array<Object>} records - Array of message objects
   * @param {string} fileName - Base filename
   * @returns {string} File path
   */
  async exportCsv(records, fileName = 'conversations_export.csv') {
    const filePath = path.join(this.outputDir, fileName);

    const headers = [
      'Conversation ID',
      'Channel',
      'Customer Name',
      'Customer ID',
      'Customer Phone',
      'Customer Email',
      'Agent Name',
      'Agent ID',
      'Message ID',
      'Sender Type',
      'Message Text',
      'Message Type',
      'Timestamp',
      'Attachments',
      'Media URLs',
      'Conversation Status',
      'Tags',
      'Custom Properties'
    ];

    const csvRows = [headers.join(',')];

    for (const rec of records) {
      const row = [
        this.escapeCsvCell(rec.conversationId),
        this.escapeCsvCell(rec.channel),
        this.escapeCsvCell(rec.customerName),
        this.escapeCsvCell(rec.customerId),
        this.escapeCsvCell(rec.customerPhone),
        this.escapeCsvCell(rec.customerEmail),
        this.escapeCsvCell(rec.agentName),
        this.escapeCsvCell(rec.agentId),
        this.escapeCsvCell(rec.messageId),
        this.escapeCsvCell(rec.senderType),
        this.escapeCsvCell(rec.messageText),
        this.escapeCsvCell(rec.messageType),
        this.escapeCsvCell(rec.timestamp),
        this.escapeCsvCell(Array.isArray(rec.attachments) ? rec.attachments.join(' | ') : rec.attachments),
        this.escapeCsvCell(Array.isArray(rec.mediaUrls) ? rec.mediaUrls.join(' | ') : rec.mediaUrls),
        this.escapeCsvCell(rec.conversationStatus),
        this.escapeCsvCell(Array.isArray(rec.tags) ? rec.tags.join(' | ') : rec.tags),
        this.escapeCsvCell(typeof rec.customProperties === 'object' ? JSON.stringify(rec.customProperties) : rec.customProperties)
      ];
      csvRows.push(row.join(','));
    }

    fs.writeFileSync(filePath, csvRows.join('\n'), 'utf8');
    console.log(`📄 CSV export saved to: ${filePath}`);
    return filePath;
  }

  /**
   * Helper to format cell values cleanly for CSV format
   * @param {any} cell
   * @returns {string} Escaped CSV cell string
   */
  escapeCsvCell(cell) {
    const cleanStr = this.sanitizeText(cell);
    return `"${cleanStr.replace(/"/g, '""')}"`;
  }

  /**
   * Exports message records to formatted Excel (.xlsx) workbook using ExcelJS
   * Includes formatted header styling, column widths, and summary sheet
   * @param {Array<Object>} records - Flattened message records
   * @param {Object} summaryStats - Summary statistics object
   * @param {string} fileName - Base filename
   * @returns {Promise<string>} Saved file path
   */
  async exportExcel(records, summaryStats, fileName = 'conversations_export.xlsx') {
    const filePath = path.join(this.outputDir, fileName);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Freshworks Omni Exporter';
    workbook.created = new Date();

    // -------------------------------------------------------------
    // Sheet 1: Messages Data
    // -------------------------------------------------------------
    const dataSheet = workbook.addWorksheet('Conversations & Messages');

    dataSheet.columns = [
      { header: 'Conversation ID', key: 'conversationId', width: 22 },
      { header: 'Channel', key: 'channel', width: 18 },
      { header: 'Customer Name', key: 'customerName', width: 22 },
      { header: 'Customer ID', key: 'customerId', width: 22 },
      { header: 'Customer Phone', key: 'customerPhone', width: 18 },
      { header: 'Customer Email', key: 'customerEmail', width: 24 },
      { header: 'Agent Name', key: 'agentName', width: 20 },
      { header: 'Agent ID', key: 'agentId', width: 20 },
      { header: 'Message ID', key: 'messageId', width: 24 },
      { header: 'Sender Type', key: 'senderType', width: 15 },
      { header: 'Message Text', key: 'messageText', width: 45 },
      { header: 'Message Type', key: 'messageType', width: 15 },
      { header: 'Timestamp', key: 'timestamp', width: 22 },
      { header: 'Attachments', key: 'attachments', width: 30 },
      { header: 'Media URLs', key: 'mediaUrls', width: 30 },
      { header: 'Conversation Status', key: 'conversationStatus', width: 20 },
      { header: 'Tags', key: 'tags', width: 20 },
      { header: 'Custom Properties', key: 'customProperties', width: 30 }
    ];

    // Header styling
    const headerRow = dataSheet.getRow(1);
    headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1F4E78' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Add Data Rows
    for (const rec of records) {
      dataSheet.addRow({
        conversationId: rec.conversationId || '',
        channel: rec.channel || '',
        customerName: rec.customerName || '',
        customerId: rec.customerId || '',
        customerPhone: rec.customerPhone || '',
        customerEmail: rec.customerEmail || '',
        agentName: rec.agentName || '',
        agentId: rec.agentId || '',
        messageId: rec.messageId || '',
        senderType: rec.senderType || '',
        messageText: rec.messageText || '',
        messageType: rec.messageType || '',
        timestamp: rec.timestamp || '',
        attachments: Array.isArray(rec.attachments) ? rec.attachments.join(' | ') : String(rec.attachments || ''),
        mediaUrls: Array.isArray(rec.mediaUrls) ? rec.mediaUrls.join(' | ') : String(rec.mediaUrls || ''),
        conversationStatus: rec.conversationStatus || '',
        tags: Array.isArray(rec.tags) ? rec.tags.join(' | ') : String(rec.tags || ''),
        customProperties: typeof rec.customProperties === 'object' ? JSON.stringify(rec.customProperties) : String(rec.customProperties || '')
      });
    }

    // -------------------------------------------------------------
    // Sheet 2: Summary Dashboard
    // -------------------------------------------------------------
    if (summaryStats) {
      const summarySheet = workbook.addWorksheet('Summary Statistics');

      summarySheet.columns = [
        { header: 'Metric', key: 'metric', width: 30 },
        { header: 'Value', key: 'value', width: 40 }
      ];

      const sumHeader = summarySheet.getRow(1);
      sumHeader.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
      sumHeader.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '2F5597' }
      };

      summarySheet.addRow({ metric: 'Total Conversations Extracted', value: summaryStats.totalConversations });
      summarySheet.addRow({ metric: 'Total Messages Extracted', value: summaryStats.totalMessages });
      summarySheet.addRow({ metric: '', value: '' });

      summarySheet.addRow({ metric: '--- MESSAGES BY CHANNEL ---', value: '' });
      for (const [ch, cnt] of Object.entries(summaryStats.messagesByChannel || {})) {
        summarySheet.addRow({ metric: `Channel: ${ch}`, value: cnt });
      }
      summarySheet.addRow({ metric: '', value: '' });

      summarySheet.addRow({ metric: '--- TOP ACTIVE AGENTS ---', value: '' });
      for (const [ag, cnt] of Object.entries(summaryStats.topActiveAgents || {})) {
        summarySheet.addRow({ metric: ag, value: `${cnt} messages` });
      }
      summarySheet.addRow({ metric: '', value: '' });

      summarySheet.addRow({ metric: '--- TOP ACTIVE CUSTOMERS ---', value: '' });
      for (const [cust, cnt] of Object.entries(summaryStats.topActiveCustomers || {})) {
        summarySheet.addRow({ metric: cust, value: `${cnt} messages` });
      }
    }

    await workbook.xlsx.writeFile(filePath);
    console.log(`📊 Excel workbook saved to: ${filePath}`);
    return filePath;
  }
}

module.exports = DataExporter;
