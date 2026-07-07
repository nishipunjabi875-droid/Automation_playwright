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

      const resultsJson = JSON.stringify(results);

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
      grid-template-columns: 1fr 1fr;
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
      overflow: hidden;
      position: relative;
      max-width: 100%;
      background: #000;
      box-shadow: 0 8px 30px rgba(0,0,0,0.5);
    }

    .screenshot-img {
      display: block;
      width: 100%;
      height: auto;
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

    .diff-table {
      width: 100%;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      margin-top: 0.5rem;
    }

    .diff-row {
      display: grid;
      grid-template-columns: 100px 1fr 1fr;
      border-bottom: 1px solid var(--border-color);
    }

    .diff-row:last-child {
      border-bottom: none;
    }

    .diff-cell {
      padding: 6px 12px;
      font-size: 0.75rem;
      word-break: break-all;
    }

    .diff-hdr {
      background: rgba(0,0,0,0.1);
      font-weight: 600;
      color: var(--text-muted);
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
      </div>
      <div class="stat-card stat-present">
        <div class="stat-label">Components Present</div>
        <div class="stat-value" style="color: var(--neon-green)">${presentCount}</div>
      </div>
      <div class="stat-card stat-changed">
        <div class="stat-label">Changed / Updated</div>
        <div class="stat-value" style="color: var(--neon-orange)">${changedCount}</div>
      </div>
      <div class="stat-card stat-missing">
        <div class="stat-label">Missing Elements</div>
        <div class="stat-value" style="color: var(--neon-red)">${missingCount}</div>
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

        <!-- Highlights Pane - Side-by-Side Comparative View -->
        <div class="highlights-view" id="highlightsView">
          <div class="visual-column">
            <div style="font-size: 0.9rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px; letter-spacing: 0.5px;">Reference Baseline (Last Capture)</div>
            <div class="screenshot-container">
              <img id="baselineScreenshot" class="screenshot-img" src="" alt="Reference Baseline" onerror="this.src='https://placehold.co/600x400?text=No+Baseline+Image'">
            </div>
          </div>
          <div class="visual-column">
            <div style="font-size: 0.9rem; font-weight: 700; text-transform: uppercase; color: var(--neon-blue); margin-bottom: 8px; letter-spacing: 0.5px;">Current Build View (Today's Capture)</div>
            <div class="screenshot-container">
              <img id="pageScreenshot" class="screenshot-img" src="" alt="Today's Highlights" onerror="this.src='https://placehold.co/600x400?text=No+Current+Image'">
            </div>
          </div>
        </div>

        <!-- Table Pane -->
        <div class="table-view" id="tableView" style="display: none;">
          <table>
            <thead>
              <tr>
                <th style="width: 25%">Component Name</th>
                <th style="width: 15%">Status</th>
                <th style="width: 20%">Selector</th>
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

  <footer class="dashboard-footer">
    <p>Component Audit Automation Framework &copy; 2026. Custom Premium Verification Report.</p>
  </footer>

  <script>
    const data = ${resultsJson};
    let activePageId = Object.keys(data)[0];
    let viewMode = 'highlights'; // 'highlights' | 'table'
    let statusFilter = 'ALL';
    
    function init() {
      renderSidebar();
      loadPage(activePageId);
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
      // Screenshots are in ./screenshots/ relative to dashboard.html
      document.getElementById('pageScreenshot').src = './screenshots/' + pageId + '_current.png';
      document.getElementById('baselineScreenshot').src = './screenshots/' + pageId + '_baseline.png';

      renderTable();
      setViewMode(viewMode);
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
        highlightsView.style.display = 'flex';
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

    function renderTable() {
      const page = data[activePageId];
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
        
        let badgeClass = 'badge-present';
        if (c.status === 'Changed') badgeClass = 'badge-changed';
        else if (c.status === 'Missing') badgeClass = 'badge-missing';

        let detailsContent = '';
        if (c.status === 'Present') {
          detailsContent = '<div style="color: var(--neon-green)">All attributes match baseline reference.</div>';
        } else if (c.status === 'Missing') {
          detailsContent = \`<div style="color: var(--neon-red)">\${c.optional ? 'Optional component missing' : 'Critical element missing from page DOM'}.</div>\`;
        } else if (c.status === 'Changed' && c.changes) {
          detailsContent = \`
            <div style="font-weight: 600; margin-bottom: 4px; color: var(--neon-orange);">Detected Changes:</div>
            <div class="diff-table">
              <div class="diff-row">
                <div class="diff-cell diff-hdr">Attribute</div>
                <div class="diff-cell diff-hdr">Baseline Value</div>
                <div class="diff-cell diff-hdr">Current Value</div>
              </div>
          \`;
          
          Object.keys(c.changes).forEach(attr => {
            const chg = c.changes[attr];
            detailsContent += \`
              <div class="diff-row">
                <div class="diff-cell" style="font-weight: 500;">\${attr}</div>
                <div class="diff-cell diff-old">\${escapeHtml(chg.old)}</div>
                <div class="diff-cell diff-new">\${escapeHtml(chg.new)}</div>
              </div>
            \`;
          });
          
          detailsContent += '</div>';
        }

        tr.innerHTML = \`
          <td>
            <div class="comp-name">\${c.name}</div>
            \${c.optional ? '<span style="font-size: 10px; color: var(--text-muted);">Optional</span>' : ''}
          </td>
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

    window.onload = init;
  </script>
</body>
</html>`;

      // Ensure folders exist
      const reportsDir = path.dirname(outputPath);
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
