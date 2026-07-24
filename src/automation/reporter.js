const fs = require('fs');
const path = require('path');

class Reporter {
  /**
   * Generates the visual audit dashboard HTML report
   * @param {Object} results - The comparison results per page
   * @param {string} baselineDate - Baseline timestamp
   * @param {string} compareDate - Current run timestamp
   * @param {string} outputPath - Output file path (e.g. reports/dashboard.html)
   */
  static generateReport(results, baselineDate, compareDate, outputPath) {
    try {
      // Save current run metadata
      const reportsDir = path.dirname(outputPath);
      const currentMetaPath = path.join(reportsDir, 'last_run_meta.json');
      try {
        if (!fs.existsSync(reportsDir)) {
          fs.mkdirSync(reportsDir, { recursive: true });
        }
        fs.writeFileSync(currentMetaPath, JSON.stringify({ timestamp: compareDate }, null, 2), 'utf8');
      } catch (err) {
        console.error("Could not save current run metadata:", err);
      }

      // Check for previous run state data
      let previousResults = null;
      let previousDate = null;
      const prevRunStatePath = path.join(reportsDir, 'previous_run_state.json');
      const prevRunMetaPath = path.join(reportsDir, 'previous_run_meta.json');
      if (fs.existsSync(prevRunStatePath)) {
        try {
          previousResults = JSON.parse(fs.readFileSync(prevRunStatePath, 'utf8'));
        } catch (e) {
          console.error("Could not read previous run state:", e);
        }
      }
      if (fs.existsSync(prevRunMetaPath)) {
        try {
          const prevMeta = JSON.parse(fs.readFileSync(prevRunMetaPath, 'utf8'));
          previousDate = prevMeta.timestamp;
        } catch (e) {
          console.error("Could not read previous run metadata:", e);
        }
      }

      // Calculate high-level summary stats
      let totalPages = 0;
      let totalComponents = 0;
      let presentCount = 0;
      let changedCount = 0;
      let missingCount = 0;

      Object.values(results).forEach(page => {
        totalPages++;
        page.components.forEach(comp => {
          totalComponents++;
          if (comp.status === 'Present') presentCount++;
          else if (comp.status === 'Changed') changedCount++;
          else if (comp.status === 'Missing') missingCount++;
        });
      });

      const complianceRate = totalComponents > 0 
        ? (( (presentCount + (changedCount * 0.5)) / totalComponents ) * 100).toFixed(1)
        : '100';

      // Calculate high-level summary stats (Previous Run)
      let prevTotalPages = 0;
      let prevTotalComponents = 0;
      let prevPresentCount = 0;
      let prevChangedCount = 0;
      let prevMissingCount = 0;

      if (previousResults) {
        Object.values(previousResults).forEach(page => {
          prevTotalPages++;
          page.components.forEach(comp => {
            prevTotalComponents++;
            if (comp.status === 'Present') prevPresentCount++;
            else if (comp.status === 'Changed') prevChangedCount++;
            else if (comp.status === 'Missing') prevMissingCount++;
          });
        });
      }

      const prevComplianceRate = prevTotalComponents > 0 
        ? (( (prevPresentCount + (prevChangedCount * 0.5)) / prevTotalComponents ) * 100).toFixed(1)
        : null;

      // Helper to generate trend text
      const getTrendHtml = (currVal, prevVal, lowerIsBetter = false, isPercentage = false) => {
        if (prevVal === null || prevVal === undefined) return '';
        const diffVal = parseFloat((currVal - prevVal).toFixed(isPercentage ? 1 : 0));
        if (diffVal === 0) {
          return `<div class="trend-text stable">Stable (no change)</div>`;
        }
        
        const sign = diffVal > 0 ? '+' : '';
        const isGood = lowerIsBetter ? (diffVal < 0) : (diffVal > 0);
        const badgeClass = isGood ? 'trend-good' : 'trend-bad';
        const displayVal = `${sign}${diffVal}${isPercentage ? '%' : ''}`;
        
        return `<div class="trend-text ${badgeClass}">${displayVal} vs last run</div>`;
      };

      const resultsJson = JSON.stringify(results);
      const previousResultsJson = previousResults ? JSON.stringify(previousResults) : 'null';
      const prevDateJson = previousDate ? JSON.stringify(previousDate) : 'null';

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Website Component Audit Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #0b0f19;
      --bg-card: rgba(17, 24, 39, 0.7);
      --border-color: rgba(255, 255, 255, 0.08);
      --text-main: #f3f4f6;
      --text-muted: #9ca3af;
      
      --neon-blue: #00f2fe;
      --neon-green: #10b981;
      --neon-orange: #f59e0b;
      --neon-red: #ef4444;
      --neon-purple: #8b5cf6;

      --blue-glow: rgba(0, 242, 254, 0.15);
      --green-glow: rgba(16, 185, 129, 0.15);
      --orange-glow: rgba(245, 158, 11, 0.15);
      --red-glow: rgba(239, 68, 68, 0.15);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }

    body {
      background-color: var(--bg-primary);
      background-image: 
        radial-gradient(at 5% 5%, rgba(0, 242, 254, 0.05) 0px, transparent 50%),
        radial-gradient(at 95% 95%, rgba(139, 92, 246, 0.05) 0px, transparent 50%);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 2.5rem;
      border-bottom: 1px solid var(--border-color);
      background: rgba(11, 15, 25, 0.8);
      backdrop-filter: blur(12px);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .logo-area {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, var(--neon-blue), var(--neon-purple));
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 1.2rem;
      color: #000;
      box-shadow: 0 0 15px rgba(0, 242, 254, 0.2);
    }

    .logo-title h1 {
      font-size: 1.4rem;
      font-weight: 700;
      background: linear-gradient(90deg, #fff, var(--text-muted));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .logo-title p {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .run-meta {
      display: flex;
      gap: 2rem;
    }

    .meta-item {
      text-align: right;
    }

    .meta-value {
      font-size: 0.9rem;
      color: var(--neon-blue);
      font-weight: 600;
    }

    .meta-label {
      font-size: 0.7rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Dashboard Layout */
    .dashboard-container {
      display: flex;
      flex-direction: column;
      padding: 2rem 2.5rem;
      gap: 2rem;
      flex-grow: 1;
    }

    /* Summary Section */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
    }

    .stat-card {
      background: var(--bg-card);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 1.5rem;
      position: relative;
      overflow: hidden;
      box-shadow: 0 4px 20px -5px rgba(0,0,0,0.3);
    }

    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
    }

    .stat-pages::before { background-color: var(--neon-blue); }
    .stat-compliance::before { background-color: var(--neon-purple); }
    .stat-present::before { background-color: var(--neon-green); }
    .stat-changed::before { background-color: var(--neon-orange); }
    .stat-missing::before { background-color: var(--neon-red); }

    .stat-label {
      font-size: 0.8rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.5rem;
    }

    .stat-value {
      font-size: 2.2rem;
      font-weight: 800;
      color: #fff;
    }

    /* Workspace Content Split */
    .workspace {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 2rem;
      align-items: start;
    }

    /* Sidebar Page List */
    .sidebar {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .sidebar-title {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 0.5rem;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 0.5rem;
    }

    .page-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      padding: 1rem;
      border-radius: 10px;
      text-align: left;
      cursor: pointer;
      font-size: 0.95rem;
      font-weight: 600;
      transition: all 0.2s ease;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .page-btn:hover {
      background: rgba(255, 255, 255, 0.03);
      color: #fff;
    }

    .page-btn.active {
      background: linear-gradient(135deg, rgba(0, 242, 254, 0.15), rgba(139, 92, 246, 0.15));
      border-color: rgba(0, 242, 254, 0.2);
      color: #fff;
    }

    .page-indicator {
      display: flex;
      gap: 4px;
    }

    .indicator-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .dot-green { background-color: var(--neon-green); }
    .dot-orange { background-color: var(--neon-orange); }
    .dot-red { background-color: var(--neon-red); }

    /* Main Content Area */
    .main-pane {
      background: var(--bg-card);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 2rem;
      min-height: 500px;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .pane-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 1.2rem;
    }

    .pane-title h2 {
      font-size: 1.5rem;
      font-weight: 700;
    }

    .pane-title p {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .view-selector {
      display: flex;
      background: rgba(0, 0, 0, 0.3);
      padding: 4px;
      border-radius: 8px;
      border: 1px solid var(--border-color);
    }

    .view-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .view-btn.active {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    /* Filters row */
    .filters-row {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: center;
    }

    .search-input {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-color);
      padding: 0.6rem 1rem;
      border-radius: 8px;
      color: #fff;
      font-size: 0.85rem;
      outline: none;
      width: 300px;
    }

    .search-input:focus {
      border-color: var(--neon-blue);
    }

    .filter-pills {
      display: flex;
      gap: 8px;
    }

    .pill {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      padding: 0.4rem 0.8rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .pill:hover, .pill.active {
      color: #fff;
      border-color: var(--text-muted);
    }

    .pill-all.active { background: rgba(255, 255, 255, 0.1); }
    .pill-present.active { background: var(--green-glow); color: var(--neon-green); border-color: var(--neon-green); }
    .pill-changed.active { background: var(--orange-glow); color: var(--neon-orange); border-color: var(--neon-orange); }
    .pill-missing.active { background: var(--red-glow); color: var(--neon-red); border-color: var(--neon-red); }

    /* Highlights Pane - Side-by-Side Visual Comparison */
    .highlights-view {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
      align-items: start;
    }

    @media (max-width: 1024px) {
      .highlights-view {
        grid-template-columns: 1fr;
      }
    }

    .screenshot-container {
      border: 2px solid var(--border-color);
      border-radius: 12px;
      height: 650px; /* Fixed viewport height for visual alignment */
      overflow-y: auto; /* Vertically scrollable */
      overflow-x: hidden;
      position: relative;
      max-width: 100%;
      background: #0d1117;
      box-shadow: 0 8px 30px rgba(0,0,0,0.5);
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.2) transparent;
      cursor: zoom-in; /* Indicate clicking to expand */
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .screenshot-container:hover {
      border-color: var(--neon-blue);
      box-shadow: 0 8px 35px rgba(0, 242, 254, 0.15);
    }

    .screenshot-container::-webkit-scrollbar {
      width: 6px;
    }

    .screenshot-container::-webkit-scrollbar-thumb {
      background-color: rgba(255,255,255,0.2);
      border-radius: 3px;
    }

    .screenshot-img {
      display: block;
      width: 100%;
      height: auto;
    }

    /* Toggle switch styles */
    .switch input:checked + .slider {
      background-color: var(--neon-blue);
    }
    .switch .slider:before {
      position: absolute;
      content: "";
      height: 14px;
      width: 14px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .3s;
      border-radius: 50%;
    }
    .switch input:checked + .slider:before {
      transform: translateX(16px);
    }

    /* Size Button styles */
    .size-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }
    .size-btn:hover {
      color: #fff;
      background: rgba(255,255,255,0.05);
    }
    .size-btn.active {
      background: var(--blue-glow) !important;
      color: var(--neon-blue) !important;
      box-shadow: 0 0 8px rgba(0, 242, 254, 0.15);
    }

    /* Lightbox Modal */
    .lightbox-modal {
      display: none;
      position: fixed;
      z-index: 10000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(5, 8, 16, 0.95);
      backdrop-filter: blur(8px);
      flex-direction: column;
    }

    .lightbox-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 2rem;
      border-bottom: 1px solid var(--border-color);
      background: rgba(11, 15, 25, 0.95);
    }

    .lightbox-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #fff;
    }

    .lightbox-tabs {
      display: flex;
      gap: 0.5rem;
    }

    .lightbox-tab-btn {
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 600;
      transition: all 0.2s;
    }

    .lightbox-tab-btn:hover {
      background: rgba(255,255,255,0.1);
      color: #fff;
    }

    .lightbox-tab-btn.active {
      background: var(--blue-glow);
      color: var(--neon-blue);
      border-color: var(--neon-blue);
      box-shadow: 0 0 10px rgba(0, 242, 254, 0.2);
    }

    .lightbox-close {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 1.8rem;
      cursor: pointer;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background-color 0.2s, color 0.2s;
      line-height: 1;
    }

    .lightbox-close:hover {
      background: rgba(255,255,255,0.1);
      color: #fff;
    }

    .lightbox-body {
      flex-grow: 1;
      overflow: auto;
      padding: 2rem;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }

    .lightbox-content {
      max-width: 1280px;
      width: 100%;
      background: #0b0f19;
      box-shadow: 0 10px 40px rgba(0,0,0,0.8);
      border: 2px solid var(--border-color);
      border-radius: 8px;
      display: block;
    }
    
    .lightbox-modal.mobile-view .lightbox-content {
      max-width: 450px;
    }

    /* Table View */
    .table-view {
      overflow-x: auto;
      border-radius: 12px;
      border: 1px solid var(--border-color);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    th {
      background: rgba(0, 0, 0, 0.3);
      color: var(--text-muted);
      padding: 1rem;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border-color);
    }

    td {
      padding: 1rem;
      font-size: 0.85rem;
      border-bottom: 1px solid var(--border-color);
      vertical-align: top;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover td {
      background: rgba(255, 255, 255, 0.01);
    }

    .comp-name {
      font-weight: 600;
      color: #fff;
    }

    .comp-selector {
      font-family: monospace;
      color: var(--text-muted);
      background: rgba(0, 0, 0, 0.2);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.75rem;
      word-break: break-all;
    }

    .status-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .badge-present { background: var(--green-glow); color: var(--neon-green); border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-changed { background: var(--orange-glow); color: var(--neon-orange); border: 1px solid rgba(245, 158, 11, 0.3); }
    .badge-missing { background: var(--red-glow); color: var(--neon-red); border: 1px solid rgba(239, 68, 68, 0.3); }
    .badge-na { background: rgba(255, 255, 255, 0.05); color: var(--text-muted); border: 1px solid rgba(255, 255, 255, 0.1); }

    .trend-text {
      font-size: 0.75rem;
      margin-top: 0.4rem;
      font-weight: 600;
    }
    .trend-good {
      color: var(--neon-green);
    }
    .trend-bad {
      color: var(--neon-red);
    }
    .stable {
      color: var(--text-muted);
    }

    .diff-table {
      width: 100%;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      margin-top: 0.5rem;
    }

    .diff-row-3col {
      display: grid;
      grid-template-columns: 120px 1fr 1fr;
      border-bottom: 1px solid var(--border-color);
    }
    
    .diff-row-4col {
      display: grid;
      grid-template-columns: 120px 1fr 1fr 1fr;
      border-bottom: 1px solid var(--border-color);
    }

    .diff-cell {
      padding: 8px 12px;
      font-size: 0.75rem;
      word-break: break-all;
      display: flex;
      align-items: center;
    }

    .diff-hdr {
      background: rgba(0,0,0,0.15);
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      font-size: 0.7rem;
      letter-spacing: 0.5px;
    }

    .diff-changed-cell {
      background: rgba(245, 158, 11, 0.08) !important;
      color: var(--neon-orange) !important;
    }
    .diff-new-cell {
      background: rgba(16, 185, 129, 0.08) !important;
      color: #a7f3d0 !important;
    }
    .diff-old-cell {
      background: rgba(239, 68, 68, 0.05) !important;
      color: #fca5a5 !important;
    }

    .diff-old {
      background: rgba(239, 68, 68, 0.05);
      color: #fca5a5;
      text-decoration: line-through;
    }

    .diff-new {
      background: rgba(16, 185, 129, 0.05);
      color: #a7f3d0;
    }

    .empty-state {
      padding: 3rem;
      text-align: center;
      color: var(--text-muted);
    }

    /* Footer */
    footer.dashboard-footer {
      text-align: center;
      padding: 2rem;
      font-size: 0.8rem;
      color: var(--text-muted);
      border-top: 1px solid var(--border-color);
      margin-top: auto;
    }
  </style>
</head>
<body>

  <header>
    <div class="logo-area">
      <div class="logo-icon">A</div>
      <div class="logo-title">
        <h1>Component Audit Dashboard</h1>
        <p>Visual regression and elements status monitor</p>
      </div>
    </div>
    <div class="run-meta">
      <div class="meta-item">
        <div class="meta-value">${baselineDate || 'N/A'}</div>
        <div class="meta-label">Baseline Date</div>
      </div>
      ${previousDate ? `
      <div class="meta-item">
        <div class="meta-value">${previousDate}</div>
        <div class="meta-label">Previous Run Date</div>
      </div>
      ` : ''}
      <div class="meta-item">
        <div class="meta-value">${compareDate || 'N/A'}</div>
        <div class="meta-label">Comparison Date</div>
      </div>
    </div>
  </header>

  <div class="dashboard-container">
    <div class="stats-row">
      <div class="stat-card stat-pages">
        <div class="stat-label">Pages Monitored</div>
        <div class="stat-value">${totalPages}</div>
      </div>
      <div class="stat-card stat-compliance">
        <div class="stat-label">Compliance Index</div>
        <div class="stat-value" style="color: var(--neon-purple)">${complianceRate}%</div>
        ${getTrendHtml(parseFloat(complianceRate), prevComplianceRate ? parseFloat(prevComplianceRate) : null, false, true)}
      </div>
      <div class="stat-card stat-present">
        <div class="stat-label">Components Present</div>
        <div class="stat-value" style="color: var(--neon-green)">${presentCount}</div>
        ${getTrendHtml(presentCount, previousResults ? prevPresentCount : null, false, false)}
      </div>
      <div class="stat-card stat-changed">
        <div class="stat-label">Changed / Updated</div>
        <div class="stat-value" style="color: var(--neon-orange)">${changedCount}</div>
        ${getTrendHtml(changedCount, previousResults ? prevChangedCount : null, true, false)}
      </div>
      <div class="stat-card stat-missing">
        <div class="stat-label">Missing Elements</div>
        <div class="stat-value" style="color: var(--neon-red)">${missingCount}</div>
        ${getTrendHtml(missingCount, previousResults ? prevMissingCount : null, true, false)}
      </div>
    </div>

    <div class="workspace">
      <div class="sidebar" id="pageSidebar">
        <div class="sidebar-title">Monitored Pages</div>
        <!-- Dynamic sidebar buttons -->
      </div>

      <div class="main-pane">
        <div class="pane-header">
          <div class="pane-title" id="paneTitle">
            <h2 id="activePageName">Loading...</h2>
            <p id="activePageUrl"></p>
          </div>
          <div class="view-selector">
            <button class="view-btn active" id="btnHighlights" onclick="setViewMode('highlights')">Visual Map</button>
            <button class="view-btn" id="btnTable" onclick="setViewMode('table')">Component Table</button>
          </div>
        </div>

        <!-- Filter bar (only visible in Table mode) -->
        <div class="filters-row" id="filtersRow" style="display: none;">
          <input type="text" id="searchInput" class="search-input" placeholder="Search components..." oninput="filterComponents()">
          <div class="filter-pills">
            <button class="pill pill-all active" onclick="setStatusFilter('ALL')">All</button>
            <button class="pill pill-present" onclick="setStatusFilter('Present')">Present</button>
            <button class="pill pill-changed" onclick="setStatusFilter('Changed')">Changed</button>
            <button class="pill pill-missing" onclick="setStatusFilter('Missing')">Missing</button>
          </div>
        </div>

        <!-- Screenshot Toolbar -->
        <div id="screenshotToolbar" style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.75rem 1.25rem; margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem;">
            <span style="color: var(--text-muted);">Sync Scrolling:</span>
            <label class="switch" style="position: relative; display: inline-block; width: 36px; height: 20px;">
              <input type="checkbox" id="syncScrollToggle" checked style="opacity: 0; width: 0; height: 0;">
              <span class="slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255,255,255,0.1); transition: .3s; border-radius: 20px;"></span>
            </label>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">
            💡 <em>Click any screenshot to expand to full size for pixel-perfect detail comparison.</em>
          </div>
        </div>

        <!-- Highlights Pane - Side-by-Side Comparative View -->
        <div class="highlights-view" id="highlightsView">
          <div class="visual-column">
            <div style="font-size: 0.9rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px; letter-spacing: 0.5px;">Reference Baseline (Last Capture)</div>
            <div class="screenshot-container" onclick="openLightbox('baseline')">
              <img id="baselineScreenshot" class="screenshot-img" src="" alt="Reference Baseline" onerror="this.src='https://placehold.co/600x400?text=No+Baseline+Image'">
            </div>
          </div>
          <div class="visual-column" id="previousColumn" style="display: none;">
            <div style="font-size: 0.9rem; font-weight: 700; text-transform: uppercase; color: var(--neon-orange); margin-bottom: 8px; letter-spacing: 0.5px;">Previous Run View</div>
            <div class="screenshot-container" onclick="openLightbox('previous')">
              <img id="previousScreenshot" class="screenshot-img" src="" alt="Previous Run" onerror="this.src='https://placehold.co/600x400?text=No+Previous+Image'">
            </div>
          </div>
          <div class="visual-column">
            <div style="font-size: 0.9rem; font-weight: 700; text-transform: uppercase; color: var(--neon-blue); margin-bottom: 8px; letter-spacing: 0.5px;">Current Build View (Today's Capture)</div>
            <div class="screenshot-container" onclick="openLightbox('current')">
              <img id="pageScreenshot" class="screenshot-img" src="" alt="Today's Highlights" onerror="this.src='https://placehold.co/600x400?text=No+Current+Image'">
            </div>
          </div>
        </div>

        <!-- Table Pane -->
        <div class="table-view" id="tableView" style="display: none;">
          <table>
            <thead>
              <tr>
                <th style="width: 20%">Component Name</th>
                <th style="width: 12%">Prev Status</th>
                <th style="width: 12%">New Status</th>
                <th style="width: 16%">Selector</th>
                <th style="width: 40%">Details & Differences</th>
              </tr>
            </thead>
            <tbody id="tableBody">
              <!-- Dynamic component rows -->
            </tbody>
          </table>
          <div id="emptyState" class="empty-state" style="display: none;">
            <p>No elements match the current filters.</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Lightbox Modal -->
  <div id="lightboxModal" class="lightbox-modal">
    <div class="lightbox-header">
      <div class="lightbox-title" id="lightboxTitle">Screenshot Details</div>
      <div class="lightbox-tabs">
        <button class="lightbox-tab-btn" id="tabBaseline" onclick="selectLightboxView('baseline')">Baseline</button>
        <button class="lightbox-tab-btn" id="tabPrevious" onclick="selectLightboxView('previous')">Previous</button>
        <button class="lightbox-tab-btn" id="tabCurrent" onclick="selectLightboxView('current')">Current Run</button>
      </div>
      <button class="lightbox-close" onclick="closeLightbox()">&times;</button>
    </div>
    <div class="lightbox-body">
      <img id="lightboxImg" class="lightbox-content" src="" alt="Expanded View">
    </div>
  </div>

  <footer class="dashboard-footer">
    <p>Component Audit Automation Framework &copy; 2026. Custom Premium Verification Report.</p>
  </footer>

  <script>
    const data = ${resultsJson};
    const previousData = ${previousResultsJson};
    let activePageId = Object.keys(data)[0];
    let viewMode = 'highlights'; // 'highlights' | 'table'
    let statusFilter = 'ALL';
    let currentLightboxView = 'current'; // 'baseline' | 'previous' | 'current'
    
    function init() {
      renderSidebar();
      loadPage(activePageId);
      setupSyncScrolling();
    }

    function renderSidebar() {
      const sidebar = document.getElementById('pageSidebar');
      // Clear existing page buttons, keeping title
      const title = sidebar.querySelector('.sidebar-title');
      sidebar.innerHTML = '';
      sidebar.appendChild(title);

      Object.keys(data).forEach(pageId => {
        const page = data[pageId];
        
        let hasMissing = false;
        let hasChanged = false;
        page.components.forEach(c => {
          if (c.status === 'Missing' && !c.optional) hasMissing = true;
          if (c.status === 'Changed') hasChanged = true;
        });

        let dotClass = 'dot-green';
        if (hasMissing) dotClass = 'dot-red';
        else if (hasChanged) dotClass = 'dot-orange';

        const btn = document.createElement('button');
        btn.className = 'page-btn' + (pageId === activePageId ? ' active' : '');
        btn.onclick = () => loadPage(pageId);
        btn.innerHTML = \`
          <span>\${page.name}</span>
          <div class="page-indicator">
            <span class="indicator-dot \${dotClass}"></span>
          </div>
        \`;
        sidebar.appendChild(btn);
      });
    }

    function loadPage(pageId) {
      activePageId = pageId;
      document.querySelectorAll('.page-btn').forEach((btn, idx) => {
        // Offset by title
        if (idx === 0) return;
        const keys = Object.keys(data);
        const thisKey = keys[idx - 1];
        if (thisKey === pageId) btn.classList.add('active');
        else btn.classList.remove('active');
      });

      const page = data[pageId];
      document.getElementById('activePageName').innerText = page.name;
      document.getElementById('activePageUrl').innerHTML = \`<a href="\${page.url}" target="_blank" style="color: var(--neon-blue); text-decoration: none;">\${page.url}</a>\`;
      
      // Load screenshots
      document.getElementById('pageScreenshot').src = './screenshots/' + pageId + '_current.png';
      document.getElementById('baselineScreenshot').src = './screenshots/' + pageId + '_baseline.png';

      // Load previous screenshot if available
      const previousColumn = document.getElementById('previousColumn');
      const highlightsView = document.getElementById('highlightsView');
      if (previousData && previousData[pageId]) {
        previousColumn.style.display = 'block';
        document.getElementById('previousScreenshot').src = './screenshots/' + pageId + '_previous.png';
        highlightsView.style.gridTemplateColumns = '1fr 1fr 1fr';
      } else {
        previousColumn.style.display = 'none';
        highlightsView.style.gridTemplateColumns = '1fr 1fr';
      }

      renderTable();
      setViewMode(viewMode);
      
      // Re-apply current size selection
      const activeSizeBtn = document.querySelector('.size-btn.active');
      if (activeSizeBtn) {
        const text = activeSizeBtn.innerText.toLowerCase();
        if (text.includes('fit') || text.includes('300')) setScreenshotSize('small');
        else if (text.includes('medium')) setScreenshotSize('medium');
        else if (text.includes('large')) setScreenshotSize('large');
        else if (text.includes('full')) setScreenshotSize('full');
      }
    }

    function setViewMode(mode) {
      viewMode = mode;
      const highlightsBtn = document.getElementById('btnHighlights');
      const tableBtn = document.getElementById('btnTable');
      const highlightsView = document.getElementById('highlightsView');
      const tableView = document.getElementById('tableView');
      const filtersRow = document.getElementById('filtersRow');

      if (mode === 'highlights') {
        highlightsBtn.classList.add('active');
        tableBtn.classList.remove('active');
        highlightsView.style.display = 'grid';
        tableView.style.display = 'none';
        filtersRow.style.display = 'none';
      } else {
        highlightsBtn.classList.remove('active');
        tableBtn.classList.add('active');
        highlightsView.style.display = 'none';
        tableView.style.display = 'block';
        filtersRow.style.display = 'flex';
      }
    }

    function setStatusFilter(filter) {
      statusFilter = filter;
      document.querySelectorAll('.pill').forEach(btn => btn.classList.remove('active'));
      const activeClass = '.pill-' + filter.toLowerCase();
      const activeBtn = document.querySelector(activeClass) || document.querySelector('.pill-all');
      activeBtn.classList.add('active');
      renderTable();
    }

    function filterComponents() {
      renderTable();
    }

    function getAttributeRowData(comp, prevComp) {
      const allAttrs = new Set([
        ...Object.keys(comp.attributes || {}),
        ...Object.keys(comp.changes || {}),
        ...(prevComp ? Object.keys(prevComp.attributes || {}) : []),
        ...(prevComp ? Object.keys(prevComp.changes || {}) : [])
      ]);

      const rows = [];
      allAttrs.forEach(attr => {
        let currentVal = comp.present ? (comp.attributes[attr] || '') : '(Element Missing)';
        let prevVal = prevComp ? (prevComp.present ? (prevComp.attributes[attr] || '') : '(Element Missing)') : 'N/A';
        
        let baselineVal = '';
        if (comp.changes && comp.changes[attr]) {
          baselineVal = comp.changes[attr].old;
        } else if (prevComp && prevComp.changes && prevComp.changes[attr]) {
          baselineVal = prevComp.changes[attr].old;
        } else if (comp.present) {
          baselineVal = comp.attributes[attr] || '';
        } else if (prevComp && prevComp.present) {
          baselineVal = prevComp.attributes[attr] || '';
        } else {
          baselineVal = '';
        }

        // Check if changed
        const isChangedNew = comp.changes && comp.changes[attr];
        const isChangedPrev = prevComp && prevComp.changes && prevComp.changes[attr];
        
        rows.push({
          attr,
          baselineVal,
          prevVal,
          currentVal,
          isChangedPrev,
          isChangedNew
        });
      });
      
      return rows;
    }

    function renderTable() {
      const page = data[activePageId];
      const prevPage = previousData ? previousData[activePageId] : null;
      const search = document.getElementById('searchInput').value.toLowerCase();
      const tbody = document.getElementById('tableBody');
      const emptyState = document.getElementById('emptyState');
      tbody.innerHTML = '';

      const filtered = page.components.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(search) || c.selector.toLowerCase().includes(search);
        const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
        return matchesSearch && matchesStatus;
      });

      if (filtered.length === 0) {
        emptyState.style.display = 'block';
        return;
      }
      emptyState.style.display = 'none';

      filtered.forEach(c => {
        const tr = document.createElement('tr');
        
        // Find previous component for comparative analysis
        const prevComp = prevPage ? prevPage.components.find(pc => pc.id === c.id) : null;
        const prevStatus = prevComp ? prevComp.status : 'N/A';

        // Badge styling for New Run
        let badgeClass = 'badge-present';
        if (c.status === 'Changed') badgeClass = 'badge-changed';
        else if (c.status === 'Missing') badgeClass = 'badge-missing';

        // Badge styling for Previous Run
        let prevBadgeClass = 'badge-present';
        if (prevStatus === 'Changed') prevBadgeClass = 'badge-changed';
        else if (prevStatus === 'Missing') prevBadgeClass = 'badge-missing';
        else if (prevStatus === 'N/A') prevBadgeClass = 'badge-na';

        let detailsContent = '';
        if (c.status === 'Present' && prevStatus === 'Present') {
          detailsContent = '<div style="color: var(--neon-green)">All attributes match baseline reference across both runs.</div>';
        } else if (c.status === 'Missing' && prevStatus === 'Missing') {
          detailsContent = \`<div style="color: var(--neon-red)">\${c.optional ? 'Optional component missing' : 'Critical element missing from page DOM'} in both runs.</div>\`;
        } else {
          // Generate a 3-way or 2-way attribute diff table
          const attrRows = getAttributeRowData(c, prevComp);
          const hasChangedAttrs = attrRows.some(r => r.isChangedPrev || r.isChangedNew);
          
          if (!hasChangedAttrs) {
            detailsContent = \`<div style="color: var(--neon-green)">All attributes match baseline reference. (Current: \${c.status}, Previous: \${prevStatus})</div>\`;
          } else {
            const hasPrev = !!prevComp;
            detailsContent = \`
              <div style="font-weight: 600; margin-bottom: 4px; color: var(--neon-orange);">Comparison History:</div>
              <div class="diff-table">
                <div class="\${hasPrev ? 'diff-row-4col' : 'diff-row-3col'}">
                  <div class="diff-cell diff-hdr">Attribute</div>
                  <div class="diff-cell diff-hdr">Baseline</div>
                  \${hasPrev ? '<div class="diff-cell diff-hdr">Previous Run</div>' : ''}
                  <div class="diff-cell diff-hdr">New Run</div>
                </div>
            \`;
            
            attrRows.forEach(r => {
              // Only render rows where changes occurred to avoid clutter
              if (r.isChangedPrev || r.isChangedNew) {
                const prevCellClass = r.isChangedPrev ? 'diff-changed-cell' : '';
                const newCellClass = r.isChangedNew ? 'diff-new-cell' : '';
                detailsContent += \`
                  <div class="\${hasPrev ? 'diff-row-4col' : 'diff-row-3col'}">
                    <div class="diff-cell" style="font-weight: 600;">\${escapeHtml(r.attr)}</div>
                    <div class="diff-cell diff-old-cell">\${escapeHtml(r.baselineVal)}</div>
                    \${hasPrev ? '<div class="diff-cell ' + prevCellClass + '">' + escapeHtml(r.prevVal) + '</div>' : ''}
                    <div class="diff-cell \${newCellClass}">\${escapeHtml(r.currentVal)}</div>
                  </div>
                \`;
              }
            });
            
            detailsContent += '</div>';
          }
        }

        tr.innerHTML = \`
          <td>
            <div class="comp-name">\${c.name}</div>
            \${c.optional ? '<span style="font-size: 10px; color: var(--text-muted);">Optional</span>' : ''}
          </td>
          <td><span class="status-badge \${prevBadgeClass}">\${prevStatus}</span></td>
          <td><span class="status-badge \${badgeClass}">\${c.status}</span></td>
          <td><span class="comp-selector">\${escapeHtml(c.selector)}</span></td>
          <td>\${detailsContent}</td>
        \`;
        tbody.appendChild(tr);
      });
    }

    function escapeHtml(text) {
      if (!text) return '';
      return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    // Setup Scroll Synchronization across columns
    function setupSyncScrolling() {
      const containers = [
        document.getElementById('baselineScreenshot').parentElement,
        document.getElementById('previousScreenshot').parentElement,
        document.getElementById('pageScreenshot').parentElement
      ];
      
      let activeScrollContainer = null;
      
      containers.forEach(container => {
        if (!container) return;
        
        container.addEventListener('mouseenter', () => {
          activeScrollContainer = container;
        });
        
        container.addEventListener('scroll', () => {
          const syncEnabled = document.getElementById('syncScrollToggle').checked;
          if (!syncEnabled || activeScrollContainer !== container) return;
          
          const scrollTop = container.scrollTop;
          const scrollHeight = container.scrollHeight - container.clientHeight;
          const scrollPercent = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
          
          containers.forEach(other => {
            if (other === container || !other) return;
            const otherScrollHeight = other.scrollHeight - other.clientHeight;
            other.scrollTop = otherScrollHeight * scrollPercent;
          });
        });
      });
    }

    // Set display width of screenshots in columns
    function setScreenshotSize(size) {
      document.querySelectorAll('.size-btn').forEach(btn => {
        const text = btn.innerText.toLowerCase();
        if (size === 'small' && (text.includes('fit') || text.includes('300'))) {
          btn.classList.add('active');
        } else if (size === 'medium' && text.includes('medium')) {
          btn.classList.add('active');
        } else if (size === 'large' && text.includes('large')) {
          btn.classList.add('active');
        } else if (size === 'full' && text.includes('full')) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
      
      const highlightsView = document.getElementById('highlightsView');
      const hasPrev = previousData && previousData[activePageId];
      const colCount = hasPrev ? 3 : 2;
      
      if (size === 'small') {
        highlightsView.style.gridTemplateColumns = 'repeat(' + colCount + ', minmax(280px, 1fr))';
        highlightsView.style.maxWidth = '100%';
        highlightsView.style.overflowX = 'hidden';
      } else if (size === 'medium') {
        highlightsView.style.gridTemplateColumns = 'repeat(' + colCount + ', 500px)';
        highlightsView.style.maxWidth = '100%';
        highlightsView.style.overflowX = 'auto';
      } else if (size === 'large') {
        highlightsView.style.gridTemplateColumns = 'repeat(' + colCount + ', 750px)';
        highlightsView.style.maxWidth = '100%';
        highlightsView.style.overflowX = 'auto';
      } else if (size === 'full') {
        highlightsView.style.gridTemplateColumns = '1fr';
        highlightsView.style.maxWidth = '1000px';
        highlightsView.style.margin = '0 auto';
        highlightsView.style.overflowX = 'hidden';
      }
    }

    // Lightbox modal functions for full scale view
    function openLightbox(viewType) {
      currentLightboxView = viewType;
      const modal = document.getElementById('lightboxModal');
      
      if (activePageId.includes('mobile')) {
        modal.classList.add('mobile-view');
      } else {
        modal.classList.remove('mobile-view');
      }
      
      modal.style.display = 'flex';
      selectLightboxView(viewType);
      
      // Align scroll height to small viewport scroll height percentage
      let sourceContainer = null;
      if (viewType === 'baseline') sourceContainer = document.getElementById('baselineScreenshot').parentElement;
      else if (viewType === 'previous') sourceContainer = document.getElementById('previousScreenshot').parentElement;
      else sourceContainer = document.getElementById('pageScreenshot').parentElement;
      
      if (sourceContainer) {
        const scrollTop = sourceContainer.scrollTop;
        const scrollHeight = sourceContainer.scrollHeight - sourceContainer.clientHeight;
        const percent = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
        
        const img = document.getElementById('lightboxImg');
        const scrollBody = document.querySelector('.lightbox-body');
        
        const setScroll = () => {
          const targetScrollHeight = scrollBody.scrollHeight - scrollBody.clientHeight;
          scrollBody.scrollTop = targetScrollHeight * percent;
        };
        
        if (img.complete) {
          setTimeout(setScroll, 100);
        } else {
          img.onload = () => {
            setTimeout(setScroll, 100);
            img.onload = null;
          };
        }
      }
    }
    
    function closeLightbox() {
      document.getElementById('lightboxModal').style.display = 'none';
    }
    
    function selectLightboxView(viewType) {
      currentLightboxView = viewType;
      
      document.getElementById('tabBaseline').classList.toggle('active', viewType === 'baseline');
      document.getElementById('tabPrevious').classList.toggle('active', viewType === 'previous');
      document.getElementById('tabCurrent').classList.toggle('active', viewType === 'current');
      
      const hasPrev = previousData && previousData[activePageId];
      document.getElementById('tabPrevious').style.display = hasPrev ? 'block' : 'none';
      
      const img = document.getElementById('lightboxImg');
      const pageId = activePageId;
      
      if (viewType === 'baseline') {
        img.src = './screenshots/' + pageId + '_baseline.png';
        document.getElementById('lightboxTitle').innerText = 'Reference Baseline - ' + data[pageId].name;
      } else if (viewType === 'previous') {
        img.src = './screenshots/' + pageId + '_previous.png';
        document.getElementById('lightboxTitle').innerText = 'Previous Run View - ' + data[pageId].name;
      } else {
        img.src = './screenshots/' + pageId + '_current.png';
        document.getElementById('lightboxTitle').innerText = "Today's Highlights - " + data[pageId].name;
      }
    }

    window.onload = init;
  </script>
</body>
</html>`;

      // Ensure folders exist
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      fs.writeFileSync(outputPath, htmlContent, 'utf8');
      console.log(`HTML Dashboard report generated: ${outputPath}`);
    } catch (err) {
      console.error('Failed to generate HTML report:', err);
    }
  }
}

module.exports = Reporter;
