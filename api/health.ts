/**
 * Enterprise Health Check API Endpoint
 *
 * Provides comprehensive health status for monitoring systems
 * and load balancers to ensure application availability.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  checks: {
    database: HealthCheck;
    external_apis: HealthCheck;
    memory: HealthCheck;
    performance: HealthCheck;
  };
  uptime: number;
  build_info: {
    commit: string;
    build_time: string;
    node_version: string;
  };
}

interface HealthCheck {
  status: 'pass' | 'fail' | 'warn';
  response_time?: number;
  details?: string;
  last_checked: string;
}

// Track service start time for uptime calculation
const startTime = Date.now();

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const startCheck = Date.now();

  try {
    // Perform all health checks
    const [
      databaseCheck,
      externalApiCheck,
      memoryCheck,
      performanceCheck
    ] = await Promise.allSettled([
      checkDatabase(),
      checkExternalAPIs(),
      checkMemoryUsage(),
      checkPerformance()
    ]);

    // Aggregate results
    const healthStatus: HealthStatus = {
      status: determineOverallStatus([
        databaseCheck,
        externalApiCheck,
        memoryCheck,
        performanceCheck
      ]),
      timestamp: new Date().toISOString(),
      version: process.env.VITE_APP_VERSION || 'unknown',
      environment: process.env.VERCEL_ENV || 'development',
      checks: {
        database: getCheckResult(databaseCheck),
        external_apis: getCheckResult(externalApiCheck),
        memory: getCheckResult(memoryCheck),
        performance: getCheckResult(performanceCheck)
      },
      uptime: Math.floor((Date.now() - startTime) / 1000),
      build_info: {
        commit: process.env.VITE_APP_VERSION || 'unknown',
        build_time: process.env.VITE_BUILD_TIME || 'unknown',
        node_version: process.version
      }
    };

    // Set appropriate HTTP status code
    const httpStatus = healthStatus.status === 'healthy' ? 200 :
                      healthStatus.status === 'degraded' ? 200 : 503;

    // Set response headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('X-Health-Check-Duration', `${Date.now() - startCheck}ms`);

    res.status(httpStatus).json(healthStatus);

  } catch (error) {
    console.error('Health check error:', error);

    // Return minimal error response
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check system failure',
      uptime: Math.floor((Date.now() - startTime) / 1000)
    });
  }
}

// Individual health check functions
async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    // Simple database connectivity test
    const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': process.env.VITE_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    const responseTime = Date.now() - start;

    if (response.ok) {
      return {
        status: responseTime > 2000 ? 'warn' : 'pass',
        response_time: responseTime,
        details: responseTime > 2000 ? 'Slow database response' : 'Database responsive',
        last_checked: new Date().toISOString()
      };
    } else {
      return {
        status: 'fail',
        response_time: responseTime,
        details: `Database returned HTTP ${response.status}`,
        last_checked: new Date().toISOString()
      };
    }
  } catch (error) {
    return {
      status: 'fail',
      response_time: Date.now() - start,
      details: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      last_checked: new Date().toISOString()
    };
  }
}

async function checkExternalAPIs(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    // Check critical external APIs
    const apiChecks = await Promise.allSettled([
      // Stripe API check
      fetch('https://api.stripe.com/v1', {
        method: 'HEAD',
        signal: AbortSignal.timeout(3000)
      }),
      // MapTiler API check
      fetch(`https://api.maptiler.com/maps/basic/style.json?key=${process.env.VITE_MAPTILER_API_KEY}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(3000)
      })
    ]);

    const responseTime = Date.now() - start;
    const failedChecks = apiChecks.filter(check => check.status === 'rejected').length;

    if (failedChecks === 0) {
      return {
        status: 'pass',
        response_time: responseTime,
        details: 'All external APIs responsive',
        last_checked: new Date().toISOString()
      };
    } else if (failedChecks < apiChecks.length) {
      return {
        status: 'warn',
        response_time: responseTime,
        details: `${failedChecks}/${apiChecks.length} external APIs failed`,
        last_checked: new Date().toISOString()
      };
    } else {
      return {
        status: 'fail',
        response_time: responseTime,
        details: 'All external APIs failed',
        last_checked: new Date().toISOString()
      };
    }
  } catch (error) {
    return {
      status: 'fail',
      response_time: Date.now() - start,
      details: `External API check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      last_checked: new Date().toISOString()
    };
  }
}

async function checkMemoryUsage(): Promise<HealthCheck> {
  try {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const usagePercentage = (heapUsedMB / heapTotalMB) * 100;

    let status: 'pass' | 'warn' | 'fail' = 'pass';
    let details = `Memory usage: ${heapUsedMB}MB/${heapTotalMB}MB (${Math.round(usagePercentage)}%)`;

    if (usagePercentage > 90) {
      status = 'fail';
      details += ' - Critical memory usage';
    } else if (usagePercentage > 75) {
      status = 'warn';
      details += ' - High memory usage';
    }

    return {
      status,
      details,
      last_checked: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'fail',
      details: `Memory check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      last_checked: new Date().toISOString()
    };
  }
}

async function checkPerformance(): Promise<HealthCheck> {
  const start = process.hrtime.bigint();

  try {
    // Perform a simple CPU-bound operation to test performance
    let result = 0;
    for (let i = 0; i < 100000; i++) {
      result += Math.sqrt(i);
    }

    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1000000; // Convert to milliseconds

    let status: 'pass' | 'warn' | 'fail' = 'pass';
    let details = `Performance test: ${durationMs.toFixed(2)}ms`;

    if (durationMs > 100) {
      status = 'fail';
      details += ' - Poor performance detected';
    } else if (durationMs > 50) {
      status = 'warn';
      details += ' - Degraded performance';
    }

    return {
      status,
      response_time: Math.round(durationMs),
      details,
      last_checked: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'fail',
      details: `Performance check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      last_checked: new Date().toISOString()
    };
  }
}

// Helper functions
function determineOverallStatus(checks: PromiseSettledResult<HealthCheck>[]): 'healthy' | 'degraded' | 'unhealthy' {
  const results = checks.map(check =>
    check.status === 'fulfilled' ? check.value.status : 'fail'
  );

  const failCount = results.filter(status => status === 'fail').length;
  const warnCount = results.filter(status => status === 'warn').length;

  if (failCount > 0) {
    return failCount >= results.length / 2 ? 'unhealthy' : 'degraded';
  } else if (warnCount > 0) {
    return 'degraded';
  } else {
    return 'healthy';
  }
}

function getCheckResult(check: PromiseSettledResult<HealthCheck>): HealthCheck {
  if (check.status === 'fulfilled') {
    return check.value;
  } else {
    return {
      status: 'fail',
      details: `Check failed: ${check.reason instanceof Error ? check.reason.message : 'Unknown error'}`,
      last_checked: new Date().toISOString()
    };
  }
}