/**
 * Authentication Logout API
 * POST /api/auth/logout
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Clear authentication cookies
    res.setHeader('Set-Cookie', [
      'auth-token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/',
      'user-role=; Secure; SameSite=Strict; Max-Age=0; Path=/'
    ]);

    res.status(200).json({
      success: true,
      message: 'Logout successful',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Logout failed due to server error'
    });
  }
}
