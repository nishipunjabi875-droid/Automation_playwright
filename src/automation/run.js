const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const modeArg = args.find(arg => arg.startsWith('--mode='));
const mode = modeArg ? modeArg.split('=')[1] : 'compare'; // default to compare

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
