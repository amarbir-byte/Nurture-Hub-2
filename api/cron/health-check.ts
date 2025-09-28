/**
 * Automated Health Check Cron Job
 *
 * Runs every 5 minutes to monitor application health
 * and send alerts when issues are detected.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface HealthMetric {
  name: string;
  value: number;
  threshold: number;
  status: 'ok' | 'warning' | 'critical';
  timestamp: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Verify this is a cron request
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🔍 Running automated health check...');

    // Collect health metrics
    const metrics = await collectHealthMetrics();

    // Check for critical issues
    const criticalIssues = metrics.filter(m => m.status === 'critical');
    const warnings = metrics.filter(m => m.status === 'warning');

    // Send alerts if needed
    if (criticalIssues.length > 0) {
      await sendCriticalAlert(criticalIssues);
    }

    if (warnings.length > 0) {
      await sendWarningAlert(warnings);
    }

    // Store metrics for trending
    await storeMetrics(metrics);

    console.log(`✅ Health check completed: ${metrics.length} metrics collected, ${criticalIssues.length} critical, ${warnings.length} warnings`);

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics_collected: metrics.length,
      critical_issues: criticalIssues.length,
      warnings: warnings.length,
      overall_status: criticalIssues.length > 0 ? 'critical' : warnings.length > 0 ? 'warning' : 'healthy'
    });

  } catch (error) {
    console.error('❌ Health check cron job failed:', error);

    // Send failure alert
    await sendSystemAlert('Health Check System Failure', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
}

async function collectHealthMetrics(): Promise<HealthMetric[]> {
  const metrics: HealthMetric[] = [];
  const timestamp = new Date().toISOString();

  try {
    // 1. Application Response Time
    const appResponseTime = await measureApplicationResponseTime();
    metrics.push({
      name: 'application_response_time',
      value: appResponseTime,
      threshold: 3000, // 3 seconds
      status: appResponseTime > 5000 ? 'critical' : appResponseTime > 3000 ? 'warning' : 'ok',
      timestamp
    });

    // 2. Database Response Time
    const dbResponseTime = await measureDatabaseResponseTime();
    metrics.push({
      name: 'database_response_time',
      value: dbResponseTime,
      threshold: 2000, // 2 seconds
      status: dbResponseTime > 5000 ? 'critical' : dbResponseTime > 2000 ? 'warning' : 'ok',
      timestamp
    });

    // 3. External API Health
    const externalApiStatus = await checkExternalAPIsHealth();
    metrics.push({
      name: 'external_apis_available',
      value: externalApiStatus.availableCount,
      threshold: externalApiStatus.totalCount * 0.8, // 80% availability
      status: externalApiStatus.availableCount < externalApiStatus.totalCount * 0.5 ? 'critical' :
              externalApiStatus.availableCount < externalApiStatus.totalCount * 0.8 ? 'warning' : 'ok',
      timestamp
    });

    // 4. Error Rate (simulated - in production, pull from monitoring system)
    const errorRate = await getErrorRate();
    metrics.push({
      name: 'error_rate_percentage',
      value: errorRate,
      threshold: 5, // 5% error rate
      status: errorRate > 10 ? 'critical' : errorRate > 5 ? 'warning' : 'ok',
      timestamp
    });

    // 5. Memory Usage (if available in serverless environment)
    const memoryUsage = getMemoryUsage();
    if (memoryUsage !== null) {
      metrics.push({
        name: 'memory_usage_percentage',
        value: memoryUsage,
        threshold: 80, // 80% memory usage
        status: memoryUsage > 95 ? 'critical' : memoryUsage > 80 ? 'warning' : 'ok',
        timestamp
      });
    }

  } catch (error) {
    console.error('Error collecting metrics:', error);
    // Add error metric
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
    const response = await fetch(`${process.env.VITE_APP_URL || 'https://nurture-hub.vercel.app'}`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return Date.now() - start;
  } catch (error) {
    console.error('Application response time check failed:', error);
    return 10000; // Return max time on failure
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

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return Date.now() - start;
  } catch (error) {
    console.error('Database response time check failed:', error);
    return 5000; // Return max time on failure
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
      fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(3000)
      })
    )
  );

  const availableCount = results.filter(result =>
    result.status === 'fulfilled' && result.value.ok
  ).length;

  return {
    availableCount,
    totalCount: apis.length
  };
}

async function getErrorRate(): Promise<number> {
  // In a real implementation, this would query your monitoring system
  // For now, return a simulated error rate
  return Math.random() * 3; // Random error rate between 0-3%
}

function getMemoryUsage(): number | null {
  try {
    const usage = process.memoryUsage();
    const heapUsed = usage.heapUsed;
    const heapTotal = usage.heapTotal;
    return Math.round((heapUsed / heapTotal) * 100);
  } catch (error) {
    return null; // Memory usage not available
  }
}

async function sendCriticalAlert(issues: HealthMetric[]): Promise<void> {
  const alertMessage = `🚨 CRITICAL: Health check detected ${issues.length} critical issue(s):

${issues.map(issue => `- ${issue.name}: ${issue.value} (threshold: ${issue.threshold})`).join('\n')}

Immediate investigation required!
Time: ${new Date().toISOString()}
Environment: ${process.env.VERCEL_ENV || 'development'}`;

  console.error(alertMessage);

  // In production, send to:
  // - PagerDuty
  // - Slack critical channel
  // - SMS alerts
  // - Email alerts

  try {
    // Example: Send to webhook
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
    console.error('Failed to send critical alert:', error);
  }
}

async function sendWarningAlert(warnings: HealthMetric[]): Promise<void> {
  const alertMessage = `⚠️ WARNING: Health check detected ${warnings.length} warning(s):

${warnings.map(w => `- ${w.name}: ${w.value} (threshold: ${w.threshold})`).join('\n')}

Please investigate when convenient.
Time: ${new Date().toISOString()}`;

  console.warn(alertMessage);

  try {
    // Send to monitoring channels
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
    console.error('Failed to send warning alert:', error);
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

async function storeMetrics(metrics: HealthMetric[]): Promise<void> {
  try {
    // In production, store metrics in:
    // - Time series database
    // - Monitoring system
    // - Analytics platform

    console.log(`📊 Storing ${metrics.length} health metrics for trending analysis`);

    // Example: Store in monitoring system
    if (process.env.METRICS_ENDPOINT) {
      await fetch(process.env.METRICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics,
          source: 'health-check-cron',
          timestamp: new Date().toISOString()
        })
      });
    }
  } catch (error) {
    console.error('Failed to store metrics:', error);
  }
}