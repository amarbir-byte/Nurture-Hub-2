/**
 * Lighthouse CI Configuration for Performance Monitoring
 *
 * This configuration ensures our application meets enterprise performance standards
 * and provides consistent performance monitoring across all deployments.
 */

module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:4173/',
        'http://localhost:4173/dashboard',
        'http://localhost:4173/properties',
        'http://localhost:4173/contacts'
      ],
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local:.*:(\\d+)',
      startServerReadyTimeout: 30000,
      numberOfRuns: 3,
      settings: {
        chromeFlags: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--headless'
        ],
        preset: 'desktop',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0
        },
        emulatedFormFactor: 'desktop',
        locale: 'en-US'
      }
    },
    assert: {
      assertions: {
        // Performance thresholds for enterprise applications
        'categories:performance': ['error', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.90 }],
        'categories:seo': ['error', { minScore: 0.85 }],
        'categories:pwa': ['warn', { minScore: 0.80 }],

        // Core Web Vitals - Enterprise Standards
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'first-meaningful-paint': ['warn', { maxNumericValue: 2000 }],
        'speed-index': ['warn', { maxNumericValue: 3000 }],
        'interactive': ['error', { maxNumericValue: 3500 }],
        'max-potential-fid': ['warn', { maxNumericValue: 100 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],

        // Resource optimization
        'unused-css-rules': ['warn', { maxLength: 5 }],
        'unused-javascript': ['warn', { maxLength: 5 }],
        'modern-image-formats': ['warn', { maxLength: 0 }],
        'offscreen-images': ['warn', { maxLength: 0 }],
        'render-blocking-resources': ['warn', { maxLength: 2 }],

        // Security and best practices
        'is-on-https': ['error', { minScore: 1 }],
        'uses-http2': ['warn', { minScore: 1 }],
        'no-vulnerable-libraries': ['error', { minScore: 1 }],
        'csp-xss': ['warn', { minScore: 1 }],

        // Accessibility requirements
        'color-contrast': ['error', { minScore: 1 }],
        'image-alt': ['error', { minScore: 1 }],
        'label': ['error', { minScore: 1 }],
        'tabindex': ['error', { minScore: 1 }],

        // SEO essentials
        'document-title': ['error', { minScore: 1 }],
        'meta-description': ['error', { minScore: 1 }],
        'viewport': ['error', { minScore: 1 }],

        // PWA capabilities
        'service-worker': ['warn', { minScore: 1 }],
        'works-offline': ['warn', { minScore: 1 }],
        'installable-manifest': ['warn', { minScore: 1 }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    },
    server: {
      port: 9001,
      storage: {
        storageMethod: 'sql',
        sqlDialect: 'sqlite',
        sqlConnectionSsl: false,
        sqlConnectionUrl: 'sqlite:lhci.db'
      }
    },
    wizard: {
      // Configuration for setting up Lighthouse CI
      storageMethod: 'temporary-public-storage'
    }
  },

  // Custom performance budgets for different page types
  budgets: [
    {
      // Main application pages
      path: '/',
      resourceSizes: [
        { resourceType: 'script', budget: 400 }, // 400KB for JS
        { resourceType: 'stylesheet', budget: 100 }, // 100KB for CSS
        { resourceType: 'image', budget: 500 }, // 500KB for images
        { resourceType: 'font', budget: 200 }, // 200KB for fonts
        { resourceType: 'total', budget: 1500 } // 1.5MB total
      ],
      resourceCounts: [
        { resourceType: 'script', budget: 10 },
        { resourceType: 'stylesheet', budget: 5 },
        { resourceType: 'image', budget: 20 },
        { resourceType: 'font', budget: 5 },
        { resourceType: 'third-party', budget: 5 }
      ]
    },
    {
      // Dashboard pages (can be slightly larger)
      path: '/dashboard',
      resourceSizes: [
        { resourceType: 'script', budget: 600 },
        { resourceType: 'stylesheet', budget: 150 },
        { resourceType: 'image', budget: 300 },
        { resourceType: 'total', budget: 2000 }
      ]
    }
  ],

  // Custom Lighthouse configuration
  extends: 'lighthouse:default',
  settings: {
    // Additional settings for enterprise monitoring
    auditMode: false,
    gatherMode: false,
    disableStorageReset: false,
    debugNavigation: false,
    channel: 'cli',
    budgets: null,
    locale: 'en-US',
    blockedUrlPatterns: [
      // Block analytics and tracking scripts during testing
      '**/google-analytics.com/**',
      '**/googletagmanager.com/**',
      '**/facebook.net/**',
      '**/analytics.google.com/**'
    ],
    skipAudits: [
      // Skip audits that might not be relevant for enterprise applications
      'notification-on-start',
      'payment-request'
    ],
    onlyAudits: null,
    onlyCategories: null,
    output: ['html', 'json'],
    port: 0,
    hostname: '127.0.0.1',
    maxWaitForLoad: 45000,
    maxWaitForFcp: 15000,
    pauseAfterFcpMs: 1000,
    pauseAfterLoadMs: 1000,
    networkQuietThresholdMs: 1000,
    cpuQuietThresholdMs: 1000
  },

  // Plugins for additional checks
  plugins: [
    // Add custom audits for enterprise requirements
    {
      name: 'enterprise-security-audit',
      audits: [
        {
          id: 'security-headers-check',
          title: 'Security Headers Present',
          description: 'Ensures all required security headers are present',
          requiredArtifacts: ['NetworkRecords'],
          scoreDisplayMode: 'binary'
        }
      ]
    }
  ]
};

// Environment-specific overrides
if (process.env.CI) {
  // CI-specific configuration
  module.exports.ci.collect.numberOfRuns = 1; // Faster CI builds
  module.exports.ci.collect.settings.chromeFlags.push('--disable-background-timer-throttling');
}

if (process.env.VERCEL_ENV === 'production') {
  // Production monitoring configuration
  module.exports.ci.collect.url = [
    'https://nurture-hub.vercel.app/',
    'https://nurture-hub.vercel.app/dashboard',
    'https://nurture-hub.vercel.app/properties',
    'https://nurture-hub.vercel.app/contacts'
  ];
  delete module.exports.ci.collect.startServerCommand;
  delete module.exports.ci.collect.startServerReadyPattern;
}