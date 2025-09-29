/**
 * Monitoring Dashboard API Endpoint
 *
 * Provides aggregated monitoring data for the admin dashboard
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Get current monitoring status from all endpoints
    const baseUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;

    const [errorsResponse, metricsResponse, actionsResponse] = await Promise.allSettled([
      fetch(`${baseUrl}/api/monitoring/errors?limit=50&since=${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}`),
      fetch(`${baseUrl}/api/monitoring/metrics?aggregation=summary&since=${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}`),
      fetch(`${baseUrl}/api/monitoring/actions?analytics=true&since=${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}`)
    ]);

    // Parse responses
    let errorData = { errors: [], summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0 } } };
    let metricsData = { performanceScores: {}, trends: {}, byName: {} };
    let actionsData = { total: 0, uniqueUsers: 0, topActions: [], trends: {} };

    if (errorsResponse.status === 'fulfilled' && errorsResponse.value.ok) {
      errorData = await errorsResponse.value.json();
    }

    if (metricsResponse.status === 'fulfilled' && metricsResponse.value.ok) {
      metricsData = await metricsResponse.value.json();
    }

    if (actionsResponse.status === 'fulfilled' && actionsResponse.value.ok) {
      actionsData = await actionsResponse.value.json();
    }

    // Generate dashboard summary
    const dashboard = {
      timestamp: new Date().toISOString(),
      status: 'operational',
      alerts: generateAlerts(errorData, metricsData),
      overview: {
        totalErrors: errorData.summary?.total || 0,
        criticalErrors: errorData.summary?.bySeverity?.critical || 0,
        activeUsers: actionsData.uniqueUsers || 0,
        systemHealth: calculateSystemHealth(errorData, metricsData)
      },
      errors: {
        recent: errorData.errors?.slice(0, 10) || [],
        summary: errorData.summary || {},
        trends: {
          lastHour: errorData.summary?.recentTrend?.lastHour || 0,
          last24Hours: errorData.summary?.recentTrend?.last24Hours || 0
        }
      },
      performance: {
        scores: metricsData.performanceScores || {},
        trends: metricsData.trends || {},
        keyMetrics: extractKeyMetrics(metricsData.byName || {})
      },
      userActivity: {
        totalActions: actionsData.total || 0,
        uniqueUsers: actionsData.uniqueUsers || 0,
        topActions: actionsData.topActions?.slice(0, 5) || [],
        trends: actionsData.trends || {}
      },
      systemStatus: {
        uptime: '99.9%', // Would be calculated from actual uptime tracking
        lastIncident: null, // Would be from incident tracking
        deploymentStatus: 'stable'
      }
    };

    res.status(200).json(dashboard);

  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}

function generateAlerts(errorData: any, metricsData: any): Array<{ level: string; message: string; timestamp: string }> {
  const alerts = [];
  const now = new Date().toISOString();

  // Critical error alerts
  const criticalErrors = errorData.summary?.bySeverity?.critical || 0;
  if (criticalErrors > 0) {
    alerts.push({
      level: 'critical',
      message: `${criticalErrors} critical error${criticalErrors > 1 ? 's' : ''} detected in the last 24 hours`,
      timestamp: now
    });
  }

  // High error volume alerts
  const totalErrors = errorData.summary?.total || 0;
  if (totalErrors > 100) {
    alerts.push({
      level: 'warning',
      message: `High error volume detected: ${totalErrors} errors in 24 hours`,
      timestamp: now
    });
  }

  // Performance alerts
  const pageLoadScore = metricsData.performanceScores?.pageLoad;
  if (pageLoadScore && pageLoadScore < 50) {
    alerts.push({
      level: 'warning',
      message: `Poor page load performance detected (score: ${Math.round(pageLoadScore)}/100)`,
      timestamp: now
    });
  }

  const webVitalsScore = metricsData.performanceScores?.webVitals;
  if (webVitalsScore && webVitalsScore < 50) {
    alerts.push({
      level: 'warning',
      message: `Poor Web Vitals performance detected (score: ${Math.round(webVitalsScore)}/100)`,
      timestamp: now
    });
  }

  return alerts;
}

function calculateSystemHealth(errorData: any, metricsData: any): number {
  let healthScore = 100;

  // Deduct points for errors
  const criticalErrors = errorData.summary?.bySeverity?.critical || 0;
  const highErrors = errorData.summary?.bySeverity?.high || 0;
  const mediumErrors = errorData.summary?.bySeverity?.medium || 0;

  healthScore -= criticalErrors * 20; // 20 points per critical error
  healthScore -= highErrors * 5;     // 5 points per high error
  healthScore -= mediumErrors * 1;   // 1 point per medium error

  // Factor in performance
  const avgPerformance = Object.values(metricsData.performanceScores || {}).reduce((sum: number, score: any) => sum + (score || 0), 0) / Math.max(1, Object.keys(metricsData.performanceScores || {}).length);

  if (avgPerformance > 0) {
    healthScore = (healthScore + avgPerformance) / 2;
  }

  return Math.max(0, Math.min(100, healthScore));
}

function extractKeyMetrics(metricsByName: Record<string, any>) {
  const keyMetrics = {
    pageLoadTime: null as number | null,
    apiResponseTime: null as number | null,
    errorRate: null as number | null,
    userSatisfaction: null as number | null
  };

  if (metricsByName['page_load_time']) {
    keyMetrics.pageLoadTime = Math.round(metricsByName['page_load_time'].average);
  }

  if (metricsByName['api_call_duration']) {
    keyMetrics.apiResponseTime = Math.round(metricsByName['api_call_duration'].average);
  }

  if (metricsByName['largest_contentful_paint']) {
    const lcp = metricsByName['largest_contentful_paint'].average;
    keyMetrics.userSatisfaction = Math.max(0, Math.min(100, 100 - (lcp / 25)));
  }

  return keyMetrics;
}