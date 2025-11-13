/**
 * Authentication Login API
 * POST /api/auth/login
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock user database - in production, this would be a real database
const users = [
  {
    id: 1,
    username: 'admin',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // 'password'
    role: 'admin',
    name: 'System Administrator'
  },
  {
    id: 2,
    username: 'dispatcher',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // 'password'
    role: 'dispatcher',
    name: 'Fleet Dispatcher'
  },
  {
    id: 3,
    username: 'manager',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // 'password'
    role: 'manager',
    name: 'Operations Manager'
  }
];

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: 'Missing credentials',
      message: 'Username and password are required'
    });
  }

  try {
    // Find user
    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Username or password is incorrect'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Username or password is incorrect'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Set HTTP-only cookie
    res.setHeader('Set-Cookie', [
      `auth-token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${24 * 60 * 60}; Path=/`,
      `user-role=${user.role}; Secure; SameSite=Strict; Max-Age=${24 * 60 * 60}; Path=/`
    ]);

    // Return user info (without password)
    const { password: _, ...userInfo } = user;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: userInfo,
      token: token, // Also return in response for client-side storage if needed
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Login failed due to server error'
    });
  }
}
