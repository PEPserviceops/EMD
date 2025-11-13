/**
 * Authentication Session API
 * GET /api/auth/session - Get current session info
 * POST /api/auth/session - Refresh session (extend token)
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGetSession(req, res);
  } else if (req.method === 'POST') {
    return handleRefreshSession(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * GET /api/auth/session
 * Get current session information
 */
async function handleGetSession(req, res) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        authenticated: false,
        message: 'No authentication token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    res.status(200).json({
      authenticated: true,
      user: {
        id: decoded.userId,
        username: decoded.username,
        role: decoded.role,
        name: decoded.name
      },
      expiresAt: new Date(decoded.exp * 1000).toISOString(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Session verification error:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        authenticated: false,
        message: 'Session expired',
        expired: true
      });
    }

    return res.status(401).json({
      authenticated: false,
      message: 'Invalid session'
    });
  }
}

/**
 * POST /api/auth/session
 * Refresh/extend the current session
 */
async function handleRefreshSession(req, res) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        error: 'No authentication token',
        message: 'Cannot refresh session without valid token'
      });
    }

    // Verify current token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Generate new token with extended expiry
    const newToken = jwt.sign(
      {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role,
        name: decoded.name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update cookie with new token
    res.setHeader('Set-Cookie', [
      `auth-token=${newToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=${24 * 60 * 60}; Path=/`,
      `user-role=${decoded.role}; Secure; SameSite=Strict; Max-Age=${24 * 60 * 60}; Path=/`
    ]);

    res.status(200).json({
      success: true,
      message: 'Session refreshed',
      user: {
        id: decoded.userId,
        username: decoded.username,
        role: decoded.role,
        name: decoded.name
      },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Session refresh error:', error.message);
    return res.status(401).json({
      error: 'Session refresh failed',
      message: 'Invalid or expired token'
    });
  }
}

/**
 * Extract token from request (cookie or Authorization header)
 */
function getTokenFromRequest(req) {
  // Try cookie first
  const cookies = req.headers.cookie;
  if (cookies) {
    const cookieMatch = cookies.match(/auth-token=([^;]+)/);
    if (cookieMatch) {
      return cookieMatch[1];
    }
  }

  // Try Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}
