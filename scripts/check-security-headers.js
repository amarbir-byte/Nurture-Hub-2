#!/usr/bin/env node

/**
 * Security Headers Validation Script
 *
 * Validates that all required security headers are properly configured
 * and meet enterprise security standards.
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

const REQUIRED_HEADERS = {
  'content-security-policy': {
    required: true,
    description: 'Content Security Policy to prevent XSS attacks',
    validate: (value) => {
      if (!value) return 'Missing CSP header';
      if (value.includes("'unsafe-inline'") && value.includes("'unsafe-eval'")) {
        return 'CSP is too permissive - both unsafe-inline and unsafe-eval are present';
      }
      if (value.includes("'unsafe-eval'")) {
        return 'CSP allows unsafe-eval which should be avoided';
      }
      return null;
    }
  },
  'strict-transport-security': {
    required: true,
    description: 'HSTS to enforce HTTPS connections',
    validate: (value) => {
      if (!value) return 'Missing HSTS header';
      if (!value.includes('max-age=')) return 'HSTS missing max-age directive';
      const maxAge = parseInt(value.match(/max-age=(\d+)/)?.[1] || '0');
      if (maxAge < 31536000) return 'HSTS max-age should be at least 1 year (31536000 seconds)';
      return null;
    }
  },
  'x-frame-options': {
    required: true,
    description: 'X-Frame-Options to prevent clickjacking',
    validate: (value) => {
      if (!value) return 'Missing X-Frame-Options header';
      if (!['DENY', 'SAMEORIGIN'].includes(value)) {
        return 'X-Frame-Options should be DENY or SAMEORIGIN';
      }
      return null;
    }
  },
  'x-content-type-options': {
    required: true,
    description: 'X-Content-Type-Options to prevent MIME sniffing',
    validate: (value) => {
      if (!value) return 'Missing X-Content-Type-Options header';
      if (value !== 'nosniff') return 'X-Content-Type-Options should be "nosniff"';
      return null;
    }
  },
  'referrer-policy': {
    required: true,
    description: 'Referrer Policy to control referrer information',
    validate: (value) => {
      if (!value) return 'Missing Referrer-Policy header';
      const validPolicies = [
        'no-referrer',
        'no-referrer-when-downgrade',
        'origin',
        'origin-when-cross-origin',
        'same-origin',
        'strict-origin',
        'strict-origin-when-cross-origin'
      ];
      if (!validPolicies.includes(value)) {
        return `Invalid Referrer-Policy. Should be one of: ${validPolicies.join(', ')}`;
      }
      return null;
    }
  },
  'permissions-policy': {
    required: false,
    description: 'Permissions Policy to control browser features',
    validate: (value) => {
      if (value && !value.includes('geolocation=')) {
        return 'Consider adding geolocation controls to Permissions-Policy';
      }
      return null;
    }
  }
};

const SECURITY_RECOMMENDATIONS = [
  'Ensure all API endpoints require authentication',
  'Use HTTPS for all communications',
  'Implement rate limiting on API endpoints',
  'Keep dependencies up to date',
  'Use environment variables for sensitive configuration',
  'Implement proper error handling without exposing internal details',
  'Use secure session management',
  'Implement CSRF protection for state-changing operations'
];

class SecurityHeadersChecker {
  constructor(url) {
    this.url = url;
    this.issues = [];
    this.warnings = [];
    this.passed = [];
  }

  async checkHeaders() {
    try {
      const headers = await this.fetchHeaders(this.url);
      console.log('\n🔒 Security Headers Analysis');
      console.log('=' .repeat(50));
      console.log(`Target URL: ${this.url}\n`);

      this.analyzeHeaders(headers);
      this.generateReport();

      return {
        passed: this.passed.length,
        issues: this.issues.length,
        warnings: this.warnings.length,
        score: this.calculateSecurityScore()
      };

    } catch (error) {
      console.error('❌ Failed to check security headers:', error.message);
      process.exit(1);
    }
  }

  async fetchHeaders(url) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'HEAD',
        timeout: 10000,
        headers: {
          'User-Agent': 'SecurityHeadersChecker/1.0'
        }
      };

      const req = client.request(options, (res) => {
        resolve(res.headers);
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  analyzeHeaders(headers) {
    console.log('📋 Header Analysis:\n');

    for (const [headerName, config] of Object.entries(REQUIRED_HEADERS)) {
      const headerValue = headers[headerName] || headers[headerName.toLowerCase()];

      if (!headerValue && config.required) {
        this.issues.push({
          type: 'missing',
          header: headerName,
          description: config.description,
          severity: 'high'
        });
        console.log(`❌ ${headerName}: Missing (Required)`);
        continue;
      }

      if (!headerValue && !config.required) {
        this.warnings.push({
          type: 'optional',
          header: headerName,
          description: config.description,
          severity: 'low'
        });
        console.log(`⚠️  ${headerName}: Missing (Optional)`);
        continue;
      }

      if (headerValue) {
        const validation = config.validate(headerValue);
        if (validation) {
          this.issues.push({
            type: 'invalid',
            header: headerName,
            description: validation,
            value: headerValue,
            severity: 'medium'
          });
          console.log(`❌ ${headerName}: ${validation}`);
          console.log(`   Current value: ${headerValue}`);
        } else {
          this.passed.push({
            header: headerName,
            value: headerValue,
            description: config.description
          });
          console.log(`✅ ${headerName}: Valid`);
        }
      }
    }
  }

  calculateSecurityScore() {
    const totalChecks = Object.keys(REQUIRED_HEADERS).length;
    const requiredChecks = Object.values(REQUIRED_HEADERS).filter(h => h.required).length;

    let score = 100;

    // Deduct points for issues
    this.issues.forEach(issue => {
      switch (issue.severity) {
        case 'high':
          score -= 20;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });

    // Deduct points for warnings
    this.warnings.forEach(warning => {
      score -= 3;
    });

    return Math.max(0, Math.min(100, score));
  }

  generateReport() {
    console.log('\n📊 Security Assessment Report');
    console.log('=' .repeat(50));

    const score = this.calculateSecurityScore();
    console.log(`Security Score: ${score}/100`);

    if (score >= 90) {
      console.log('🟢 Excellent - Security headers are well configured');
    } else if (score >= 75) {
      console.log('🟡 Good - Minor improvements needed');
    } else if (score >= 60) {
      console.log('🟠 Fair - Several security improvements required');
    } else {
      console.log('🔴 Poor - Significant security vulnerabilities detected');
    }

    console.log(`\n📈 Summary:`);
    console.log(`  ✅ Passed: ${this.passed.length}`);
    console.log(`  ❌ Issues: ${this.issues.length}`);
    console.log(`  ⚠️  Warnings: ${this.warnings.length}`);

    if (this.issues.length > 0) {
      console.log('\n🚨 Critical Issues to Fix:');
      this.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.header}: ${issue.description}`);
        if (issue.value) {
          console.log(`     Current: ${issue.value}`);
        }
      });
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Recommendations:');
      this.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. Consider adding ${warning.header}: ${warning.description}`);
      });
    }

    console.log('\n💡 General Security Recommendations:');
    SECURITY_RECOMMENDATIONS.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });

    console.log('\n🔗 References:');
    console.log('  • OWASP Secure Headers Project: https://owasp.org/www-project-secure-headers/');
    console.log('  • Mozilla Security Guidelines: https://infosec.mozilla.org/guidelines/web_security');
    console.log('  • Security Headers Test: https://securityheaders.com/');

    // Exit with error code if critical issues found
    if (this.issues.filter(i => i.severity === 'high').length > 0) {
      console.log('\n❌ Critical security issues detected. Fix these before deployment.');
      process.exit(1);
    }

    if (score < 75) {
      console.log('\n⚠️  Security score below recommended threshold (75). Consider improvements.');
      process.exit(1);
    }
  }
}

// CLI Usage
async function main() {
  const url = process.argv[2] || process.env.VERCEL_URL || process.env.VITE_APP_URL || 'http://localhost:5173';

  if (!url) {
    console.error('❌ No URL provided. Usage: node check-security-headers.js <url>');
    process.exit(1);
  }

  console.log('🔒 Enterprise Security Headers Checker');
  console.log('=====================================');
  console.log('Validating security headers for production deployment...\n');

  const checker = new SecurityHeadersChecker(url);
  const result = await checker.checkHeaders();

  console.log('\n✅ Security headers check completed.');
  console.log(`Score: ${result.score}/100 | Passed: ${result.passed} | Issues: ${result.issues} | Warnings: ${result.warnings}`);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Security check failed:', error);
    process.exit(1);
  });
}

module.exports = { SecurityHeadersChecker };