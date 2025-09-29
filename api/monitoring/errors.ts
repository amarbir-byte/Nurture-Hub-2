/**
 * Error Monitoring API Endpoint
 *
 * Collects and stores error reports from the frontend monitoring system
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

interface ErrorReport {
  error: {
    message: string;
    stack?: string;
  };
  context: string;
  userId?: string;
  userAgent: string;
  timestamp: Date;
  stackTrace: string;
  errorId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

interface ErrorRequest {
  errors: ErrorReport[];
}

// In-memory storage for now (should be replaced with database)
let errorStorage: ErrorReport[] = [];

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
      return await handleErrorSubmission(req, res);
    } else if (req.method === 'GET') {
      return await handleErrorRetrieval(req, res);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error monitoring API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleErrorSubmission(req: VercelRequest, res: VercelResponse) {
  const { errors }: ErrorRequest = req.body;

  if (!errors || !Array.isArray(errors)) {
    res.status(400).json({ error: 'Invalid request format' });
    return;
  }

  // Validate and store errors
  const validErrors: ErrorReport[] = [];
  for (const error of errors) {
    if (isValidErrorReport(error)) {
      // Add server timestamp
      const serverError: ErrorReport = {
        ...error,
        timestamp: new Date(),
        metadata: {
          ...error.metadata,
          serverReceived: new Date().toISOString(),
          clientIP: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
          userAgent: req.headers['user-agent']
        }
      };
      validErrors.push(serverError);
    }
  }

  // Store errors (in production, use database)
  errorStorage.push(...validErrors);

  // Keep only last 1000 errors to prevent memory issues
  if (errorStorage.length > 1000) {
    errorStorage = errorStorage.slice(-1000);
  }

  // Log critical errors immediately
  const criticalErrors = validErrors.filter(e => e.severity === 'critical');
  if (criticalErrors.length > 0) {
    console.error('🚨 CRITICAL ERRORS RECEIVED:', criticalErrors.map(e => ({
      id: e.errorId,
      message: e.error.message,
      context: e.context,
      userId: e.userId
    })));
  }

  res.status(200).json({
    success: true,
    stored: validErrors.length,
    total: errorStorage.length,
    criticalAlerts: criticalErrors.length
  });
}

async function handleErrorRetrieval(req: VercelRequest, res: VercelResponse) {
  const {
    severity,
    userId,
    context,
    limit = '100',
    offset = '0',
    since
  } = req.query;

  let filteredErrors = [...errorStorage];

  // Apply filters
  if (severity && typeof severity === 'string') {
    filteredErrors = filteredErrors.filter(e => e.severity === severity);
  }

  if (userId && typeof userId === 'string') {
    filteredErrors = filteredErrors.filter(e => e.userId === userId);
  }

  if (context && typeof context === 'string') {
    filteredErrors = filteredErrors.filter(e => e.context.includes(context));
  }

  if (since && typeof since === 'string') {
    const sinceDate = new Date(since);
    filteredErrors = filteredErrors.filter(e => new Date(e.timestamp) >= sinceDate);
  }

  // Sort by timestamp (newest first)
  filteredErrors.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Apply pagination
  const limitNum = parseInt(limit as string, 10);
  const offsetNum = parseInt(offset as string, 10);
  const paginatedErrors = filteredErrors.slice(offsetNum, offsetNum + limitNum);

  // Generate summary statistics
  const summary = generateErrorSummary(filteredErrors);

  res.status(200).json({
    errors: paginatedErrors,
    pagination: {
      total: filteredErrors.length,
      limit: limitNum,
      offset: offsetNum,
      hasMore: offsetNum + limitNum < filteredErrors.length
    },
    summary
  });
}

function isValidErrorReport(error: any): error is ErrorReport {
  return (
    error &&
    typeof error === 'object' &&
    error.error &&
    typeof error.error.message === 'string' &&
    typeof error.context === 'string' &&
    typeof error.errorId === 'string' &&
    ['low', 'medium', 'high', 'critical'].includes(error.severity)
  );
}

function generateErrorSummary(errors: ErrorReport[]) {
  const summary = {
    total: errors.length,
    bySeverity: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    },
    byContext: {} as Record<string, number>,
    recentTrend: {
      lastHour: 0,
      last24Hours: 0,
      lastWeek: 0
    },
    topErrors: [] as Array<{ message: string; count: number }>
  };

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const messageCounts: Record<string, number> = {};

  errors.forEach(error => {
    // Count by severity
    summary.bySeverity[error.severity]++;

    // Count by context
    summary.byContext[error.context] = (summary.byContext[error.context] || 0) + 1;

    // Count by message
    messageCounts[error.error.message] = (messageCounts[error.error.message] || 0) + 1;

    // Time trends
    const errorTime = new Date(error.timestamp);
    if (errorTime >= hourAgo) summary.recentTrend.lastHour++;
    if (errorTime >= dayAgo) summary.recentTrend.last24Hours++;
    if (errorTime >= weekAgo) summary.recentTrend.lastWeek++;
  });

  // Top errors
  summary.topErrors = Object.entries(messageCounts)
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return summary;
}