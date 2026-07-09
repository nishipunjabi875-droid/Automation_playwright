require('dotenv').config();
const path = require('path');

const config = {
  baseUrl: process.env.BASE_URL || 'https://www.woodenstreet.com',
  headless: process.env.HEADLESS === 'true' || process.env.HEADLESS === undefined,
  browserName: process.env.BROWSER || 'chromium',
  timeout: parseInt(process.env.TIMEOUT, 10) || 30000,
  parallelWorkers: parseInt(process.env.PARALLEL_WORKERS, 10) || 4,
  maxCrawlPages: parseInt(process.env.MAX_CRAWL_PAGES, 10) || 50,
  auth: {
    user: process.env.LOGIN_USER || 'test_user@woodenstreet.com',
    pass: process.env.LOGIN_PASS || 'TestPassword123',
  },
  productSource: process.env.PRODUCT_DATA_SOURCE || 'test-data/products.json',
  pageSource: process.env.PAGE_DATA_SOURCE || 'test-data/pages.json',
  paths: {
    reports: path.resolve(__dirname, '../reports'),
    screenshots: path.resolve(__dirname, '../screenshots'),
    logs: path.resolve(__dirname, '../logs'),
    testData: path.resolve(__dirname, '../test-data'),
  }
};

module.exports = config;
