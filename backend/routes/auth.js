const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const db = require('../config/database');
const logger = require('../config/logger');
let kafkaProducer;
try { kafkaProducer = require('../config/kafka'); } catch (_) { }

const authMiddleware = require('../middleware/auth');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-prod';
const TOKEN_TTL_HOURS = Number(process.env.TOKEN_TTL_HOURS || 24);

// helper to create JWT
function createJwt(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${TOKEN_TTL_HOURS}h` });
}

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName = '', lastName = '' } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'email and password are required' });
    }

    const [exists] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (exists.length) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const hash = await bcrypt.hash(password, 12);
    const [r] = await db.execute(
      `INSERT INTO users (email, password, first_name, last_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [email, hash, firstName, lastName]
    );

    logger.info('User registered', { userId: r.insertId, email });
    if (kafkaProducer?.sendUserActivity) {
      kafkaProducer.sendUserActivity('REGISTER', r.insertId, req.ip, { email }).catch(() => {});
    }

    return res.status(201).json({ success: true, message: 'User registered' });
  } catch (e) {
    logger.error('Register failed', { error: e.message });
    return res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'email and password are required' });
    }

    const [rows] = await db.execute(
      'SELECT id, email, password, is_active, first_name, last_name FROM users WHERE email = ?',
      [email]
    );
    if (!rows.length) {
      logger.warn('Login: email not found', { email, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(401).json({ success: false, message: 'Account is inactive' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      logger.warn('Login: bad password', { userId: user.id, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = createJwt({ userId: user.id, email: user.email });
    const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 3600 * 1000);

    await db.execute('INSERT INTO user_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, token, expiresAt]);

    await db.execute('UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = ?',
      [user.id]);

    // Log login activity in JSON format with all required fields
    logger.info('User login', {
      timestamp: new Date().toISOString(),
      userId: user.id,
      action: 'LOGIN',
      ipAddress: req.ip,
      email: user.email
    });

    if (kafkaProducer?.sendUserActivity) {
      kafkaProducer.sendUserActivity('LOGIN', user.id, req.ip, { email: user.email }).catch(() => {});
      kafkaProducer.sendDatabaseChange('INSERT', 'user_tokens', { userId: user.id }).catch(() => {});
    }

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        expiresAt: expiresAt.toISOString(),
        user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name }
      }
    });
  } catch (e) {
    logger.error('Login failed', { error: e.message, email: req.body?.email });
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// LOGOUT (revokes token)
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (token) {
      await db.execute('UPDATE user_tokens SET is_valid = 0, updated_at = NOW() WHERE token = ?', [token]);
      if (kafkaProducer?.sendUserActivity) {
        kafkaProducer.sendUserActivity('LOGOUT', req.user.userId, req.ip, { email: req.user.email }).catch(() => {});
      }
    }
    return res.json({ success: true, message: 'Logout successful' });
  } catch (e) {
    logger.error('Logout failed', { error: e.message, userId: req.user?.userId });
    return res.status(500).json({ success: false, message: 'Logout failed' });
  }
});

// PROFILE 
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, email, first_name, last_name, created_at, last_login FROM users WHERE id = ?',
      [req.user.userId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });
    const u = rows[0];
    return res.json({
      success: true,
      data: {
        id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name,
        createdAt: u.created_at, lastLogin: u.last_login
      }
    });
  } catch (e) {
    logger.error('Profile failed', { error: e.message, userId: req.user?.userId });
    return res.status(500).json({ success: false, message: 'Failed to get user profile' });
  }
});

// VERIFY 
router.get('/verify', authMiddleware, (req, res) => {
  return res.json({ success: true, message: 'Token is valid', data: { userId: req.user.userId, email: req.user.email } });
});

module.exports = router;
