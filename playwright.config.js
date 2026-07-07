const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  workers: 8,
  globalTeardown: require.resolve('./utils/teardown.js'),
  fullyParallel: true,
  use: {
    // Record video only on failure to optimize disk space and execution speed
    video: 'retain-on-failure',
    // Capture screenshot only on failure
    screenshot: 'only-on-failure',
  },
  // Use line reporter for cleaner console logs
  reporter: 'line',
  // Individual test timeout (includes page navigation & media metadata initialization)
  timeout: 50000,
});
