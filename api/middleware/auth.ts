/**
 * Authentication Middleware for API Endpoints
 *
 * Enterprise-grade authentication checking for backend API proxies
 * Ensures only authenticated users can access geocoding services
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for token verification
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

export interface AuthenticatedRequest extends VercelRequest {
  user?: {
    id: string;
    email: string;
    subscription_status?: string;
  };
}

/**
 * Verify user authentication via Authorization header
 */
export async function verifyAuth(req: AuthenticatedRequest): Promise<{ isValid: boolean; user?: any; error?: string }> {
  try {
    // Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { isValid: false, error: 'Missing or invalid Authorization header' };
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return { isValid: false, error: 'Invalid or expired token' };
    }

    return { isValid: true, user };
  } catch (error) {
    console.error('Auth verification error:', error);
    return { isValid: false, error: 'Authentication system error' };
  }
}

/**
 * Authentication middleware wrapper
 */
export function withAuth(handler: (req: AuthenticatedRequest, res: VercelResponse) => Promise<void>) {
  return async (req: AuthenticatedRequest, res: VercelResponse) => {
    // Allow OPTIONS requests for CORS
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      return res.status(200).end();
    }

    // Verify authentication
    const authResult = await verifyAuth(req);
    if (!authResult.isValid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: authResult.error
      });
    }

    // Attach user to request
    req.user = authResult.user;

    // Call the actual handler
    try {
      await handler(req, res);
    } catch (error) {
      console.error('API handler error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'API request failed'
      });
    }
  };
}