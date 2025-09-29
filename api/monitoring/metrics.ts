/**
 * Performance Metrics API Endpoint
 *
 * Collects and stores performance metrics from the frontend monitoring system
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: Date;
  userId?: string;
  metadata?: Record<string, any>;
}

interface MetricsRequest {
  metrics: PerformanceMetric[];
}

// In-memory storage for now (should be replaced with database)
let metricsStorage: PerformanceMetric[] = [];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'POST') {
      return await handleMetricsSubmission(req, res);
    } else if (req.method === 'GET') {
      return await handleMetricsRetrieval(req, res);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Metrics monitoring API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleMetricsSubmission(req: VercelRequest, res: VercelResponse) {
  const { metrics }: MetricsRequest = req.body;

  if (!metrics || !Array.isArray(metrics)) {
    res.status(400).json({ error: 'Invalid request format' });
    return;
  }

  // Validate and store metrics
  const validMetrics: PerformanceMetric[] = [];
  for (const metric of metrics) {
    if (isValidMetric(metric)) {
      const serverMetric: PerformanceMetric = {
        ...metric,
        timestamp: new Date(),
        metadata: {
          ...metric.metadata,
          serverReceived: new Date().toISOString(),
          clientIP: req.headers['x-forwarded-for'] || req.connection?.remoteAddress
        }
      };
      validMetrics.push(serverMetric);
    }
  }

  // Store metrics
  metricsStorage.push(...validMetrics);

  // Keep only last 5000 metrics to prevent memory issues
  if (metricsStorage.length > 5000) {
    metricsStorage = metricsStorage.slice(-5000);
  }

  // Check for performance issues
  const performanceAlerts = checkPerformanceThresholds(validMetrics);
  if (performanceAlerts.length > 0) {
    console.warn('⚠️ PERFORMANCE ALERTS:', performanceAlerts);
  }

  res.status(200).json({
    success: true,
    stored: validMetrics.length,
    total: metricsStorage.length,
    alerts: performanceAlerts.length
  });
}

async function handleMetricsRetrieval(req: VercelRequest, res: VercelResponse) {
  const {
    name,
    userId,
    limit = '100',
    offset = '0',
    since,
    aggregation
  } = req.query;

  let filteredMetrics = [...metricsStorage];

  // Apply filters
  if (name && typeof name === 'string') {
    filteredMetrics = filteredMetrics.filter(m => m.name === name);
  }

  if (userId && typeof userId === 'string') {
    filteredMetrics = filteredMetrics.filter(m => m.userId === userId);
  }

  if (since && typeof since === 'string') {
    const sinceDate = new Date(since);
    filteredMetrics = filteredMetrics.filter(m => new Date(m.timestamp) >= sinceDate);
  }

  // Sort by timestamp (newest first)
  filteredMetrics.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  let result;
  if (aggregation === 'summary') {
    result = generateMetricsSummary(filteredMetrics);
  } else {
    // Apply pagination
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);
    const paginatedMetrics = filteredMetrics.slice(offsetNum, offsetNum + limitNum);

    result = {
      metrics: paginatedMetrics,
      pagination: {
        total: filteredMetrics.length,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < filteredMetrics.length
      }
    };
  }

  res.status(200).json(result);
}

function isValidMetric(metric: any): metric is PerformanceMetric {
  return (
    metric &&
    typeof metric === 'object' &&
    typeof metric.name === 'string' &&
    typeof metric.value === 'number' &&
    !isNaN(metric.value)
  );
}

function checkPerformanceThresholds(metrics: PerformanceMetric[]): string[] {
  const alerts: string[] = [];

  metrics.forEach(metric => {
    switch (metric.name) {
      case 'page_load_time':
        if (metric.value > 3000) { // 3 seconds
          alerts.push(`Slow page load: ${metric.value}ms`);
        }
        break;
      case 'largest_contentful_paint':
        if (metric.value > 2500) {
          alerts.push(`Poor LCP: ${metric.value}ms`);
        }
        break;
      case 'first_input_delay':
        if (metric.value > 100) {
          alerts.push(`High FID: ${metric.value}ms`);
        }
        break;
      case 'cumulative_layout_shift':
        if (metric.value > 0.1) {
          alerts.push(`High CLS: ${metric.value}`);
        }
        break;
      case 'api_call_duration':
        if (metric.value > 5000) { // 5 seconds
          alerts.push(`Slow API call: ${metric.value}ms`);
        }
        break;
    }
  });

  return alerts;
}

function generateMetricsSummary(metrics: PerformanceMetric[]) {
  const summary = {
    total: metrics.length,
    byName: {} as Record<string, {
      count: number;
      average: number;
      min: number;
      max: number;
      recent: number[];
    }>,
    performanceScores: {
      pageLoad: 0,
      webVitals: 0,
      apiPerformance: 0
    },
    trends: {
      lastHour: 0,
      last24Hours: 0,
      lastWeek: 0
    }
  };

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Group metrics by name
  const metricsByName: Record<string, PerformanceMetric[]> = {};

  metrics.forEach(metric => {
    if (!metricsByName[metric.name]) {
      metricsByName[metric.name] = [];
    }
    metricsByName[metric.name].push(metric);

    // Count trends
    const metricTime = new Date(metric.timestamp);
    if (metricTime >= hourAgo) summary.trends.lastHour++;
    if (metricTime >= dayAgo) summary.trends.last24Hours++;
    if (metricTime >= weekAgo) summary.trends.lastWeek++;
  });

  // Calculate statistics for each metric name
  Object.entries(metricsByName).forEach(([name, metricList]) => {
    const values = metricList.map(m => m.value);
    const recent = metricList
      .filter(m => new Date(m.timestamp) >= dayAgo)
      .map(m => m.value)
      .slice(0, 10);

    summary.byName[name] = {
      count: values.length,
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      recent
    };
  });

  // Calculate performance scores (0-100, higher is better)
  if (summary.byName['page_load_time']) {
    const avgLoadTime = summary.byName['page_load_time'].average;
    summary.performanceScores.pageLoad = Math.max(0, 100 - (avgLoadTime / 50));
  }

  if (summary.byName['largest_contentful_paint']) {
    const avgLCP = summary.byName['largest_contentful_paint'].average;
    summary.performanceScores.webVitals = Math.max(0, 100 - (avgLCP / 25));
  }

  if (summary.byName['api_call_duration']) {
    const avgAPI = summary.byName['api_call_duration'].average;
    summary.performanceScores.apiPerformance = Math.max(0, 100 - (avgAPI / 100));
  }

  return summary;
}