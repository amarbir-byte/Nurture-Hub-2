/**
 * Consolidated Monitoring Cron Job
 *
 * Combines health checking and performance metrics collection
 * Runs every 15 minutes to perform:
 * - System health monitoring and alerting
 * - Performance metrics collection and analysis
 * - Service availability checks
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface HealthMetric {
  name: string;
  value: number;
  threshold: number;
  status: 'ok' | 'warning' | 'critical';
  timestamp: string;
}

interface PerformanceMetric {
  timestamp: string;
  endpoint: string;
  responseTime: number;
  statusCode: number;
  memoryUsage: number;
  cpuUsage: number;
  errorRate: number;
  throughput: number;
}

interface SystemMetrics {
  uptime: number;
  memoryUtilization: number;
  cpuUtilization: number;
  diskUsage: number;
  activeConnections: number;
  requestsPerMinute: number;
  averageResponseTime: number;
  errorRate: number;
}

interface MonitoringResult {
  health: {
    metrics: HealthMetric[];
    overall_status: 'healthy' | 'warning' | 'critical';
    critical_issues: number;
    warnings: number;
  };
  performance: {
    endpoint_metrics: PerformanceMetric[];
    system_metrics: SystemMetrics;
    average_response_time: number;
    error_rate: number;
  };
  timestamp: string;
  duration_ms: number;
}

const PERFORMANCE_ENDPOINTS = [
  '/api/health',
  '/api/properties',
  '/api/contacts',
  '/api/campaigns',
  '/api/billing'
];

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Verify this is a cron request
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const startTime = Date.now();
  console.log('📊 Starting monitoring tasks (health + performance)...');

  try {
    // Collect health metrics
    console.log('🔍 Collecting health metrics...');
    const healthMetrics = await collectHealthMetrics();
    const criticalIssues = healthMetrics.filter(m => m.status === 'critical');
    const warnings = healthMetrics.filter(m => m.status === 'warning');

    // Collect performance metrics
    console.log('⚡ Collecting performance metrics...');
    const endpointMetrics = await collectEndpointMetrics();
    const systemMetrics = await collectSystemMetrics();

    // Calculate performance summary
    const avgResponseTime = endpointMetrics.length > 0
      ? endpointMetrics.reduce((acc, m) => acc + m.responseTime, 0) / endpointMetrics.length
      : 0;
    const errorRate = endpointMetrics.length > 0
      ? endpointMetrics.filter(m => m.errorRate > 0).length / endpointMetrics.length * 100
      : 0;

    const monitoringResult: MonitoringResult = {
      health: {
        metrics: healthMetrics,
        overall_status: criticalIssues.length > 0 ? 'critical' : warnings.length > 0 ? 'warning' : 'healthy',
        critical_issues: criticalIssues.length,
        warnings: warnings.length
      },
      performance: {
        endpoint_metrics: endpointMetrics,
        system_metrics: systemMetrics,
        average_response_time: avgResponseTime,
        error_rate: errorRate
      },
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime
    };

    // Send health alerts if needed
    if (criticalIssues.length > 0) {
      await sendCriticalHealthAlert(criticalIssues);
    }
    if (warnings.length > 0) {
      await sendWarningHealthAlert(warnings);
    }

    // Send performance alerts if needed
    if (avgResponseTime > 2000 || errorRate > 10 || systemMetrics.memoryUtilization > 90) {
      await sendPerformanceAlert({
        avgResponseTime,
        errorRate,
        memoryUtilization: systemMetrics.memoryUtilization,
        timestamp: new Date().toISOString()
      });
    }

    // Store all metrics
    await storeMonitoringMetrics(monitoringResult);

    // Generate combined report
    const report = generateMonitoringReport(monitoringResult);

    console.log(`✅ Monitoring completed: ${healthMetrics.length} health metrics, ${endpointMetrics.length} performance metrics`);
    console.log(`📊 Health: ${monitoringResult.health.overall_status}, Performance: ${avgResponseTime.toFixed(0)}ms avg`);

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        health_status: monitoringResult.health.overall_status,
        metrics_collected: healthMetrics.length + endpointMetrics.length,
        critical_issues: criticalIssues.length,
        warnings: warnings.length,
        average_response_time: Math.round(avgResponseTime),
        error_rate: Math.round(errorRate * 100) / 100,
        duration_ms: Date.now() - startTime
      },
      monitoring_result: monitoringResult,
      report
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Monitoring cron job failed:', errorMessage);

    await sendSystemAlert('Monitoring System Failure', {
      error: errorMessage,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime
    });

    res.status(500).json({
      success: false,
      error: 'Monitoring job failed',
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}

// =============================================================================
// HEALTH MONITORING IMPLEMENTATIONS
// =============================================================================

async function collectHealthMetrics(): Promise<HealthMetric[]> {
  const metrics: HealthMetric[] = [];
  const timestamp = new Date().toISOString();

  try {
    // 1. Application Response Time
    const appResponseTime = await measureApplicationResponseTime();
    metrics.push({
      name: 'application_response_time',
      value: appResponseTime,
      threshold: 3000,
      status: appResponseTime > 5000 ? 'critical' : appResponseTime > 3000 ? 'warning' : 'ok',
      timestamp
    });

    // 2. Database Response Time
    const dbResponseTime = await measureDatabaseResponseTime();
    metrics.push({
      name: 'database_response_time',
      value: dbResponseTime,
      threshold: 2000,
      status: dbResponseTime > 5000 ? 'critical' : dbResponseTime > 2000 ? 'warning' : 'ok',
      timestamp
    });

    // 3. External API Health
    const externalApiStatus = await checkExternalAPIsHealth();
    metrics.push({
      name: 'external_apis_available',
      value: externalApiStatus.availableCount,
      threshold: externalApiStatus.totalCount * 0.8,
      status: externalApiStatus.availableCount < externalApiStatus.totalCount * 0.5 ? 'critical' :
              externalApiStatus.availableCount < externalApiStatus.totalCount * 0.8 ? 'warning' : 'ok',
      timestamp
    });

    // 4. Error Rate
    const errorRate = await getErrorRate();
    metrics.push({
      name: 'error_rate_percentage',
      value: errorRate,
      threshold: 5,
      status: errorRate > 10 ? 'critical' : errorRate > 5 ? 'warning' : 'ok',
      timestamp
    });

    // 5. Memory Usage
    const memoryUsage = getMemoryUsage();
    if (memoryUsage !== null) {
      metrics.push({
        name: 'memory_usage_percentage',
        value: memoryUsage,
        threshold: 80,
        status: memoryUsage > 95 ? 'critical' : memoryUsage > 80 ? 'warning' : 'ok',
        timestamp
      });
    }

  } catch (error) {
    console.error('Error collecting health metrics:', error);
    metrics.push({
      name: 'metrics_collection_errors',
      value: 1,
      threshold: 0,
      status: 'critical',
      timestamp
    });
  }

  return metrics;
}

async function measureApplicationResponseTime(): Promise<number> {
  const start = Date.now();
  try {
    const response = await fetch(`${process.env.VERCEL_URL || 'https://nurture-hub-2.vercel.app'}`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return Date.now() - start;
  } catch (error) {
    console.error('Application response time check failed:', error);
    return 10000;
  }
}

async function measureDatabaseResponseTime(): Promise<number> {
  const start = Date.now();
  try {
    const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': process.env.VITE_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
      },
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return Date.now() - start;
  } catch (error) {
    console.error('Database response time check failed:', error);
    return 5000;
  }
}

async function checkExternalAPIsHealth(): Promise<{ availableCount: number; totalCount: number }> {
  const apis = [
    'https://api.stripe.com/v1',
    `https://api.maptiler.com/maps/basic/style.json?key=${process.env.VITE_MAPTILER_API_KEY}`,
    'https://data.linz.govt.nz'
  ];

  const results = await Promise.allSettled(
    apis.map(url =>
      fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3000) })
    )
  );

  const availableCount = results.filter(result =>
    result.status === 'fulfilled' && result.value.ok
  ).length;

  return { availableCount, totalCount: apis.length };
}

async function getErrorRate(): Promise<number> {
  // Simulate error rate (in production, query your monitoring system)
  return Math.random() * 3; // 0-3%
}

function getMemoryUsage(): number | null {
  try {
    const usage = process.memoryUsage();
    return Math.round((usage.heapUsed / usage.heapTotal) * 100);
  } catch (error) {
    return null;
  }
}

// =============================================================================
// PERFORMANCE MONITORING IMPLEMENTATIONS
// =============================================================================

async function collectEndpointMetrics(): Promise<PerformanceMetric[]> {
  const results: PerformanceMetric[] = [];

  for (const endpoint of PERFORMANCE_ENDPOINTS) {
    try {
      const startTime = Date.now();
      const response = await fetch(`${process.env.VERCEL_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Performance-Monitor/1.0',
          'Authorization': `Bearer ${process.env.MONITORING_TOKEN}`
        },
        signal: AbortSignal.timeout(10000)
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      results.push({
        timestamp: new Date().toISOString(),
        endpoint,
        responseTime,
        statusCode: response.status,
        memoryUsage: process.memoryUsage().heapUsed,
        cpuUsage: process.cpuUsage().user,
        errorRate: response.status >= 400 ? 1 : 0,
        throughput: 1000 / responseTime
      });

    } catch (error) {
      console.error(`Failed to collect metrics for ${endpoint}:`, error);
      results.push({
        timestamp: new Date().toISOString(),
        endpoint,
        responseTime: 0,
        statusCode: 0,
        memoryUsage: process.memoryUsage().heapUsed,
        cpuUsage: process.cpuUsage().user,
        errorRate: 1,
        throughput: 0
      });
    }
  }

  return results;
}

async function collectSystemMetrics(): Promise<SystemMetrics> {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  return {
    uptime: process.uptime(),
    memoryUtilization: (memUsage.heapUsed / memUsage.heapTotal) * 100,
    cpuUtilization: (cpuUsage.user + cpuUsage.system) / 1000000,
    diskUsage: 0,
    activeConnections: 0,
    requestsPerMinute: 0,
    averageResponseTime: 0,
    errorRate: 0
  };
}

// =============================================================================
// ALERT FUNCTIONS
// =============================================================================

async function sendCriticalHealthAlert(issues: HealthMetric[]): Promise<void> {
  const alertMessage = `🚨 CRITICAL HEALTH ALERT: ${issues.length} critical issue(s) detected:

${issues.map(issue => `- ${issue.name}: ${issue.value} (threshold: ${issue.threshold})`).join('\n')}

Immediate investigation required!
Time: ${new Date().toISOString()}`;

  console.error(alertMessage);

  try {
    if (process.env.CRITICAL_ALERT_WEBHOOK) {
      await fetch(process.env.CRITICAL_ALERT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: alertMessage,
          severity: 'critical',
          timestamp: new Date().toISOString()
        })
      });
    }
  } catch (error) {
    console.error('Failed to send critical health alert:', error);
  }
}

async function sendWarningHealthAlert(warnings: HealthMetric[]): Promise<void> {
  const alertMessage = `⚠️ HEALTH WARNING: ${warnings.length} warning(s) detected:

${warnings.map(w => `- ${w.name}: ${w.value} (threshold: ${w.threshold})`).join('\n')}

Please investigate when convenient.
Time: ${new Date().toISOString()}`;

  console.warn(alertMessage);

  try {
    if (process.env.WARNING_ALERT_WEBHOOK) {
      await fetch(process.env.WARNING_ALERT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: alertMessage,
          severity: 'warning',
          timestamp: new Date().toISOString()
        })
      });
    }
  } catch (error) {
    console.error('Failed to send warning health alert:', error);
  }
}

async function sendPerformanceAlert(data: any): Promise<void> {
  const alertMessage = `🚨 PERFORMANCE ALERT:
- Average Response Time: ${data.avgResponseTime.toFixed(2)}ms
- Error Rate: ${data.errorRate.toFixed(2)}%
- Memory Utilization: ${data.memoryUtilization.toFixed(2)}%

Time: ${data.timestamp}`;

  console.error(alertMessage);

  try {
    if (process.env.PERFORMANCE_ALERT_WEBHOOK) {
      await fetch(process.env.PERFORMANCE_ALERT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: alertMessage,
          severity: 'performance',
          timestamp: new Date().toISOString()
        })
      });
    }
  } catch (error) {
    console.error('Failed to send performance alert:', error);
  }
}

async function sendSystemAlert(title: string, details: Record<string, any>): Promise<void> {
  const alertMessage = `🔥 SYSTEM ALERT: ${title}

Details: ${JSON.stringify(details, null, 2)}

Time: ${new Date().toISOString()}`;

  console.error(alertMessage);

  try {
    if (process.env.SYSTEM_ALERT_WEBHOOK) {
      await fetch(process.env.SYSTEM_ALERT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: alertMessage,
          severity: 'system',
          timestamp: new Date().toISOString()
        })
      });
    }
  } catch (error) {
    console.error('Failed to send system alert:', error);
  }
}

// =============================================================================
// STORAGE AND REPORTING
// =============================================================================

async function storeMonitoringMetrics(result: MonitoringResult): Promise<void> {
  try {
    console.log('📊 Storing monitoring metrics...');

    if (process.env.METRICS_ENDPOINT) {
      await fetch(process.env.METRICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'monitoring_metrics',
          ...result
        })
      });
    }
  } catch (error) {
    console.error('Failed to store monitoring metrics:', error);
  }
}

function generateMonitoringReport(result: MonitoringResult): string {
  const { health, performance } = result;

  return `
📊 Monitoring Report - ${result.timestamp}

🏥 HEALTH STATUS: ${health.overall_status.toUpperCase()}
  • Critical Issues: ${health.critical_issues}
  • Warnings: ${health.warnings}
  • Total Metrics: ${health.metrics.length}

⚡ PERFORMANCE STATUS:
  • Average Response Time: ${performance.average_response_time.toFixed(2)}ms
  • Error Rate: ${performance.error_rate.toFixed(2)}%
  • Memory Utilization: ${performance.system_metrics.memoryUtilization.toFixed(2)}%
  • CPU Utilization: ${performance.system_metrics.cpuUtilization.toFixed(2)}%
  • Uptime: ${Math.floor(performance.system_metrics.uptime / 3600)}h ${Math.floor((performance.system_metrics.uptime % 3600) / 60)}m

🎯 ENDPOINT PERFORMANCE:
${performance.endpoint_metrics.map(m => `  • ${m.endpoint}: ${m.responseTime}ms (${m.statusCode})`).join('\n')}

📈 RECOMMENDATIONS:
${performance.average_response_time > 1000 ? '  ⚠️  High response times detected - consider optimization' : '  ✅ Response times within acceptable range'}
${performance.error_rate > 5 ? '  ⚠️  High error rate detected - investigate issues' : '  ✅ Error rates within acceptable range'}
${performance.system_metrics.memoryUtilization > 80 ? '  ⚠️  High memory usage - consider scaling' : '  ✅ Memory usage optimal'}
  `.trim();
}