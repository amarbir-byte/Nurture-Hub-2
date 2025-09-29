/**
 * User Actions API Endpoint
 *
 * Collects and stores user action analytics from the frontend monitoring system
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

interface UserAction {
  action: string;
  userId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface ActionsRequest {
  actions: UserAction[];
}

// In-memory storage for now (should be replaced with database)
let actionsStorage: UserAction[] = [];

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
      return await handleActionsSubmission(req, res);
    } else if (req.method === 'GET') {
      return await handleActionsRetrieval(req, res);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Actions monitoring API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleActionsSubmission(req: VercelRequest, res: VercelResponse) {
  const { actions }: ActionsRequest = req.body;

  if (!actions || !Array.isArray(actions)) {
    res.status(400).json({ error: 'Invalid request format' });
    return;
  }

  // Validate and store actions
  const validActions: UserAction[] = [];
  for (const action of actions) {
    if (isValidAction(action)) {
      const serverAction: UserAction = {
        ...action,
        timestamp: new Date(),
        metadata: {
          ...action.metadata,
          serverReceived: new Date().toISOString(),
          clientIP: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
          userAgent: req.headers['user-agent']
        }
      };
      validActions.push(serverAction);
    }
  }

  // Store actions
  actionsStorage.push(...validActions);

  // Keep only last 10000 actions to prevent memory issues
  if (actionsStorage.length > 10000) {
    actionsStorage = actionsStorage.slice(-10000);
  }

  res.status(200).json({
    success: true,
    stored: validActions.length,
    total: actionsStorage.length
  });
}

async function handleActionsRetrieval(req: VercelRequest, res: VercelResponse) {
  const {
    action,
    userId,
    limit = '100',
    offset = '0',
    since,
    analytics
  } = req.query;

  let filteredActions = [...actionsStorage];

  // Apply filters
  if (action && typeof action === 'string') {
    filteredActions = filteredActions.filter(a => a.action === action);
  }

  if (userId && typeof userId === 'string') {
    filteredActions = filteredActions.filter(a => a.userId === userId);
  }

  if (since && typeof since === 'string') {
    const sinceDate = new Date(since);
    filteredActions = filteredActions.filter(a => new Date(a.timestamp) >= sinceDate);
  }

  // Sort by timestamp (newest first)
  filteredActions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  let result;
  if (analytics === 'true') {
    result = generateActionsAnalytics(filteredActions);
  } else {
    // Apply pagination
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);
    const paginatedActions = filteredActions.slice(offsetNum, offsetNum + limitNum);

    result = {
      actions: paginatedActions,
      pagination: {
        total: filteredActions.length,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < filteredActions.length
      }
    };
  }

  res.status(200).json(result);
}

function isValidAction(action: any): action is UserAction {
  return (
    action &&
    typeof action === 'object' &&
    typeof action.action === 'string'
  );
}

function generateActionsAnalytics(actions: UserAction[]) {
  const analytics = {
    total: actions.length,
    uniqueUsers: new Set<string>(),
    topActions: [] as Array<{ action: string; count: number }>,
    userEngagement: {} as Record<string, number>,
    timeDistribution: {} as Record<string, number>,
    featureUsage: {} as Record<string, number>,
    conversionFunnel: {
      pageViews: 0,
      interactions: 0,
      conversions: 0
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

  const actionCounts: Record<string, number> = {};

  actions.forEach(action => {
    // Count unique users
    if (action.userId) {
      analytics.uniqueUsers.add(action.userId);
      analytics.userEngagement[action.userId] = (analytics.userEngagement[action.userId] || 0) + 1;
    }

    // Count actions
    actionCounts[action.action] = (actionCounts[action.action] || 0) + 1;

    // Time distribution
    const hour = new Date(action.timestamp).getHours();
    analytics.timeDistribution[hour] = (analytics.timeDistribution[hour] || 0) + 1;

    // Feature usage tracking
    if (action.metadata?.feature) {
      analytics.featureUsage[action.metadata.feature] = (analytics.featureUsage[action.metadata.feature] || 0) + 1;
    }

    // Conversion funnel
    switch (action.action) {
      case 'page_view':
        analytics.conversionFunnel.pageViews++;
        break;
      case 'feature_usage':
      case 'button_click':
      case 'form_interaction':
        analytics.conversionFunnel.interactions++;
        break;
      case 'subscription_created':
      case 'payment_completed':
      case 'trial_started':
        analytics.conversionFunnel.conversions++;
        break;
    }

    // Time trends
    const actionTime = new Date(action.timestamp);
    if (actionTime >= hourAgo) analytics.trends.lastHour++;
    if (actionTime >= dayAgo) analytics.trends.last24Hours++;
    if (actionTime >= weekAgo) analytics.trends.lastWeek++;
  });

  // Top actions
  analytics.topActions = Object.entries(actionCounts)
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    ...analytics,
    uniqueUsers: analytics.uniqueUsers.size,
    engagementRate: analytics.uniqueUsers.size > 0 ?
      analytics.conversionFunnel.interactions / analytics.uniqueUsers.size : 0,
    conversionRate: analytics.conversionFunnel.interactions > 0 ?
      analytics.conversionFunnel.conversions / analytics.conversionFunnel.interactions : 0
  };
}