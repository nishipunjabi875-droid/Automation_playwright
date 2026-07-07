const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

class CSVReporter {
    constructor() {
        this.results = [];
        this.resultsFile = path.join(__dirname, 'search_results_nishi.xlsx');
    }

    onBegin(config, suite) {
        const csvFile = this.resultsFile.replace('.xlsx', '.csv');
        if (fs.existsSync(this.resultsFile)) fs.unlinkSync(this.resultsFile);
        if (fs.existsSync(csvFile)) fs.unlinkSync(csvFile);
        console.log('🧹 Cleaned up old report files.');
    }

    onTestEnd(test, result) {
        let entry = null;

        const annotation = test.annotations.find(a => a.type === 'custom-result');
        if (annotation) {
            try {
                entry = JSON.parse(annotation.description);
            } catch (e) {
                console.error('Failed to parse annotation', e);
            }
        }

        if (!entry) {
            const titleMatch = test.title.match(/\[(\d+)\/\d+\] Testing Query: "(.*)"/);
            if (titleMatch) {
                entry = {
                    index: parseInt(titleMatch[1], 10),
                    query: titleMatch[2],
                    status: result.status === 'timedOut' ? 'TIMEOUT' : 'FAILED',
                    pageType: 'N/A',
                    url: 'N/A',
                    elapsed: result.duration,
                    notes: result.error ? result.error.message.split('\n')[0] : 'Test failed before completion'
                };
            }
        }

        if (entry) {
            this.results.push(entry);
            
            // --- REAL-TIME SAVING ---
            const csvFile = path.join(process.cwd(), 'search_results_nishi.csv');
            const isNew = !fs.existsSync(csvFile);
            
            const csvHeaders = ['#', 'Query', 'Status', 'Page Type', 'Final URL', 'Elapsed (ms)', 'Notes'];
            const row = [
                entry.index,
                `"${entry.query.replace(/"/g, '""')}"`,
                entry.status,
                entry.pageType,
                entry.url,
                entry.elapsed,
                `"${(entry.notes || '').replace(/"/g, '""')}"`
            ];

            if (isNew) {
                fs.writeFileSync(csvFile, csvHeaders.join(',') + '\n', 'utf8');
                console.log(`🚀 Created new results file: ${csvFile}`);
            }
            fs.appendFileSync(csvFile, row.join(',') + '\n', 'utf8');
            console.log(`💾 Stored result [${entry.index}] for: ${entry.query}`);

            // --- PROGRESSIVE EXCEL SAVING ---
            // Save Excel every 100 results so user can see progress
            if (this.results.length % 100 === 0) {
                this.saveExcel();
            }
        }
    }

    async saveExcel() {
        if (this.results.length === 0) return;
        
        // Sort results numerically by index
        const sortedResults = [...this.results].sort((a, b) => (a.index || 0) - (b.index || 0));

        const wb = new ExcelJS.Workbook();
        wb.creator = 'Playwright Search Audit';
        wb.created = new Date();

        // --- Summary Sheet ---
        const summary = wb.addWorksheet('Summary');
        summary.columns = [
            { header: 'Metric', key: 'metric', width: 28 },
            { header: 'Count', key: 'count', width: 14 },
        ];
        
        const total = sortedResults.length;
        const pass = sortedResults.filter(r => r.status === 'PASS').length;
        const zero = sortedResults.filter(r => r.status === 'ZERO_RESULTS').length;
        const unexpected = sortedResults.filter(r => r.status === 'UNEXPECTED_PAGE').length;
        const avgElapsed = Math.round(sortedResults.reduce((a, r) => a + (r.elapsed || 0), 0) / total);

        summary.addRows([
            ['Total Queries Processed', total],
            ['✅ Pass', pass],
            ['⚠️ Zero Results', zero],
            ['🔀 Unexpected Page', unexpected],
            ['Pass Rate', total > 0 ? (pass / total) : 0],
            ['Avg Response Time (ms)', avgElapsed],
        ]);
        
        summary.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        summary.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
        summary.getCell('B6').numFmt = '0.0%';

        // --- Results Sheet ---
        const ws = wb.addWorksheet('Results');
        ws.columns = [
            { header: '#', key: 'index', width: 7 },
            { header: 'Query', key: 'query', width: 30 },
            { header: 'Status', key: 'status', width: 18 },
            { header: 'Page Type', key: 'pageType', width: 14 },
            { header: 'Final URL', key: 'url', width: 60 },
            { header: 'Elapsed (ms)', key: 'elapsed', width: 14 },
            { header: 'Notes', key: 'notes', width: 50 },
        ];

        ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };

        const statusColors = {
            PASS: 'FFE2EFDA',
            ZERO_RESULTS: 'FFFFF2CC',
            UNEXPECTED_PAGE: 'FFDDEBF7',
            ERROR: 'FFFFC7CE',
            TIMEOUT: 'FFFCE4D6',
            FAILED: 'FFFFC7CE',
        };

        sortedResults.forEach((r) => {
            const row = ws.addRow(r);
            const fill = statusColors[r.status] || 'FFFFFFFF';
            row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
            if (r.url && r.url !== 'N/A') {
                const cell = row.getCell('url');
                cell.value = { text: r.url, hyperlink: r.url };
                cell.font = { color: { argb: 'FF0563C1' }, underline: true };
            }
        });

        ws.views = [{ state: 'frozen', ySplit: 1 }];
        
        try {
            await wb.xlsx.writeFile(this.resultsFile);
        } catch (e) {
            console.error(`❌ Error writing Excel (probably file is open): ${e.message}`);
        }
    }

    async onEnd(result) {
        await this.saveExcel();
        console.log(`\n✅ Final Excel report saved to: ${this.resultsFile}`);
        
        // Final sorted CSV write
        const csvFile = this.resultsFile.replace('.xlsx', '.csv');
        const sortedResults = [...this.results].sort((a, b) => (a.index || 0) - (b.index || 0));
        const csvHeaders = ['#', 'Query', 'Status', 'Page Type', 'Final URL', 'Elapsed (ms)', 'Notes'];
        const csvRows = sortedResults.map(r => [
            r.index,
            `"${r.query.replace(/"/g, '""')}"`,
            r.status,
            r.pageType,
            r.url,
            r.elapsed,
            `"${(r.notes || '').replace(/"/g, '""')}"`
        ]);
        fs.writeFileSync(csvFile, [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n'), 'utf8');
        console.log(`✅ Final sorted CSV saved to: ${csvFile}`);
    }
}

module.exports = CSVReporter;
