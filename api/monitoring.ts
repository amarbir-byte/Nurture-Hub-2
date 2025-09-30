/**
 * Unified Monitoring API
 *
 * Consolidated endpoint for all monitoring functionality:
 * - Error tracking and reporting
 * - Performance metrics collection
 * - Dashboard data aggregation
 * - Administrative actions
 *
 * Routes:
 * POST /api/monitoring?action=error - Log errors
 * GET /api/monitoring?action=metrics - Get performance metrics
 * GET /api/monitoring?action=dashboard - Get dashboard data
 * POST /api/monitoring?action=admin - Admin actions
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory storage (in production, use proper database)
const errors: any[] = [];
const metrics: any[] = [];
const adminActions: any[] = [];

// Configuration
const MAX_ERRORS = 1000;
const MAX_METRICS = 500;
const MAX_ACTIONS = 200;

interface ErrorReport {
  id: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  errorMessage: string;
  errorStack?: string;
  errorCode?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: {
    page?: string;
    userAgent?: string;
    url?: string;
    feature?: string;
    action?: string;
  };
  metadata?: Record<string, any>;
}

interface MetricData {
  id: string;
  timestamp: string;
  userId?: string;
  metricName: string;
  value: number;
  unit: string;
  context: {
    feature?: string;
    page?: string;
    userAgent?: string;
  };
  tags?: Record<string, string>;
}

interface DashboardData {
  summary: {
    totalErrors: number;
    criticalErrors: number;
    averageResponseTime: number;
    activeUsers: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
  };
  recentErrors: ErrorReport[];
  performanceMetrics: MetricData[];
  alertingRules: any[];
}

// Simple auth check
function isAuthenticated(req: VercelRequest): boolean {
  const authHeader = req.headers.authorization;
  return authHeader?.startsWith('Bearer ') || !!req.headers['x-api-key'];
}

function isAdmin(req: VercelRequest): boolean {
  const adminHeader = req.headers['x-admin-key'];
  return adminHeader === process.env.ADMIN_SECRET_KEY;
}

// Error handling
async function handleErrorReport(req: VercelRequest, res: VercelResponse) {
  const errorData = req.body;

  if (!errorData.errorMessage) {
    return res.status(400).json({ error: 'errorMessage is required' });
  }

  const errorReport: ErrorReport = {
    id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    userId: errorData.userId || req.headers['x-user-id'] as string,
    sessionId: errorData.sessionId || req.headers['x-session-id'] as string,
    errorMessage: errorData.errorMessage,
    errorStack: errorData.errorStack,
    errorCode: errorData.errorCode,
    severity: errorData.severity || 'medium',
    context: {
      page: errorData.page || req.headers.referer,
      userAgent: req.headers['user-agent'],
      url: errorData.url,
      feature: errorData.feature,
      action: errorData.action
    },
    metadata: errorData.metadata
  };

  // Store error (maintain max limit)
  errors.unshift(errorReport);
  if (errors.length > MAX_ERRORS) {
    errors.splice(MAX_ERRORS);
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error reported:', errorReport);
  }

  return res.status(200).json({
    success: true,
    errorId: errorReport.id,
    message: 'Error reported successfully'
  });
}

// Metrics collection
async function handleMetrics(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    // Record new metric
    const metricData = req.body;

    if (!metricData.metricName || metricData.value === undefined) {
      return res.status(400).json({ error: 'metricName and value are required' });
    }

    const metric: MetricData = {
      id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId: metricData.userId || req.headers['x-user-id'] as string,
      metricName: metricData.metricName,
      value: metricData.value,
      unit: metricData.unit || 'count',
      context: {
        feature: metricData.feature,
        page: metricData.page || req.headers.referer,
        userAgent: req.headers['user-agent']
      },
      tags: metricData.tags
    };

    // Store metric (maintain max limit)
    metrics.unshift(metric);
    if (metrics.length > MAX_METRICS) {
      metrics.splice(MAX_METRICS);
    }

    return res.status(200).json({
      success: true,
      metricId: metric.id,
      message: 'Metric recorded successfully'
    });
  } else {
    // Get metrics
    const { timeRange = '24h', metricName } = req.query;
    const hours = timeRange === '1h' ? 1 : timeRange === '12h' ? 12 : 24;
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    let filteredMetrics = metrics.filter(m => new Date(m.timestamp) > cutoff);

    if (metricName) {
      filteredMetrics = filteredMetrics.filter(m => m.metricName === metricName);
    }

    return res.status(200).json({
      success: true,
      metrics: filteredMetrics,
      timeRange,
      total: filteredMetrics.length
    });
  }
}

// Dashboard data
async function handleDashboard(req: VercelRequest, res: VercelResponse) {
  const now = Date.now();
  const last24h = new Date(now - 24 * 60 * 60 * 1000);
  const last1h = new Date(now - 60 * 60 * 1000);

  const recent24hErrors = errors.filter(e => new Date(e.timestamp) > last24h);
  const recent1hErrors = errors.filter(e => new Date(e.timestamp) > last1h);
  const criticalErrors = recent24hErrors.filter(e => e.severity === 'critical');

  const recent24hMetrics = metrics.filter(m => new Date(m.timestamp) > last24h);
  const responseTimeMetrics = recent24hMetrics.filter(m => m.metricName === 'response_time');
  const avgResponseTime = responseTimeMetrics.length > 0
    ? responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) / responseTimeMetrics.length
    : 0;

  const uniqueUsers = new Set(recent24hMetrics.map(m => m.userId).filter(Boolean)).size;

  // System health calculation
  let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (criticalErrors.length > 0 || recent1hErrors.length > 10) {
    systemHealth = 'critical';
  } else if (recent24hErrors.length > 50 || avgResponseTime > 2000) {
    systemHealth = 'warning';
  }

  const dashboardData: DashboardData = {
    summary: {
      totalErrors: recent24hErrors.length,
      criticalErrors: criticalErrors.length,
      averageResponseTime: Math.round(avgResponseTime),
      activeUsers: uniqueUsers,
      systemHealth
    },
    recentErrors: errors.slice(0, 10),
    performanceMetrics: recent24hMetrics.slice(0, 50),
    alertingRules: [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        condition: 'errors > 10 in 1h',
        status: recent1hErrors.length > 10 ? 'triggered' : 'ok'
      },
      {
        id: 'slow_response',
        name: 'Slow Response Time',
        condition: 'avg_response_time > 2000ms',
        status: avgResponseTime > 2000 ? 'triggered' : 'ok'
      }
    ]
  };

  return res.status(200).json({
    success: true,
    data: dashboardData,
    timestamp: new Date().toISOString()
  });
}

// Admin actions
async function handleAdminActions(req: VercelRequest, res: VercelResponse) {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { actionType, payload } = req.body;

  const action = {
    id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    adminUser: req.headers['x-admin-user'] as string || 'unknown',
    actionType,
    payload,
    result: null as any
  };

  switch (actionType) {
    case 'clear_errors':
      const clearedCount = errors.length;
      errors.splice(0);
      action.result = { cleared: clearedCount };
      break;

    case 'clear_metrics':
      const clearedMetrics = metrics.length;
      metrics.splice(0);
      action.result = { cleared: clearedMetrics };
      break;

    case 'get_system_info':
      action.result = {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
        platform: process.platform,
        errorCount: errors.length,
        metricCount: metrics.length
      };
      break;

    default:
      return res.status(400).json({ error: 'Unknown action type' });
  }

  // Store action (maintain max limit)
  adminActions.unshift(action);
  if (adminActions.length > MAX_ACTIONS) {
    adminActions.splice(MAX_ACTIONS);
  }

  return res.status(200).json({
    success: true,
    actionId: action.id,
    result: action.result
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, x-admin-key, x-user-id, x-session-id, x-admin-user');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Authentication check
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { action } = req.query;

    if (!action || typeof action !== 'string') {
      return res.status(400).json({
        error: 'Action parameter required',
        availableActions: ['error', 'metrics', 'dashboard', 'admin']
      });
    }

    switch (action) {
      case 'error':
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'POST method required for error reporting' });
        }
        return handleErrorReport(req, res);

      case 'metrics':
        return handleMetrics(req, res);

      case 'dashboard':
        if (req.method !== 'GET') {
          return res.status(405).json({ error: 'GET method required for dashboard' });
        }
        return handleDashboard(req, res);

      case 'admin':
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'POST method required for admin actions' });
        }
        return handleAdminActions(req, res);

      default:
        return res.status(400).json({
          error: 'Invalid action',
          availableActions: ['error', 'metrics', 'dashboard', 'admin']
        });
    }

  } catch (error) {
    console.error('Monitoring API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}