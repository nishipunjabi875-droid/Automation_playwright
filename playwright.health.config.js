const { defineConfig } = require('@playwright/test');
const config = require('./config/config');

module.exports = defineConfig({
  testDir: './tests',
  // Match only our new health check specs
  testMatch: [
    'health-check.spec.js',
    'security-accessibility.spec.js'
  ],
  workers: config.parallelWorkers || 4,
  fullyParallel: true,
  use: {
    // Retain video on failure for debugging broken layouts/flows
    video: 'retain-on-failure',
    // Capture screenshot on failure
    screenshot: 'only-on-failure',
  },
  reporter: [
    ['line'],
    ['json', { outputFile: process.env.PLAYWRIGHT_JSON_OUTPUT_NAME || 'reports/playwright-results.json' }]
  ],
  // Dynamic timeouts matching configuration
  timeout: config.timeout || 30000,
});
