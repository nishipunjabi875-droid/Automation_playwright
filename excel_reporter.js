const ExcelJS = require('exceljs');
const path = require('path');

class ExcelReporter {
    constructor() {
        this.results = [];
        this.resultsFile = path.join(__dirname, 'search_results_match.xlsx');
    }

    onTestEnd(test, result) {
        // Extract the result object from annotations
        const annotation = test.annotations.find(a => a.type === 'custom-result');
        if (annotation) {
            try {
                this.results.push(JSON.parse(annotation.description));
            } catch (e) {
                console.error('Failed to parse annotation description', e);
            }
        }
    }

    async onEnd(result) {
        if (this.results.length === 0) {
            console.log('\nNo results found to write to Excel.');
            return;
        }

        // Sort results by index
        this.results.sort((a, b) => a.index - b.index);

        const wb = new ExcelJS.Workbook();
        wb.creator = 'Playwright Search Audit';
        wb.created = new Date();

        const summary = wb.addWorksheet('Summary');
        summary.columns = [
            { header: 'Metric', key: 'metric', width: 28 },
            { header: 'Count', key: 'count', width: 14 },
        ];
        const total = this.results.length;
        const pass = this.results.filter(r => r.status === 'PASS').length;
        const zero = this.results.filter(r => r.status === 'ZERO_RESULTS').length;
        const mismatch = this.results.filter(r => r.status === 'MISMATCH').length;
        
        summary.addRows([
            ['Total Queries', total],
            ['✅ Pass', pass],
            ['⚠️ Zero Results', zero],
            ['❌ Mismatch', mismatch],
        ]);

        const ws = wb.addWorksheet('Results');
        ws.columns = [
            { header: '#', key: 'index', width: 7 },
            { header: 'Query', key: 'query', width: 30 },
            { header: 'Status', key: 'status', width: 18 },
            { header: 'Relevance', key: 'matchStatus', width: 18 },
            { header: 'Page Type', key: 'pageType', width: 14 },
            { header: 'Final URL', key: 'url', width: 60 },
            { header: 'Elapsed (ms)', key: 'elapsed', width: 14 },
            { header: 'Analysis & Suggestions', key: 'notes', width: 80 },
        ];

        const headerRow = ws.getRow(1);
        headerRow.font = { bold: true };
        
        this.results.forEach((r) => {
            const row = ws.addRow(r);
            if (r.url) {
                const cell = row.getCell('url');
                cell.value = { text: r.url, hyperlink: r.url };
                cell.font = { color: { argb: 'FF0563C1' }, underline: true };
            }
        });

        await wb.xlsx.writeFile(this.resultsFile);
        console.log(`\n✅ Excel report written to: ${this.resultsFile}`);
    }
}

module.exports = ExcelReporter;
