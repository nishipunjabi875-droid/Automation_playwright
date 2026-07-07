const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const Reporter = require('./reporter');

// Parse CLI arguments
const args = process.argv.slice(2);
const modeArg = args.find(arg => arg.startsWith('--mode='));
const mode = modeArg ? modeArg.split('=')[1] : 'compare'; // default to compare

if (mode !== 'capture' && mode !== 'compare') {
  console.error('Invalid mode. Please use --mode=capture or --mode=compare');
  process.exit(1);
}

const BASELINE_PATH = path.join(__dirname, 'baseline.json');
const REPORTS_DIR = path.join(__dirname, '../../reports');
const SCREENSHOTS_DIR = path.join(REPORTS_DIR, 'screenshots');

// Ensure output directories exist
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

(async () => {
  console.log(`=========================================`);
  console.log(`🚀 COMPONENT AUDIT AUTOMATION RUNNER`);
  console.log(`   Mode: ${mode.toUpperCase()}`);
  console.log(`=========================================`);

  let baseline = {};
  if (mode === 'compare') {
    if (!fs.existsSync(BASELINE_PATH)) {
      console.error(`❌ Baseline file not found at ${BASELINE_PATH}.`);
      console.log(`👉 Please run capture mode first to establish baseline:`);
      console.log(`   npm run ui-audit:capture`);
      process.exit(1);
    }
    try {
      baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
      console.log(`Loaded reference baseline captured on: ${baseline.timestamp}`);
    } catch (e) {
      console.error('❌ Failed to parse baseline.json:', e);
      process.exit(1);
    }
  }

  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  // Create Context with a standard Desktop viewport & User Agent
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  // High timeouts for heavy e-commerce page loads
  page.setDefaultNavigationTimeout(45000);
  page.setDefaultTimeout(15000);

  const currentRunData = {
    timestamp: new Date().toLocaleString(),
    pages: {}
  };

  const pagesToAudit = config.pages;
  const pageIds = Object.keys(pagesToAudit);

  for (const pageId of pageIds) {
    const pageConfig = pagesToAudit[pageId];
    console.log(`\n-----------------------------------------`);
    console.log(`📖 Auditing: ${pageConfig.name} (${pageConfig.url})`);
    console.log(`-----------------------------------------`);

    // 1. Run Pre-Action if configured
    if (pageConfig.preAction) {
      try {
        await pageConfig.preAction(page);
      } catch (err) {
        console.error(`⚠️ Pre-action failed for page ${pageId}:`, err);
      }
    }

    // 2. Navigate to target URL
    try {
      console.log(`Navigating to URL: ${pageConfig.url}`);
      await page.goto(pageConfig.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      // Settle time for visual rendering & lazy layout adjustments
      console.log('Allowing page to settle (3s)...');
      await page.waitForTimeout(3000);
    } catch (err) {
      console.error(`❌ Failed to navigate to ${pageConfig.url}:`, err);
      continue;
    }

    const pageBaseline = baseline.pages ? baseline.pages[pageId] : null;
    const pageComponentsData = [];
    const highlightsToInject = [];

    // 3. Inspect each component defined in config
    for (const comp of pageConfig.components) {
      console.log(`Inspecting component [${comp.id}] "${comp.name}"...`);
      
      // Look up element
      const element = page.locator(comp.selector).first();
      const isPresent = await element.count() > 0 && await element.isVisible().catch(() => false);

      const baselineComp = pageBaseline ? pageBaseline.components.find(c => c.id === comp.id) : null;
      let status = 'Present';
      let changes = null;
      let rect = null;
      let attributes = {};

      if (isPresent) {
        // Get bounding box coordinates for highlighted screenshots
        rect = await element.boundingBox();

        // Extract required attributes
        for (const attr of comp.checkAttrs) {
          if (attr === 'innerText') {
            attributes[attr] = (await element.innerText()).trim();
          } else if (attr === 'classList') {
            attributes[attr] = await element.evaluate(el => Array.from(el.classList).join(' '));
          } else {
            attributes[attr] = await element.getAttribute(attr) || '';
          }
        }

        // Compare if in compare mode
        if (mode === 'compare') {
          if (baselineComp && baselineComp.present) {
            const currentChanges = {};
            let isChanged = false;

            for (const attr of comp.checkAttrs) {
              const oldVal = baselineComp.attributes[attr] || '';
              const newVal = attributes[attr] || '';
              
              if (oldVal !== newVal) {
                isChanged = true;
                currentChanges[attr] = { old: oldVal, new: newVal };
              }
            }

            if (isChanged) {
              status = 'Changed';
              changes = currentChanges;
              console.log(`   ⚠️ Changed detected!`, currentChanges);
            }
          } else {
            // Element is present now, but was missing or not present in baseline
            status = 'Present';
          }
        }
      } else {
        status = 'Missing';
        console.log(`   ❌ Component is MISSING!`);
      }

      // Save component details
      pageComponentsData.push({
        id: comp.id,
        name: comp.name,
        selector: comp.selector,
        optional: !!comp.optional,
        present: isPresent,
        attributes,
        rect,
        status,
        changes
      });

      // Prepare overlay highlighted data
      let overlayColor = '#10b981'; // Green (Present)
      if (status === 'Changed') overlayColor = '#f59e0b'; // Orange
      if (status === 'Missing') overlayColor = '#ef4444'; // Red

      // Highlight logic
      if (isPresent && rect) {
        highlightsToInject.push({
          name: comp.name,
          status,
          color: overlayColor,
          rect
        });
      } else if (status === 'Missing' && baselineComp && baselineComp.rect) {
        // Draw dotted outline where the element was previously located (using baseline rect)
        highlightsToInject.push({
          name: comp.name,
          status: 'Missing (was here)',
          color: '#ef4444',
          rect: baselineComp.rect,
          isDotted: true
        });
      }
    }

    // 4. Inject visual overlays in the page
    if (highlightsToInject.length > 0) {
      console.log(`Injecting visual highlight overlays (${highlightsToInject.length} overlays)...`);
      await page.evaluate((highlights) => {
        highlights.forEach(h => {
          if (!h.rect) return;
          const overlay = document.createElement('div');
          overlay.className = 'automation-highlight-overlay';
          overlay.style.position = 'absolute';
          overlay.style.top = (h.rect.y + window.scrollY) + 'px';
          overlay.style.left = (h.rect.x + window.scrollX) + 'px';
          overlay.style.width = h.rect.width + 'px';
          overlay.style.height = h.rect.height + 'px';
          
          if (h.isDotted) {
            overlay.style.border = `3px dotted ${h.color}`;
            overlay.style.background = 'rgba(239, 68, 68, 0.08)';
          } else {
            overlay.style.border = `3px solid ${h.color}`;
          }
          overlay.style.pointerEvents = 'none';
          overlay.style.zIndex = '100000';
          overlay.style.boxSizing = 'border-box';
          
          const label = document.createElement('span');
          label.innerText = `${h.name} [${h.status}]`;
          label.style.position = 'absolute';
          label.style.top = '-20px';
          label.style.left = '0';
          label.style.background = h.color;
          label.style.color = '#ffffff';
          label.style.fontSize = '11px';
          label.style.fontWeight = 'bold';
          label.style.padding = '2px 6px';
          label.style.whiteSpace = 'nowrap';
          label.style.borderRadius = '3px';
          
          overlay.appendChild(label);
          document.body.appendChild(overlay);
        });
      }, highlightsToInject);
    }

    // 5. Capture highlighted screenshot
    const screenshotName = `${pageId}.png`;
    const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotName);
    console.log(`Taking full-page screenshot...`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved to: ${screenshotPath}`);

    // Store in run data
    currentRunData.pages[pageId] = {
      name: pageConfig.name,
      url: pageConfig.url,
      screenshot: screenshotName,
      components: pageComponentsData
    };
  }

  await browser.close();

  // 6. Save or Report based on mode
  if (mode === 'capture') {
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(currentRunData, null, 2), 'utf8');
    console.log(`\n=========================================`);
    console.log(`✅ BASELINE CAPTURED SUCCESSFUL`);
    console.log(`   Baseline details written to: ${BASELINE_PATH}`);
    console.log(`   Baseline screenshots saved in: ${SCREENSHOTS_DIR}`);
    console.log(`=========================================`);
  } else {
    // Compare Mode
    const reportPath = path.join(REPORTS_DIR, 'dashboard.html');
    Reporter.generateReport(
      currentRunData.pages,
      baseline.timestamp,
      currentRunData.timestamp,
      reportPath
    );
    console.log(`\n=========================================`);
    console.log(`✅ AUDIT COMPARISON COMPLETE`);
    console.log(`   Dashboard report: ${reportPath}`);
    console.log(`   Screenshots saved in: ${SCREENSHOTS_DIR}`);
    console.log(`=========================================`);
  }
})();
