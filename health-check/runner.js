const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const config = require('../config/config');
const SSLValidator = require('../helpers/sslValidator');
const APIClient = require('../api/apiClient');
const HealthScore = require('./healthScore');
const ExcelReporter = require('../utils/excelReporter');
const HTMLReporter = require('../utils/htmlReporter');

async function run() {
  const startTime = Date.now();
  console.log('===================================================');
  console.log('🚀 Website Health Check Orchestration Runner Starting');
  console.log('===================================================');

  // 1. Ensure Directories Exist
  await fs.ensureDir(config.paths.reports);
  await fs.ensureDir(config.paths.screenshots);
  await fs.ensureDir(config.paths.logs);

  const progressFile = path.join(config.paths.reports, 'progress.json');
  let progress = { crawledUrls: [], testedProducts: [] };
  
  // Check if we are resuming from an interruption
  if (await fs.exists(progressFile)) {
    try {
      progress = await fs.readJson(progressFile);
      console.log(`🔄 Interrupted run detected. Resuming execution. Already processed URLs: ${progress.crawledUrls.length + progress.testedProducts.length}`);
    } catch (e) {
      console.log('⚠️ Failed to parse progress.json, starting fresh.');
    }
  }

  // Set up environmental hooks for dynamic test loading
  process.env.PLAYWRIGHT_PROGRESS_JSON = progressFile;

  // 2. Perform Standalone Availability Checks
  console.log('\n[1/4] Running Standalone Availability & SSL Audits...');
  const sslResults = await SSLValidator.checkDnsAndSsl(config.baseUrl);
  const redirectResults = await SSLValidator.checkRedirects(config.baseUrl);
  
  const availability = {
    dnsReachable: sslResults.dnsReachable,
    sslValid: sslResults.sslValid,
    sslDetails: sslResults.sslDetails,
    sslError: sslResults.error,
    redirectsToHttps: redirectResults.redirectedToHttps,
    finalUrl: redirectResults.finalUrl,
    redirectStatus: redirectResults.status,
    redirectError: redirectResults.error
  };
  
  console.log(`  -> DNS Reachable: ${availability.dnsReachable ? '🟢 YES' : '🔴 NO'}`);
  console.log(`  -> SSL Valid: ${availability.sslValid ? '🟢 YES' : '🔴 NO'}`);
  console.log(`  -> HTTPS Redirect: ${availability.redirectsToHttps ? '🟢 YES' : '🔴 NO'}`);

  // 3. Perform Standalone REST API Checks
  console.log('\n[2/4] Running Standalone Rest API Audits...');
  const apiClient = new APIClient(config.baseUrl);
  const standaloneApiLogs = await apiClient.validateAPIs();
  
  const apiErrors = standaloneApiLogs.filter(api => !api.success);
  console.log(`  -> Checked ${standaloneApiLogs.length} endpoints. Failed: ${apiErrors.length}`);

  // 4. Launch Playwright Automated UI / Functional Tests
  console.log('\n[3/4] Launching Playwright Automated Tests...');
  const playwrightJsonReport = path.join(config.paths.reports, 'playwright-results.json');
  
  const pwArgs = [
    'playwright',
    'test',
    '--config=playwright.health.config.js'
  ];
  
  // Set JSON report output filename
  process.env.PLAYWRIGHT_JSON_OUTPUT_NAME = playwrightJsonReport;

  const runPlaywright = () => {
    return new Promise((resolve) => {
      const isWindows = process.platform === 'win32';
      const shellCmd = isWindows ? 'npx.cmd' : 'npx';
      
      const child = spawn(shellCmd, pwArgs, {
        cwd: path.resolve(__dirname, '..'),
        env: { ...process.env, FORCE_COLOR: '1' },
        shell: true
      });

      child.stdout.on('data', (data) => {
        process.stdout.write(data.toString());
      });

      child.stderr.on('data', (data) => {
        process.stderr.write(data.toString());
      });

      child.on('close', (code) => {
        console.log(`\nPlaywright test process exited with code ${code}`);
        resolve();
      });
    });
  };

  await runPlaywright();

  // 5. Consolidated Data Compilation
  console.log('\n[4/4] Consolidating metrics & Generating Health Reports...');
  
  // Read playwrite test outcomes
  let testOutcomes = [];
  if (await fs.exists(playwrightJsonReport)) {
    try {
      const pwData = await fs.readJson(playwrightJsonReport);
      if (pwData.suites) {
        pwData.suites.forEach(suite => {
          suite.specs.forEach(spec => {
            spec.tests.forEach(test => {
              const result = test.results[0] || {};
              const screenshot = result.attachments?.find(a => a.name === 'screenshot')?.path;
              testOutcomes.push({
                name: spec.title,
                status: result.status,
                error: result.error?.message || '',
                duration: result.duration || 0,
                screenshot: screenshot ? path.relative(path.resolve(__dirname, '..'), screenshot).replace(/\\/g, '/') : ''
              });
            });
          });
        });
      }
    } catch (e) {
      console.log('⚠️ Failed to parse Playwright JSON report: ' + e.message);
    }
  }

  // Read intercepted page data from playwright execution by merging worker files
  const tempDir = path.join(config.paths.reports, 'health_temp');
  let runData = {
    consoleErrors: [],
    networkErrors: [],
    apiLogs: [],
    performance: [],
    seo: [],
    security: [],
    accessibility: [],
    brokenLinks: [],
    brokenImages: [],
    videoIssues: [],
    productValidations: [],
    checkedUrlsCount: 0
  };

  if (await fs.exists(tempDir)) {
    const files = await fs.readdir(tempDir);
    const uniqueUrls = new Set();
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await fs.readJson(path.join(tempDir, file));
          
          if (content.url) uniqueUrls.add(content.url);
          
          if (content.consoleErrors) runData.consoleErrors.push(...content.consoleErrors);
          if (content.networkErrors) runData.networkErrors.push(...content.networkErrors);
          if (content.apiLogs) runData.apiLogs.push(...content.apiLogs);
          if (content.performance) runData.performance.push(content.performance);
          if (content.seo) runData.seo.push(content.seo);
          if (content.security) runData.security.push(content.security);
          if (content.accessibility) runData.accessibility.push(...content.accessibility);
          if (content.brokenLinks) runData.brokenLinks.push(...content.brokenLinks);
          if (content.brokenImages) runData.brokenImages.push(...content.brokenImages);
          if (content.videoIssues) runData.videoIssues.push(...content.videoIssues);
          if (content.productValidations) runData.productValidations.push(...content.productValidations);
        } catch (e) {
          console.log(`⚠️ Error reading temp results file ${file}: ${e.message}`);
        }
      }
    }
    
    runData.checkedUrlsCount = uniqueUrls.size;
    
    // Write out consolidated run-data.json for persistence/debugging
    const interceptedDataFile = path.join(config.paths.reports, 'run-data.json');
    await fs.writeJson(interceptedDataFile, runData, { spaces: 2 });
    
    // Clean up temporary files
    await fs.emptyDir(tempDir);
    await fs.remove(tempDir);
  }

  // Combine API logs from standalone and playwright interceptions
  const allApiErrors = [
    ...apiErrors,
    ...runData.apiLogs.filter(api => api.status >= 400)
  ];

  const consolidatedResults = {
    summary: {
      startTime: new Date(startTime).toISOString(),
      endTime: new Date().toISOString(),
      duration: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
      browser: config.browserName,
      env: 'Production'
    },
    availability,
    tests: testOutcomes,
    checkedUrlsCount: runData.checkedUrlsCount,
    brokenLinks: runData.brokenLinks,
    brokenImages: runData.brokenImages,
    videoIssues: runData.videoIssues,
    apiLogs: [...standaloneApiLogs, ...runData.apiLogs],
    apiErrors: allApiErrors,
    consoleErrors: runData.consoleErrors,
    networkErrors: runData.networkErrors,
    performance: runData.performance,
    seo: runData.seo,
    security: runData.security,
    accessibility: runData.accessibility,
    productValidations: runData.productValidations
  };

  // Save compiled result database
  await fs.writeJson(path.join(config.paths.reports, 'results.json'), consolidatedResults, { spaces: 2 });

  // Calculate overall Health Score
  const healthInfo = HealthScore.calculate(consolidatedResults);
  
  console.log('\n===================================================');
  console.log(`📊 HEALTH ASSESSMENT COMPLETED`);
  console.log(`   Health Score: ${healthInfo.score}%`);
  console.log(`   Health Status: ${healthInfo.status}`);
  console.log(`   Critical Issues: ${healthInfo.issuesCount.critical}`);
  console.log(`   High Issues: ${healthInfo.issuesCount.high}`);
  console.log(`   Medium Issues: ${healthInfo.issuesCount.medium}`);
  console.log(`   Low Issues: ${healthInfo.issuesCount.low}`);
  console.log('===================================================');

  // Generate Reports
  let excelReportPath = path.join(config.paths.reports, 'health-check-report.xlsx');
  const htmlReportPath = path.join(config.paths.reports, 'dashboard.html');

  console.log(`\nWriting Excel report to: ${excelReportPath}`);
  try {
    await ExcelReporter.generate(consolidatedResults, healthInfo, excelReportPath);
  } catch (excelErr) {
    if (excelErr.code === 'EBUSY') {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      excelReportPath = excelReportPath.replace('.xlsx', `_backup_${timestamp}.xlsx`);
      console.warn(`\n[WARNING] Could not write to default report because it is open in Excel.`);
      console.warn(`[WARNING] Saving report backup to: ${excelReportPath}\n`);
      try {
        await ExcelReporter.generate(consolidatedResults, healthInfo, excelReportPath);
      } catch (backupErr) {
        console.error(`[ERROR] Failed to save backup Excel report: ${backupErr.message}`);
      }
    } else {
      console.error(`[ERROR] Failed to compile Excel report: ${excelErr.message}`);
    }
  }

  console.log(`Writing HTML Dashboard to: ${htmlReportPath}`);
  try {
    await HTMLReporter.generate(consolidatedResults, healthInfo, htmlReportPath);
  } catch (htmlErr) {
    console.error(`[ERROR] Failed to compile HTML report: ${htmlErr.message}`);
  }

  // Clear progress on successful run completion
  if (await fs.exists(progressFile)) {
    await fs.remove(progressFile);
  }

  console.log('\n🎉 Finished Health Check Process Successfully.');
}

run().catch(err => {
  console.error('❌ Critical failure in orchestrator runner: ', err);
});
