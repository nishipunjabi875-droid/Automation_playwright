# Website Health Check Automation Framework

A production-ready, modular, and highly scalable QA & Site Reliability Engineering (SRE) automation framework built using **Playwright**, **Node.js (JavaScript)**, and **ExcelJS**.

This framework automatically audits website health parameters, evaluates page performance, checks SEO/Accessibility compliance, intercept network assets/APIs, and crawls internal links for errors. It calculates an overall **Health Score %** and generates professional **HTML Dashboards** and **Multi-sheet Excel Workbooks** suitable for engineering, SRE, and product management reviews.

---

## Technical Features & Checks

The framework executes 20 core health checks grouped across 4 scopes:

### 1. Availability & Infrastructure
* **SSL Validation**: Verifies certificate validity, expiration dates, days remaining, and issuer details.
* **DNS Resolution**: Confirms that hostname DNS records are active and reachable.
* **Enforced Redirection**: Validates automatic redirection from HTTP to secure HTTPS.
* **Important Pages check**: Validates core routes (Home, Category, Collection, PDP, Cart) load with HTTP status 200 and are non-blank.

### 2. Network & Performance Interceptions
* **API Health Check**: Intercepts background fetch/XHR calls, tracking response times and flagging 4xx/5xx status codes.
* **Console Warnings & Exceptions**: Tracks uncaught browser exceptions, Javascript stack traces, and layout warnings.
* **Failed Asset Resolution**: Identifies broken images (broken sources or $0\times0$ natural dimensions), styles, fonts, and scripts.
* **Performance Web Vitals**: Measures Page Load Time, DOMContentLoaded, First Contentful Paint (FCP), and Largest Contentful Paint (LCP).

### 3. SEO & Accessibility Compliance
* **SEO Validations**: Verifies presence of `<title>`, `<meta name="description">`, `<link rel="canonical">`, `<meta name="robots">`, Open Graph tags, and heading hierachy (H1 count).
* **Accessibility Audits**: Performs audits on image alt tags, color contrast, input labels, ARIA roles, and keyboard navigation using `axe-playwright`.
* **Security Audits**: Audits Cookie secure/HttpOnly attributes and security headers (CSP, HSTS, X-Frame-Options).

### 4. Interactive UX Journeys
* **Dynamic Search audit**: Tests search speed, auto-suggestions visibility, and confirms empty results pages load when queried with bad data.
* **Video Playback Audit**: Identifies HTML5/YouTube embedded video players, clicks to play, verifies video metadata loads, and validates playback streams.
* **Smoke Flow journey**: Simulates complete end-to-end checkout (selecting variants, entering delivery pincodes, adding to cart, filling guest shipping forms, applying promo coupons, and loading the payment page).

---

## Folder Structure

```
├── config/
│   └── config.js              # Environment settings wrapper
├── test-data/
│   ├── pages.json             # Key audit routes config
│   ├── products.json          # Target products metadata
│   └── searches.json          # Search terms and expect criteria
├── pages/
│   ├── BasePage.js            # Base POM class: hooks events, parses SEO/performance
│   ├── LoginPage.js           # POM: authentications
│   ├── ProductPage.js         # POM: PDP elements, pincode, variants & video playing checks
│   ├── CartPage.js            # POM: Cart quantity operations
│   └── CheckoutPage.js        # POM: shipping fields, coupon apply & payment verify
├── helpers/
│   ├── sslValidator.js        # Standalone tls/dns/redirect helper
│   └── crawler.js             # High-concurrency Axios link checking pool
├── api/
│   └── apiClient.js           # Standalone SRE REST API validator
├── health-check/
│   ├── runner.js              # Core framework orchestrator script
│   └── healthScore.js         # Score logic & issue severity categorizer
├── utils/
│   ├── logger.js              # Logger outputs
│   ├── excelReporter.js       # ExcelJS multi-sheet workbook compiler
│   └── htmlReporter.js        # Glassmorphism HTML tailwind dashboard generator
├── tests/
│   ├── health-check.spec.js   # Dynamic Playwright spec (pages, PDP, video, search, smoke)
│   └── security-accessibility.spec.js # Spec: accessibility & security headers
├── screenshots/               # Folder for failure captures
├── reports/                   # Consolidated report files (HTML/Excel/JSON)
├── playwright.health.config.js # Custom configuration file for our framework
├── .env                       # Environment credentials
├── package.json               # Dependencies and runner commands
└── README.md                  # This documentation
```

---

## Installation & Setup

1. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

2. **Download Playwright browser binaries**:
   ```bash
   npx playwright install chromium
   ```

3. **Configure Environment variables** by editing the `.env` file in the project root:
   ```env
   BASE_URL=https://www.woodenstreet.com
   HEADLESS=true
   BROWSER=chromium
   TIMEOUT=30000
   PARALLEL_WORKERS=4
   MAX_CRAWL_PAGES=50
   LOGIN_USER=test_user@woodenstreet.com
   LOGIN_PASS=TestPassword123
   ```

---

## Execution Commands

### 1. Run Complete Health Audit
Triggers SRE infrastructure checks, API audits, runs Playwright browser specs in parallel, and compiles HTML/Excel dashboards:
```bash
node health-check/runner.js
```

### 2. Resume Interrupted Runs
If a run crashes or gets cancelled midway, the orchestrator automatically tracks progress in `reports/progress.json`. Subsequent runs will resume exactly from where they were interrupted, skipping already processed URLs.

### 3. Run Playwright Tests Independently
If you wish to debug tests or run them in headed UI mode:
```bash
# Run all tests using health config
npx playwright test --config=playwright.health.config.js --headed

# Run a specific spec
npx playwright test tests/health-check.spec.js --config=playwright.health.config.js
```

---

## Report Formats

* **Excel Workbook (`reports/health-check-report.xlsx`)**: Structured spreadsheet formatted with Navy-Blue theme headers containing sheets: *Summary, Broken Links, Broken Images, Video Issues, API Errors, Console Errors, Network Errors, Performance, Product Validation, Failed Tests, and Execution Summary*.
* **HTML Dashboard (`reports/dashboard.html`)**: Stunning Tailwind-styled dashboard showing Health Score ring, interactive Pass/Fail and Severity distribution charts, collapsible detailed data tables, and modal screenshot galleries for failure inspections.

---

## CI/CD Integrations

### GitHub Actions Workflow (`.github/workflows/health-check.yml`)

```yaml
name: Daily Website Health Check

on:
  schedule:
    - cron: '0 5 * * *' # Every day at 05:00 UTC
  workflow_dispatch:

jobs:
  health-audit:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install chromium --with-deps

      - name: Run Health Audit Orchestrator
        run: node health-check/runner.js
        env:
          BASE_URL: https://www.woodenstreet.com
          HEADLESS: true
          PARALLEL_WORKERS: 4
          MAX_CRAWL_PAGES: 100

      - name: Upload Report Artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: Health-Reports
          path: |
            reports/dashboard.html
            reports/health-check-report.xlsx
            reports/results.json
            screenshots/
```

### Jenkins Pipeline Blueprint (`Jenkinsfile`)

```groovy
pipeline {
    agent any
    triggers {
        cron('H 5 * * *') // Run daily in the morning
    }
    environment {
        BASE_URL = 'https://www.woodenstreet.com'
        HEADLESS = 'true'
        PARALLEL_WORKERS = '4'
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        stage('Install Dependencies') {
            steps {
                bat 'npm ci'
                bat 'npx playwright install chromium --with-deps'
            }
        }
        stage('Run Audits') {
            steps {
                bat 'node health-check/runner.js'
            }
        }
    }
    post {
        always {
            archiveArtifacts artifacts: 'reports/**/*, screenshots/**/*', fingerprint: true
            publishHTML (target: [
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'reports',
                reportFiles: 'dashboard.html',
                reportName: 'Website Health Dashboard'
            ])
        }
    }
}
```
