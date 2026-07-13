const { spawnSync } = require('child_process');

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const modeArg = args.find(arg => arg.startsWith('--mode='));
const mode = modeArg ? modeArg.split('=')[1] : 'compare'; // default to compare

const REPORTS_DIR = path.join(__dirname, '../../reports');
const SCREENSHOTS_DIR = path.join(REPORTS_DIR, 'screenshots');
const LAST_RUN_STATE_PATH = path.join(REPORTS_DIR, 'last_run_state.json');
const PREV_RUN_STATE_PATH = path.join(REPORTS_DIR, 'previous_run_state.json');
const LAST_RUN_META_PATH = path.join(REPORTS_DIR, 'last_run_meta.json');
const PREV_RUN_META_PATH = path.join(REPORTS_DIR, 'previous_run_meta.json');

// Archive previous run state if in compare mode
if (mode === 'compare' && fs.existsSync(LAST_RUN_STATE_PATH)) {
  console.log(`📦 Archiving previous run data...`);
  try {
    const stateData = fs.readFileSync(LAST_RUN_STATE_PATH, 'utf8');
    fs.writeFileSync(PREV_RUN_STATE_PATH, stateData, 'utf8');
    console.log(`   Saved previous run state to: ${PREV_RUN_STATE_PATH}`);

    if (fs.existsSync(LAST_RUN_META_PATH)) {
      fs.copyFileSync(LAST_RUN_META_PATH, PREV_RUN_META_PATH);
      console.log(`   Saved previous run metadata to: ${PREV_RUN_META_PATH}`);
    }

    const state = JSON.parse(stateData);
    Object.keys(state).forEach(viewId => {
      const currentScreenshot = path.join(SCREENSHOTS_DIR, `${viewId}_current.png`);
      const prevScreenshot = path.join(SCREENSHOTS_DIR, `${viewId}_previous.png`);
      if (fs.existsSync(currentScreenshot)) {
        fs.copyFileSync(currentScreenshot, prevScreenshot);
        console.log(`   Archived screenshot for view [${viewId}]: ${prevScreenshot}`);
      }
    });
  } catch (err) {
    console.error(`⚠️ Failed to archive previous run data:`, err);
  }
}

const extraArgs = [];
if (args.includes('--headed')) {
  extraArgs.push('--headed');
}

console.log(`=========================================`);
console.log(`🚀 COMPONENT AUDIT AUTOMATION LAUNCHER`);
console.log(`   Mode: ${mode.toUpperCase()}`);
console.log(`=========================================`);

// Spawn Playwright Test runner specs for Home Page, PDP, and Category Page
const result = spawnSync('npx', ['playwright', 'test', 'home-audit.spec.js', 'pdp-audit.spec.js', 'category-audit.spec.js', ...extraArgs], {
  stdio: 'inherit',
  shell: true,
  env: { 
    ...process.env, 
    MODE: mode 
  }
});

process.exit(result.status);
