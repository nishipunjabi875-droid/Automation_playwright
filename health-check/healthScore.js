class HealthScore {
  static calculate(results) {
    let score = 100;
    const issues = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };

    // 1. SSL & Redirects & DNS
    if (results.availability) {
      const avail = results.availability;
      if (!avail.dnsReachable) {
        issues.critical.push({ page: 'DNS', msg: 'DNS is unreachable.', severity: 'CRITICAL' });
      }
      if (!avail.sslValid) {
        issues.critical.push({ page: 'SSL Certificate', msg: avail.sslError || 'SSL Certificate is invalid or expired.', severity: 'CRITICAL' });
      }
      if (avail.sslDetails && avail.sslDetails.daysRemaining < 7) {
        issues.high.push({ page: 'SSL Expiry', msg: `SSL Certificate expires in ${avail.sslDetails.daysRemaining} days.`, severity: 'HIGH' });
      }
      if (!avail.redirectsToHttps) {
        issues.medium.push({ page: 'Redirection', msg: 'HTTP does not redirect to HTTPS.', severity: 'MEDIUM' });
      }
    }

    // 2. Playwright Test Failures (Functional / Page loads)
    if (results.tests) {
      for (const t of results.tests) {
        if (t.status === 'failed') {
          // Determine if functional checkout/login or basic page
          const name = t.name.toLowerCase();
          const isCritical = name.includes('checkout') || name.includes('cart') || name.includes('login') || name.includes('availability') || name.includes('home page');
          if (isCritical) {
            issues.critical.push({ page: t.name, msg: t.error || 'Test failed.', severity: 'CRITICAL' });
          } else {
            issues.high.push({ page: t.name, msg: t.error || 'Test failed.', severity: 'HIGH' });
          }
        }
      }
    }

    // 3. Broken Links
    if (results.brokenLinks) {
      for (const link of results.brokenLinks) {
        const severity = link.status === 404 ? 'HIGH' : 'MEDIUM';
        const issueObj = { page: link.sourcePage, msg: `Broken Link: ${link.url} (Status: ${link.status})`, severity };
        if (severity === 'HIGH') {
          issues.high.push(issueObj);
        } else {
          issues.medium.push(issueObj);
        }
      }
    }

    // 4. Broken Images
    if (results.brokenImages) {
      for (const img of results.brokenImages) {
        issues.high.push({ page: img.sourcePage, msg: `Broken Image: ${img.url}`, severity: 'HIGH' });
      }
    }

    // 5. Video Issues
    if (results.videoIssues) {
      for (const v of results.videoIssues) {
        issues.high.push({ page: v.productUrl, msg: `Video Playback Failed: ${v.failureReason}`, severity: 'HIGH' });
      }
    }

    // 6. API Errors
    if (results.apiErrors) {
      for (const api of results.apiErrors) {
        const severity = api.status >= 500 ? 'HIGH' : 'MEDIUM';
        const issueObj = { page: api.pageUrl || 'Standalone API', msg: `API Failed: ${api.url} (Status: ${api.status})`, severity };
        if (severity === 'HIGH') {
          issues.high.push(issueObj);
        } else {
          issues.medium.push(issueObj);
        }
      }
    }

    // 7. Console Errors
    if (results.consoleErrors) {
      for (const err of results.consoleErrors) {
        const severity = err.type === 'exception' ? 'HIGH' : 'LOW';
        const issueObj = { page: err.url, msg: `Console ${err.type}: ${err.text}`, severity };
        if (severity === 'HIGH') {
          issues.high.push(issueObj);
        } else {
          issues.low.push(issueObj);
        }
      }
    }

    // 8. Network Request Errors (e.g. failed assets)
    if (results.networkErrors) {
      for (const net of results.networkErrors) {
        const severity = (net.resourceType === 'stylesheet' || net.resourceType === 'script') ? 'HIGH' : 'MEDIUM';
        const issueObj = { page: net.pageUrl, msg: `Network Fail: ${net.url} (${net.resourceType}) - ${net.errorText || net.status}`, severity };
        if (severity === 'HIGH') {
          issues.high.push(issueObj);
        } else {
          issues.medium.push(issueObj);
        }
      }
    }

    // 9. Performance Gaps
    if (results.performance) {
      for (const perf of results.performance) {
        if (perf.pageLoadTime > 6000) {
          issues.medium.push({ page: perf.url, msg: `Slow Page Load Time: ${(perf.pageLoadTime/1000).toFixed(2)}s (Target: <6s)`, severity: 'MEDIUM' });
        }
        if (perf.fcp > 3000) {
          issues.medium.push({ page: perf.url, msg: `Slow FCP: ${(perf.fcp/1000).toFixed(2)}s (Target: <3s)`, severity: 'MEDIUM' });
        }
        if (perf.lcp > 4000) {
          issues.medium.push({ page: perf.url, msg: `Slow LCP: ${(perf.lcp/1000).toFixed(2)}s (Target: <4s)`, severity: 'MEDIUM' });
        }
      }
    }

    // 10. Accessibility Violations
    if (results.accessibility) {
      for (const audit of results.accessibility) {
        if (audit && Array.isArray(audit.violations)) {
          for (const viol of audit.violations) {
            const severity = (viol.impact === 'critical' || viol.impact === 'serious') ? 'MEDIUM' : 'LOW';
            const issueObj = { page: audit.url, msg: `A11y Violation: ${viol.help} (${viol.id})`, severity };
            if (severity === 'MEDIUM') {
              issues.medium.push(issueObj);
            } else {
              issues.low.push(issueObj);
            }
          }
        }
      }
    }

    // 11. SEO & Security headers
    if (results.seo) {
      for (const s of results.seo) {
        if (!s.title) {
          issues.medium.push({ page: s.url, msg: 'SEO: Missing Page Title.', severity: 'MEDIUM' });
        }
        if (!s.description) {
          issues.medium.push({ page: s.url, msg: 'SEO: Missing Meta Description.', severity: 'MEDIUM' });
        }
        if (!s.canonicalUrl) {
          issues.medium.push({ page: s.url, msg: 'SEO: Missing Canonical URL.', severity: 'MEDIUM' });
        }
      }
    }

    if (results.security) {
      for (const sec of results.security) {
        if (!sec.isHttps) {
          issues.critical.push({ page: sec.url, msg: 'Security: Page is not running on HTTPS.', severity: 'CRITICAL' });
        }
        if (!sec.secureCookies) {
          issues.low.push({ page: sec.url, msg: 'Security: Session cookies missing Secure/HttpOnly flags.', severity: 'LOW' });
        }
        const h = sec.securityHeaders;
        if (!h.hsts || !h.csp || !h.xFrameOptions) {
          issues.low.push({ page: sec.url, msg: `Security: Missing security headers (${!h.hsts ? 'HSTS ' : ''}${!h.csp ? 'CSP ' : ''}${!h.xFrameOptions ? 'X-Frame-Options' : ''})`, severity: 'LOW' });
        }
      }
    }

    // Deduct points based on issue counts (deductions capped to keep score range 0-100)
    score -= (issues.critical.length * 15);
    score -= (issues.high.length * 5);
    score -= (issues.medium.length * 2);
    score -= (issues.low.length * 0.5);

    if (score < 0) score = 0;
    if (score > 100) score = 100;

    let status = '🟢 Healthy';
    if (score < 70) {
      status = '🔴 Unhealthy';
    } else if (score < 90) {
      status = '🟡 Warning';
    }

    return {
      score: parseFloat(score.toFixed(1)),
      status,
      issuesCount: {
        critical: issues.critical.length,
        high: issues.high.length,
        medium: issues.medium.length,
        low: issues.low.length,
        total: issues.critical.length + issues.high.length + issues.medium.length + issues.low.length
      },
      issues
    };
  }
}

module.exports = HealthScore;
