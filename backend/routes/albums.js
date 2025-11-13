const express = require('express');
const { body, query, validationResult } = require('express-validator');

const db = require('../config/database');
const logger = require('../config/logger');
const auth = require('../middleware/auth');

let kafkaProducer;
try { kafkaProducer = require('../config/kafka'); } catch (_) { }

const router = express.Router();

/** POST /api/albums
 * body: { title, artist, genre, rating (1-5), listenedAt (YYYY-MM-DD) }
 */
router.post(
  '/',
  auth,
  [
    body('title').trim().isLength({ min: 1, max: 200 }),
    body('artist').trim().isLength({ min: 1, max: 200 }),
    body('genre').trim().isLength({ min: 1, max: 100 }),
    body('rating').isInt({ min: 1, max: 5 }),
    body('listenedAt').isISO8601({ strict: true }).toDate()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { title, artist, genre, rating, listenedAt } = req.body;
    const userId = req.user.userId;

    try {
      const [r] = await db.execute(
        `INSERT INTO albums (user_id, title, artist, genre, rating, listened_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, title, artist, genre, rating, listenedAt]
      );

      logger.info('Album added', { userId, albumId: r.insertId, title, artist, rating });

      //log to Kafka
      kafkaProducer?.sendUserActivity('ADD_ALBUM', userId, req.ip, { title, artist, genre, rating })
        .catch(() => {});
      kafkaProducer?.sendDatabaseChange('INSERT', 'albums', { userId, albumId: r.insertId })
        .catch(() => {});

      return res.status(201).json({
        success: true,
        data: { id: r.insertId, title, artist, genre, rating, listenedAt }
      });
    } catch (e) {
      logger.error('Add album failed', { error: e.message, userId });
      return res.status(500).json({ success: false, message: 'Failed to add album' });
    }
  }
);

/** GET /api/albums
 * query: genre?, minRating?, limit?, offset?, orderBy?(listened_at|rating|created_at), order?(asc|desc)
 */
router.get(
  '/',
  auth,
  [
    query('genre').optional().isLength({ min: 1, max: 100 }),
    query('minRating').optional().isInt({ min: 1, max: 5 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    query('orderBy').optional().isIn(['listened_at', 'rating', 'created_at']),
    query('order').optional().isIn(['asc', 'desc'])
  ],
  async (req, res) => {
    const userId = req.user.userId;
    const {
      genre,
      minRating,
      limit = 20,
      offset = 0,
      orderBy = 'listened_at',
      order = 'desc'
    } = req.query;

    const params = [userId];
    const where = ['user_id = ?'];

    if (genre) {
      where.push('genre = ?');
      params.push(genre);
    }
    if (minRating) {
      where.push('rating >= ?');
      params.push(Number(minRating));
    }

    const sql =
      `SELECT id, title, artist, genre, rating, listened_at AS listenedAt, created_at AS createdAt
       FROM albums
       WHERE ${where.join(' AND ')}
       ORDER BY ${orderBy} ${order.toUpperCase()}
       LIMIT ? OFFSET ?`;

    params.push(Number(limit), Number(offset));

    try {
      const [rows] = await db.execute(sql, params);
      return res.json({ success: true, data: rows });
    } catch (e) {
      logger.error('List albums failed', { error: e.message, userId });
      return res.status(500).json({ success: false, message: 'Failed to list albums' });
    }
  }
);

/** GET /api/albums/stats
 * returns: total, avgRating, topRated(5), byGenre
 */
router.get('/stats', auth, async (req, res) => {
  const userId = req.user.userId;

  try {
    // general totals
    const [[totals]] = await db.execute(
      `SELECT COUNT(*) AS total, AVG(rating) AS avgRating
       FROM albums WHERE user_id = ?`, [userId]
    );

    // top 5 by rating and then by listenedAt
    const [topRated] = await db.execute(
      `SELECT id, title, artist, genre, rating, listened_at AS listenedAt
       FROM albums
       WHERE user_id = ?
       ORDER BY rating DESC, listened_at DESC
       LIMIT 5`, [userId]
    );

    // split by genre
    const [byGenre] = await db.execute(
      `SELECT genre, COUNT(*) AS count, ROUND(AVG(rating),2) AS avgRating
       FROM albums
       WHERE user_id = ?
       GROUP BY genre
       ORDER BY count DESC`, [userId]
    );

    return res.json({
      success: true,
      data: {
        total: totals.total || 0,
        avgRating: totals.avgRating ? Number(totals.avgRating).toFixed(2) : null,
        topRated,
        byGenre
      }
    });
  } catch (e) {
    logger.error('Stats failed', { error: e.message, userId });
    return res.status(500).json({ success: false, message: 'Failed to get stats' });
  }
});

module.exports = router;
