const mysql = require('mysql2/promise');
const logger = require('./logger');

const cfg = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 4000), 
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'my_album_shelf',
  waitForConnections: true,
  connectionLimit: 10,
};

let pool = null;

async function ensurePool() {
  if (!pool) {
    try {
      pool = mysql.createPool(cfg);
      await pool.query('SELECT 1');
      logger.info('DB pool created');
    } catch (e) {
      logger.warn('DB not available, running in no-DB mode', { error: e.message });
      pool = null;
    }
  }
  return pool;
}

async function execute(sql, params = []) {
  const p = await ensurePool();
  if (!p) throw new Error('DB not connected');
  return p.execute(sql, params);
}

async function ping() {
  const p = await ensurePool();
  if (!p) return false;
  await p.query('SELECT 1');
  return true;
}

async function end() {
  if (!pool) return;
  await pool.end();
  logger.info('DB pool closed');
}

module.exports = { execute, ping, end };