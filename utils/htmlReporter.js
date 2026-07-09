const fs = require('fs-extra');
const path = require('path');

class HTMLReporter {
  static async generate(results, healthInfo, outputPath) {
    await fs.ensureDir(path.dirname(outputPath));

    // Construct JSON data string to embed in the script tag
    const embeddedData = JSON.stringify({ results, healthInfo }, null, 2);

    // Build the HTML template
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Website Health Check Dashboard</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Chart.js CDN -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <!-- Google Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Outfit', sans-serif;
      background-color: #0f172a;
      color: #f1f5f9;
    }
    .glass-card {
      background: rgba(30, 41, 59, 0.45);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px;
    }
    .score-glow {
      text-shadow: 0 0 20px rgba(56, 189, 248, 0.4);
    }
  </style>
</head>
<body class="p-6 md:p-10 min-h-screen">

  <div class="max-w-7xl mx-auto space-y-8">
    
    <!-- HEADER BAR -->
    <header class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-800">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <span>🛡️</span> Website Health Monitor
        </h1>
        <p class="text-slate-400 mt-1">Daily automated health, performance, SEO, accessibility & compliance audit.</p>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-sm bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 text-slate-300">
          Env: <strong class="text-white">${results.summary?.env || 'Production'}</strong>
        </span>
        <span class="text-sm bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 text-slate-300">
          Browser: <strong class="text-white">${results.summary?.browser || 'Chromium'}</strong>
        </span>
      </div>
    </header>

    <!-- KEY RESULTS DASHBOARD GRID -->
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      
      <!-- HEALTH SCORE CARD -->
      <div class="glass-card p-6 flex flex-col justify-between items-center text-center lg:col-span-1">
        <h2 class="text-slate-400 font-semibold text-sm uppercase tracking-wider">Overall Health</h2>
        
        <div class="my-6 relative flex items-center justify-center">
          <!-- Big circular indicator -->
          <div class="w-36 h-36 rounded-full border-8 flex items-center justify-center ${
            healthInfo.score >= 90 ? 'border-emerald-500/20' : (healthInfo.score >= 70 ? 'border-amber-500/20' : 'border-rose-500/20')
          }">
            <div class="text-4xl font-black score-glow ${
              healthInfo.score >= 90 ? 'text-emerald-400' : (healthInfo.score >= 70 ? 'text-amber-400' : 'text-rose-400')
            }">${healthInfo.score}%</div>
          </div>
        </div>

        <div>
          <span class="text-lg font-bold px-4 py-1.5 rounded-full ${
            healthInfo.score >= 90 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
            (healthInfo.score >= 70 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20')
          }">
            ${healthInfo.status}
          </span>
          <p class="text-xs text-slate-400 mt-3">Calculated out of 20 health checks</p>
        </div>
      </div>

      <!-- KPI STATS CARDS -->
      <div class="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-6">
        
        <!-- CARD 1 -->
        <div class="glass-card p-5 flex flex-col justify-between">
          <div>
            <div class="text-slate-400 text-sm font-semibold">URLs Swept</div>
            <div class="text-3xl font-bold mt-2 text-white">${results.checkedUrlsCount || 0}</div>
          </div>
          <p class="text-xs text-slate-500 mt-2">Critical user journeys tested</p>
        </div>

        <!-- CARD 2 -->
        <div class="glass-card p-5 flex flex-col justify-between">
          <div>
            <div class="text-slate-400 text-sm font-semibold">Broken Links</div>
            <div class="text-3xl font-bold mt-2 ${results.brokenLinks?.length > 0 ? 'text-rose-400' : 'text-emerald-400'}">
              ${results.brokenLinks?.length || 0}
            </div>
          </div>
          <p class="text-xs text-slate-500 mt-2">Failed internal & external links</p>
        </div>

        <!-- CARD 3 -->
        <div class="glass-card p-5 flex flex-col justify-between">
          <div>
            <div class="text-slate-400 text-sm font-semibold">Broken Images</div>
            <div class="text-3xl font-bold mt-2 ${results.brokenImages?.length > 0 ? 'text-rose-400' : 'text-emerald-400'}">
              ${results.brokenImages?.length || 0}
            </div>
          </div>
          <p class="text-xs text-slate-500 mt-2">Failed asset resource loads</p>
        </div>

        <!-- CARD 4 -->
        <div class="glass-card p-5 flex flex-col justify-between">
          <div>
            <div class="text-slate-400 text-sm font-semibold">Console Errors</div>
            <div class="text-3xl font-bold mt-2 ${results.consoleErrors?.length > 0 ? 'text-amber-400' : 'text-emerald-400'}">
              ${results.consoleErrors?.length || 0}
            </div>
          </div>
          <p class="text-xs text-slate-500 mt-2">Uncaught browser JS errors</p>
        </div>

        <!-- CARD 5 -->
        <div class="glass-card p-5 flex flex-col justify-between">
          <div>
            <div class="text-slate-400 text-sm font-semibold">API Latency Errors</div>
            <div class="text-3xl font-bold mt-2 ${results.apiErrors?.length > 0 ? 'text-rose-400' : 'text-emerald-400'}">
              ${results.apiErrors?.length || 0}
            </div>
          </div>
          <p class="text-xs text-slate-500 mt-2">API responses with status >= 400</p>
        </div>

        <!-- CARD 6 -->
        <div class="glass-card p-5 flex flex-col justify-between">
          <div>
            <div class="text-slate-400 text-sm font-semibold">Severity Gaps</div>
            <div class="text-sm font-semibold mt-2 text-white flex gap-2 flex-wrap">
              <span class="bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20">Crit: ${healthInfo.issuesCount.critical}</span>
              <span class="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">High: ${healthInfo.issuesCount.high}</span>
            </div>
          </div>
          <p class="text-xs text-slate-500 mt-2">Weight deductions applied</p>
        </div>

      </div>
    </div>

    <!-- VISUAL CHARTS -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      <!-- PIE CHART: PASS VS FAIL -->
      <div class="glass-card p-6">
        <h3 class="text-lg font-bold mb-4 text-white">Test Suite Pass/Fail Ratio</h3>
        <div class="h-64 relative flex items-center justify-center">
          <canvas id="passFailChart"></canvas>
        </div>
      </div>

      <!-- BAR CHART: ISSUE BREAKDOWN -->
      <div class="glass-card p-6">
        <h3 class="text-lg font-bold mb-4 text-white">Issues Severity Distribution</h3>
        <div class="h-64 relative flex items-center justify-center">
          <canvas id="severityChart"></canvas>
        </div>
      </div>
    </div>

    <!-- TABS CONTAINER FOR DETAIL SHEETS -->
    <div class="glass-card overflow-hidden">
      
      <!-- TAB NAVIGATION -->
      <nav class="flex flex-wrap border-b border-slate-800 bg-slate-900/50">
        <button onclick="switchTab(event, 'tab-broken-links')" class="tab-btn px-6 py-4 border-b-2 border-sky-500 text-sky-400 font-semibold text-sm focus:outline-none">🔗 Broken Links</button>
        <button onclick="switchTab(event, 'tab-broken-images')" class="tab-btn px-6 py-4 border-b-2 border-transparent text-slate-400 hover:text-white font-semibold text-sm focus:outline-none">🖼️ Broken Images</button>
        <button onclick="switchTab(event, 'tab-video')" class="tab-btn px-6 py-4 border-b-2 border-transparent text-slate-400 hover:text-white font-semibold text-sm focus:outline-none">📹 Video Issues</button>
        <button onclick="switchTab(event, 'tab-apis')" class="tab-btn px-6 py-4 border-b-2 border-transparent text-slate-400 hover:text-white font-semibold text-sm focus:outline-none">⚡ API Health</button>
        <button onclick="switchTab(event, 'tab-console')" class="tab-btn px-6 py-4 border-b-2 border-transparent text-slate-400 hover:text-white font-semibold text-sm focus:outline-none">💻 Console</button>
        <button onclick="switchTab(event, 'tab-perf')" class="tab-btn px-6 py-4 border-b-2 border-transparent text-slate-400 hover:text-white font-semibold text-sm focus:outline-none">⏱️ Performance</button>
      </nav>

      <!-- TAB CONTENTS -->
      <div class="p-6">
        
        <!-- BROKEN LINKS TAB -->
        <div id="tab-broken-links" class="tab-content block">
          <h4 class="text-lg font-bold mb-3 text-white">Scanned Broken Links</h4>
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm text-left text-slate-300">
              <thead class="bg-slate-850 text-slate-400 uppercase text-xs">
                <tr>
                  <th class="py-3 px-4">Source Page</th>
                  <th class="py-3 px-4">Broken URL</th>
                  <th class="py-3 px-4">HTTP Status</th>
                  <th class="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800">
                ${results.brokenLinks?.length > 0 ? 
                  results.brokenLinks.map(bl => `
                    <tr class="hover:bg-slate-800/40">
                      <td class="py-3 px-4 truncate max-w-xs" title="${bl.sourcePage}">${bl.sourcePage}</td>
                      <td class="py-3 px-4 text-sky-400 break-all"><a href="${bl.url}" target="_blank">${bl.url}</a></td>
                      <td class="py-3 px-4 font-mono text-rose-400 font-bold">${bl.status}</td>
                      <td class="py-3 px-4 text-xs text-slate-400">${bl.error || 'Broken Link'}</td>
                    </tr>
                  `).join('') : '<tr><td colspan="4" class="py-6 text-center text-slate-500">No broken links identified! 🎉</td></tr>'
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- BROKEN IMAGES TAB -->
        <div id="tab-broken-images" class="tab-content hidden">
          <h4 class="text-lg font-bold mb-3 text-white">Missing & Broken Images</h4>
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm text-left text-slate-300">
              <thead class="bg-slate-850 text-slate-400 uppercase text-xs">
                <tr>
                  <th class="py-3 px-4">Source Page</th>
                  <th class="py-3 px-4">Image URL</th>
                  <th class="py-3 px-4">Alt Status</th>
                  <th class="py-3 px-4">Dimensions</th>
                  <th class="py-3 px-4">Lazy Loading</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800">
                ${results.brokenImages?.length > 0 ? 
                  results.brokenImages.map(bi => `
                    <tr class="hover:bg-slate-800/40">
                      <td class="py-3 px-4 truncate max-w-xs" title="${bi.sourcePage}">${bi.sourcePage}</td>
                      <td class="py-3 px-4 text-sky-400 break-all"><a href="${bi.url}" target="_blank">${bi.url}</a></td>
                      <td class="py-3 px-4">
                        <span class="px-2 py-0.5 rounded text-xs ${bi.altAvailable ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}">
                          ${bi.altAvailable ? 'Alt Available' : 'No Alt'}
                        </span>
                      </td>
                      <td class="py-3 px-4 font-mono">${bi.dimensions}</td>
                      <td class="py-3 px-4 font-mono text-slate-400">${bi.isLazy ? 'Yes' : 'No'}</td>
                    </tr>
                  `).join('') : '<tr><td colspan="5" class="py-6 text-center text-slate-500">No broken images found! 🖼️</td></tr>'
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- VIDEO ISSUES TAB -->
        <div id="tab-video" class="tab-content hidden">
          <h4 class="text-lg font-bold mb-3 text-white">Product Videos Playback Audits</h4>
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm text-left text-slate-300">
              <thead class="bg-slate-850 text-slate-400 uppercase text-xs">
                <tr>
                  <th class="py-3 px-4">Product Name</th>
                  <th class="py-3 px-4">URL</th>
                  <th class="py-3 px-4">Player Visible</th>
                  <th class="py-3 px-4">Playback Status</th>
                  <th class="py-3 px-4">Failure Reason</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800">
                ${results.videoIssues?.length > 0 ? 
                  results.videoIssues.map(v => `
                    <tr class="hover:bg-slate-800/40">
                      <td class="py-3 px-4 font-bold text-white">${v.productName}</td>
                      <td class="py-3 px-4 text-sky-400 truncate max-w-xs"><a href="${v.productUrl}" target="_blank">${v.productUrl}</a></td>
                      <td class="py-3 px-4 font-mono">${v.playerOpened ? '🟢 Opened' : '🔴 Closed'}</td>
                      <td class="py-3 px-4 font-mono">
                        <span class="px-2 py-0.5 rounded text-xs ${v.videoLoaded ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}">
                          ${v.videoLoaded ? '🟢 Active Stream' : '🔴 Error'}
                        </span>
                      </td>
                      <td class="py-3 px-4 text-slate-400">${v.failureReason || '-'}</td>
                    </tr>
                  `).join('') : '<tr><td colspan="5" class="py-6 text-center text-slate-500">No video playback issues found! 📹</td></tr>'
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- API HEALTH TAB -->
        <div id="tab-apis" class="tab-content hidden">
          <h4 class="text-lg font-bold mb-3 text-white">Rest API Interceptions & Latency</h4>
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm text-left text-slate-300">
              <thead class="bg-slate-850 text-slate-400 uppercase text-xs">
                <tr>
                  <th class="py-3 px-4">Method</th>
                  <th class="py-3 px-4">Endpoint</th>
                  <th class="py-3 px-4">Status</th>
                  <th class="py-3 px-4">Latency (ms)</th>
                  <th class="py-3 px-4">Parent Page</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800">
                ${results.apiLogs?.length > 0 ? 
                  results.apiLogs.map(api => `
                    <tr class="hover:bg-slate-800/40">
                      <td class="py-3 px-4 font-mono font-bold text-white uppercase">${api.method}</td>
                      <td class="py-3 px-4 text-sky-400 truncate max-w-xs" title="${api.url}"><a href="${api.url}" target="_blank">${api.url}</a></td>
                      <td class="py-3 px-4 font-mono font-bold ${api.status >= 400 ? 'text-rose-400' : 'text-emerald-400'}">${api.status}</td>
                      <td class="py-3 px-4 font-mono">${api.responseTime} ms</td>
                      <td class="py-3 px-4 truncate max-w-xs text-slate-400" title="${api.pageUrl}">${api.pageUrl}</td>
                    </tr>
                  `).join('') : '<tr><td colspan="5" class="py-6 text-center text-slate-500">No API calls recorded!</td></tr>'
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- CONSOLE TAB -->
        <div id="tab-console" class="tab-content hidden">
          <h4 class="text-lg font-bold mb-3 text-white">Browser Console Logs & Unhandled Exceptions</h4>
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm text-left text-slate-300">
              <thead class="bg-slate-850 text-slate-400 uppercase text-xs">
                <tr>
                  <th class="py-3 px-4">Page</th>
                  <th class="py-3 px-4">Type</th>
                  <th class="py-3 px-4">Message</th>
                  <th class="py-3 px-4">Trace Location</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800">
                ${results.consoleErrors?.length > 0 ? 
                  results.consoleErrors.map(err => `
                    <tr class="hover:bg-slate-800/40">
                      <td class="py-3 px-4 truncate max-w-xs text-slate-400" title="${err.url}">${err.url}</td>
                      <td class="py-3 px-4">
                        <span class="px-2 py-0.5 rounded text-xs uppercase font-mono ${
                          err.type === 'exception' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 
                          (err.type === 'error' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-sky-500/10 text-sky-400')
                        }">
                          ${err.type}
                        </span>
                      </td>
                      <td class="py-3 px-4 text-xs font-mono break-all text-slate-200">${err.text}</td>
                      <td class="py-3 px-4 text-xs font-mono text-slate-500 break-all">${err.stack || err.location || '-'}</td>
                    </tr>
                  `).join('') : '<tr><td colspan="4" class="py-6 text-center text-slate-500">Console logs clean! 💻</td></tr>'
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- PERFORMANCE TAB -->
        <div id="tab-perf" class="tab-content hidden">
          <h4 class="text-lg font-bold mb-3 text-white">Page Response & Load Speeds</h4>
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm text-left text-slate-300">
              <thead class="bg-slate-850 text-slate-400 uppercase text-xs">
                <tr>
                  <th class="py-3 px-4">URL</th>
                  <th class="py-3 px-4">Load Time</th>
                  <th class="py-3 px-4">DOMContentLoaded</th>
                  <th class="py-3 px-4">First Contentful Paint (FCP)</th>
                  <th class="py-3 px-4">Largest Contentful Paint (LCP)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800">
                ${results.performance?.length > 0 ? 
                  results.performance.map(p => `
                    <tr class="hover:bg-slate-800/40">
                      <td class="py-3 px-4 truncate max-w-xs text-sky-400" title="${p.url}"><a href="${p.url}" target="_blank">${p.url}</a></td>
                      <td class="py-3 px-4 font-mono font-bold">${(p.pageLoadTime/1000).toFixed(2)} s</td>
                      <td class="py-3 px-4 font-mono">${(p.domContentLoaded/1000).toFixed(2)} s</td>
                      <td class="py-3 px-4 font-mono">${(p.fcp/1000).toFixed(2)} s</td>
                      <td class="py-3 px-4 font-mono">${(p.lcp/1000).toFixed(2)} s</td>
                    </tr>
                  `).join('') : '<tr><td colspan="5" class="py-6 text-center text-slate-500">No performance metrics recorded!</td></tr>'
                }
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>

    <!-- SCREENSHOT GALLERY (Only if failed tests exist) -->
    ${results.tests?.filter(t => t.status === 'failed' && t.screenshot).length > 0 ? `
    <div class="glass-card p-6">
      <h3 class="text-lg font-bold mb-4 text-white">Failed Test Screens</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        ${results.tests.filter(t => t.status === 'failed' && t.screenshot).map(t => `
          <div class="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex flex-col justify-between">
            <div class="p-4">
              <h4 class="font-semibold text-white truncate" title="${t.name}">${t.name}</h4>
              <p class="text-xs text-rose-400 mt-1 truncate" title="${t.error}">${t.error}</p>
            </div>
            <!-- Relative URL adjustments for reports/ relative to roots -->
            <img src="../${t.screenshot}" alt="Failure Screen" class="w-full h-40 object-cover cursor-pointer hover:opacity-85 transition-opacity" onclick="openScreenshotModal('../${t.screenshot}')">
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

  </div>

  <!-- SCREENSHOT MODAL -->
  <div id="screenshotModal" class="fixed inset-0 bg-black/85 backdrop-blur-sm hidden items-center justify-center z-50 p-6" onclick="closeScreenshotModal()">
    <div class="max-w-4xl max-h-full overflow-auto relative">
      <button class="absolute top-4 right-4 bg-slate-950 text-white rounded-full p-2 hover:bg-slate-900 border border-slate-700" onclick="closeScreenshotModal()">✖️</button>
      <img id="modalImg" class="rounded-lg shadow-2xl max-w-full max-h-[85vh] object-contain mx-auto" src="" alt="Screenshot Fullscreen">
    </div>
  </div>

  <script>
    // Embedded Audit Data
    const data = ${embeddedData};

    // Tab Switcher
    function switchTab(evt, tabId) {
      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      document.getElementById(tabId).classList.remove('hidden');
      
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('border-sky-500', 'text-sky-400');
        b.classList.add('border-transparent', 'text-slate-400');
      });
      
      evt.currentTarget.classList.remove('border-transparent', 'text-slate-400');
      evt.currentTarget.classList.add('border-sky-500', 'text-sky-400');
    }

    // Modal operations
    function openScreenshotModal(imgSrc) {
      document.getElementById('modalImg').src = imgSrc;
      document.getElementById('screenshotModal').classList.remove('hidden');
      document.getElementById('screenshotModal').classList.add('flex');
    }

    function closeScreenshotModal() {
      document.getElementById('screenshotModal').classList.add('hidden');
      document.getElementById('screenshotModal').classList.remove('flex');
    }

    // Chart.js render
    window.onload = function() {
      // 1. Pass/Fail ratio chart
      const passedCount = data.results.tests?.filter(t => t.status === 'passed').length || 0;
      const failedCount = data.results.tests?.filter(t => t.status === 'failed').length || 0;

      const pfCtx = document.getElementById('passFailChart').getContext('2d');
      new Chart(pfCtx, {
        type: 'pie',
        data: {
          labels: ['Passed', 'Failed'],
          datasets: [{
            data: [passedCount, failedCount],
            backgroundColor: ['#10b981', '#f43f5e'],
            borderWidth: 1,
            borderColor: '#1e293b'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#f1f5f9' },
              position: 'bottom'
            }
          }
        }
      });

      // 2. Issue Severity Distribution Chart
      const sevCtx = document.getElementById('severityChart').getContext('2d');
      new Chart(sevCtx, {
        type: 'bar',
        data: {
          labels: ['Critical', 'High', 'Medium', 'Low'],
          datasets: [{
            label: 'Issues Found',
            data: [
              data.healthInfo.issuesCount.critical,
              data.healthInfo.issuesCount.high,
              data.healthInfo.issuesCount.medium,
              data.healthInfo.issuesCount.low
            ],
            backgroundColor: ['#ec4899', '#f43f5e', '#f59e0b', '#38bdf8'],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              grid: { color: '#334155' },
              ticks: { color: '#cbd5e1' }
            },
            y: {
              grid: { color: '#334155' },
              ticks: { color: '#cbd5e1', stepSize: 1 }
            }
          }
        }
      });
    };
  </script>
</body>
</html>`;

    await fs.writeFile(outputPath, html, 'utf-8');
  }
}

module.exports = HTMLReporter;
