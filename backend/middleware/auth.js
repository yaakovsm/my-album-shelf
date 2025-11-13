const jwt = require('jsonwebtoken');
const db = require('../config/database');
const logger = require('../config/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-prod';

module.exports = async function authMiddleware(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }

    const token = auth.slice('Bearer '.length).trim();

    // JWT signature/expiration verification
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      const reason = e.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token';
      logger.warn('JWT verify failed', { reason, ip: req.ip });
      return res.status(401).json({ success: false, message: reason });
    }

    // check if the token is valid, not expired and active in the database
    const [rows] = await db.execute(
      `SELECT ut.id as token_id, ut.user_id, ut.is_valid, ut.expires_at,
              u.email, u.is_active
       FROM user_tokens ut
       JOIN users u ON u.id = ut.user_id
       WHERE ut.token = ? AND ut.is_valid = 1 AND ut.expires_at > NOW()`,
      [token]
    );

    if (rows.length === 0) {
      logger.warn('Token not valid in DB', { ip: req.ip });
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const rec = rows[0];
    if (!rec.is_active) {
      logger.warn('Inactive user used token', { userId: rec.user_id, ip: req.ip });
      return res.status(401).json({ success: false, message: 'User account is inactive' });
    }

    // attach identity to request
    req.user = { userId: rec.user_id, email: rec.email, tokenId: rec.token_id };

    // update last used (do not stop the flow if it fails)
    db.execute('UPDATE user_tokens SET last_used = NOW() WHERE id = ?', [rec.token_id])
      .catch(err => logger.warn('Failed to update last_used', { error: err.message }));

    return next();
  } catch (err) {
    logger.error('Auth middleware error', { error: err.message, ip: req.ip });
    return res.status(500).json({ success: false, message: 'Authentication failed' });
  }
};
