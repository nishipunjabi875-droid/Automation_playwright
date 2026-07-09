const { test, expect } = require('@playwright/test');
const fs = require('fs-extra');
const path = require('path');
const config = require('../config/config');
const BasePage = require('../pages/BasePage');

const DataReader = require('../utils/dataReader');

const productsData = DataReader.loadProductsSync(config.productSource);

async function saveTempResults(testName, basePage, customData = {}) {
  const tempDir = path.join(config.paths.reports, 'health_temp');
  await fs.ensureDir(tempDir);
  
  const timestamp = Date.now();
  const fileSafeName = testName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filePath = path.join(tempDir, `${fileSafeName}_${timestamp}.json`);
  
  const performance = await basePage.getPerformanceMetrics();
  const seo = await basePage.getSEOData();
  const security = await basePage.getSecurityChecks(customData.headers || {});
  
  const payload = {
    url: basePage.page.url(),
    consoleErrors: basePage.consoleErrors,
    networkErrors: basePage.networkErrors,
    apiLogs: basePage.apiLogs,
    performance,
    seo,
    security,
    accessibility: customData.accessibility || [],
    brokenLinks: [],
    brokenImages: [],
    videoIssues: []
  };
  
  await fs.writeJson(filePath, payload, { spaces: 2 });
}

test.use({ baseURL: config.baseUrl });

test.describe('Website Accessibility & Security Audit Suite', () => {

  // Setup request routing to optimize tests
  test.beforeEach(async ({ page }) => {
    await page.route('**/*', (route) => {
      const url = route.request().url();
      const shouldBlock = 
        url.includes('facebook.com') || 
        url.includes('doubleclick') ||
        url.includes('google-analytics') ||
        url.includes('googletagmanager');
      if (shouldBlock) {
        route.abort();
      } else {
        route.continue();
      }
    });
  });

  const auditPages = [
    { name: 'accessibility_home', path: '/' },
    { name: 'accessibility_category', path: '/sofa-sets' },
    { name: 'accessibility_product', path: productsData[0]?.path || '/product/auric-bar-cabinet-honey-finish' },
    { name: 'accessibility_cart', path: '/cart' }
  ];

  for (const item of auditPages) {
    test(`Accessibility & Security Audit: ${item.name}`, async ({ page }) => {
      console.log(`Running Accessibility & Security Audit on: ${item.path}`);
      const basePage = new BasePage(page);
      
      const navResult = await basePage.navigate(item.path);
      expect(navResult.status).toBe(200);

      // Execute standard Axe audit
      console.log(`  -> Injecting Axe and scanning elements...`);
      const violations = await basePage.runAccessibilityAudit();
      console.log(`  -> Found ${violations.length} accessibility violations.`);

      // Log violations to console for CI/CD logging
      if (violations.length > 0) {
        violations.forEach(v => {
          console.log(`     [${v.impact.toUpperCase()}] ${v.id}: ${v.description} (Affects ${v.nodes} elements)`);
        });
      }

      // Check for security headers and cookies
      const securityInfo = await basePage.getSecurityChecks(navResult.headers || {});
      console.log(`  -> HTTPS Active: ${securityInfo.isHttps}`);
      console.log(`  -> Secure Cookies: ${securityInfo.secureCookies}`);

      // Save
      await saveTempResults(item.name, basePage, {
        headers: navResult.headers,
        accessibility: [{
          url: page.url(),
          violations
        }]
      });
    });
  }

});
