/**
 * Performance Metrics Collection Cron Job
 *
 * Runs every 15 minutes to collect and store performance metrics
 * for monitoring and optimization purposes.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

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

const PERFORMANCE_ENDPOINTS = [
  '/api/health',
  '/api/properties',
  '/api/contacts',
  '/api/campaigns',
  '/api/billing'
];

class PerformanceCollector {
  private metrics: PerformanceMetric[] = [];

  async collectEndpointMetrics(): Promise<PerformanceMetric[]> {
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
          timeout: 10000
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
          throughput: 1000 / responseTime // requests per second
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

  async collectSystemMetrics(): Promise<SystemMetrics> {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      uptime: process.uptime(),
      memoryUtilization: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      cpuUtilization: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
      diskUsage: 0, // Would need additional monitoring in production
      activeConnections: 0, // Would need additional monitoring
      requestsPerMinute: 0, // Would be calculated from historical data
      averageResponseTime: 0, // Would be calculated from historical data
      errorRate: 0 // Would be calculated from historical data
    };
  }

  async storeMetrics(metrics: PerformanceMetric[], systemMetrics: SystemMetrics): Promise<void> {
    try {
      // In production, store to your monitoring service (DataDog, New Relic, etc.)
      console.log('Performance Metrics:', {
        timestamp: new Date().toISOString(),
        endpointMetrics: metrics,
        systemMetrics
      });

      // Store to your database or monitoring service
      // await this.sendToMonitoringService(metrics, systemMetrics);

    } catch (error) {
      console.error('Failed to store performance metrics:', error);
    }
  }

  private async sendToMonitoringService(metrics: PerformanceMetric[], systemMetrics: SystemMetrics): Promise<void> {
    // Implementation would depend on your monitoring service
    // Examples: DataDog, New Relic, Prometheus, custom analytics

    if (process.env.DATADOG_API_KEY) {
      // Send to DataDog
      await this.sendToDataDog(metrics, systemMetrics);
    }

    if (process.env.NEW_RELIC_LICENSE_KEY) {
      // Send to New Relic
      await this.sendToNewRelic(metrics, systemMetrics);
    }
  }

  private async sendToDataDog(metrics: PerformanceMetric[], systemMetrics: SystemMetrics): Promise<void> {
    const ddMetrics = metrics.map(metric => ({
      metric: 'nurture_hub.response_time',
      points: [[Math.floor(Date.now() / 1000), metric.responseTime]],
      tags: [`endpoint:${metric.endpoint}`, `status:${metric.statusCode}`],
      host: process.env.VERCEL_URL
    }));

    try {
      await fetch('https://api.datadoghq.com/api/v1/series', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY': process.env.DATADOG_API_KEY!
        },
        body: JSON.stringify({ series: ddMetrics })
      });
    } catch (error) {
      console.error('Failed to send metrics to DataDog:', error);
    }
  }

  private async sendToNewRelic(metrics: PerformanceMetric[], systemMetrics: SystemMetrics): Promise<void> {
    const nrMetrics = metrics.map(metric => ({
      eventType: 'PerformanceMetric',
      timestamp: Date.now(),
      endpoint: metric.endpoint,
      responseTime: metric.responseTime,
      statusCode: metric.statusCode,
      memoryUsage: metric.memoryUsage,
      cpuUsage: metric.cpuUsage,
      errorRate: metric.errorRate,
      throughput: metric.throughput
    }));

    try {
      await fetch('https://insights-collector.newrelic.com/v1/accounts/YOUR_ACCOUNT_ID/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Insert-Key': process.env.NEW_RELIC_LICENSE_KEY!
        },
        body: JSON.stringify(nrMetrics)
      });
    } catch (error) {
      console.error('Failed to send metrics to New Relic:', error);
    }
  }

  async generatePerformanceReport(): Promise<string> {
    const metrics = await this.collectEndpointMetrics();
    const systemMetrics = await this.collectSystemMetrics();

    const avgResponseTime = metrics.reduce((acc, m) => acc + m.responseTime, 0) / metrics.length;
    const errorRate = metrics.filter(m => m.errorRate > 0).length / metrics.length * 100;

    return `
📊 Performance Report - ${new Date().toISOString()}

🚀 System Performance:
  • Average Response Time: ${avgResponseTime.toFixed(2)}ms
  • Error Rate: ${errorRate.toFixed(2)}%
  • Memory Utilization: ${systemMetrics.memoryUtilization.toFixed(2)}%
  • CPU Utilization: ${systemMetrics.cpuUtilization.toFixed(2)}%
  • Uptime: ${Math.floor(systemMetrics.uptime / 3600)}h ${Math.floor((systemMetrics.uptime % 3600) / 60)}m

🎯 Endpoint Performance:
${metrics.map(m => `  • ${m.endpoint}: ${m.responseTime}ms (${m.statusCode})`).join('\n')}

📈 Recommendations:
${avgResponseTime > 1000 ? '  ⚠️  High response times detected - consider optimization' : '  ✅ Response times within acceptable range'}
${errorRate > 5 ? '  ⚠️  High error rate detected - investigate issues' : '  ✅ Error rates within acceptable range'}
${systemMetrics.memoryUtilization > 80 ? '  ⚠️  High memory usage - consider scaling' : '  ✅ Memory usage optimal'}
    `.trim();
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify this is a cron job request
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const collector = new PerformanceCollector();

    // Collect metrics
    const endpointMetrics = await collector.collectEndpointMetrics();
    const systemMetrics = await collector.collectSystemMetrics();

    // Store metrics
    await collector.storeMetrics(endpointMetrics, systemMetrics);

    // Generate report
    const report = await collector.generatePerformanceReport();

    // Send alerts if performance is degraded
    const avgResponseTime = endpointMetrics.reduce((acc, m) => acc + m.responseTime, 0) / endpointMetrics.length;
    const errorRate = endpointMetrics.filter(m => m.errorRate > 0).length / endpointMetrics.length * 100;

    if (avgResponseTime > 2000 || errorRate > 10 || systemMetrics.memoryUtilization > 90) {
      // Send alert to monitoring service
      console.error('🚨 Performance Alert:', {
        avgResponseTime,
        errorRate,
        memoryUtilization: systemMetrics.memoryUtilization,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Performance metrics collected successfully',
      timestamp: new Date().toISOString(),
      metrics: {
        endpointCount: endpointMetrics.length,
        averageResponseTime: avgResponseTime,
        errorRate,
        systemHealth: {
          memory: systemMetrics.memoryUtilization,
          cpu: systemMetrics.cpuUtilization,
          uptime: systemMetrics.uptime
        }
      },
      report
    });

  } catch (error) {
    console.error('Performance metrics collection failed:', error);
    res.status(500).json({
      error: 'Performance metrics collection failed',
      timestamp: new Date().toISOString(),
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}