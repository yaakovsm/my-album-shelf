const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// ---- database config ----
const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 4000), 
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  connectTimeout: 60_000,
};

const DB_NAME = process.env.DB_NAME || 'my_album_shelf';

// ---- helper ----
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function waitForDatabase(maxRetries = 30, delayMs = 2000) {
  console.log('Waiting for database to be ready…');
  for (let i = 1; i <= maxRetries; i++) {
    try {
      const c = await mysql.createConnection(DB_CONFIG);
      await c.execute('SELECT 1');
      await c.end();
      console.log('Database reachable');
      return;
    } catch (e) {
      console.log(`  attempt ${i}/${maxRetries} failed: ${e.message}`);
      await sleep(delayMs);
    }
  }
  throw new Error('Could not connect to database after maximum retries');
}

async function createDatabase() {
  const c = await mysql.createConnection(DB_CONFIG);
  try {
    await c.execute(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
    console.log(`Database ${DB_NAME} ensured`);
  } finally {
    await c.end();
  }
}

async function createTables() {
  const dbc = await mysql.createConnection({ ...DB_CONFIG, database: DB_NAME });
  try {
    const createUsers = `
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name  VARCHAR(100),
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        last_login DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_users_created_at (created_at)
      )
    `;

    const createTokens = `
      CREATE TABLE IF NOT EXISTS user_tokens (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        token TEXT NOT NULL,
        is_valid TINYINT(1) NOT NULL DEFAULT 1,
        last_used DATETIME NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_tokens_user (user_id),
        CONSTRAINT fk_user_tokens_user FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `;

    const createAlbums = `
      CREATE TABLE IF NOT EXISTS albums (
        id           BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id      BIGINT NOT NULL,
        title        VARCHAR(200) NOT NULL,
        artist       VARCHAR(200) NOT NULL,
        genre        VARCHAR(100) NOT NULL,
        rating       TINYINT NOT NULL, 
        listened_at  DATE NOT NULL,
        created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_albums_user (user_id),
        INDEX idx_albums_user_genre (user_id, genre),
        INDEX idx_albums_user_rating (user_id, rating),
        CONSTRAINT fk_albums_user FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `;

    await dbc.execute(createUsers);
    console.log('users created/exists');
    await dbc.execute(createTokens);
    console.log('user_tokens created/exists');
    await dbc.execute(createAlbums);
    console.log('albums created/exists');
  } finally {
    await dbc.end();
  }
}

async function seedDefaults() {
  const dbc = await mysql.createConnection({ ...DB_CONFIG, database: DB_NAME });
  try {
    // default admin user
    const email = 'admin@my-album-shelf.local';
    const pass = 'admin123';

    const [exists] = await dbc.execute('SELECT id FROM users WHERE email = ?', [email]);
    let userId;
    if (exists.length) {
      userId = exists[0].id;
      console.log('default admin already exists');
    } else {
      const hash = await bcrypt.hash(pass, 12);
      const [res] = await dbc.execute(
        'INSERT INTO users (email, password, first_name, last_name, is_active) VALUES (?, ?, ?, ?, 1)',
        [email, hash, 'Admin', 'User']
      );
      userId = res.insertId;
      console.log('default admin created:', { email, password: pass });
    }

    // sample album 
    const [albumExists] = await dbc.execute(
      'SELECT id FROM albums WHERE user_id = ? LIMIT 1',
      [userId]
    );
    if (!albumExists.length) {
      await dbc.execute(
        'INSERT INTO albums (user_id, title, artist, genre, rating, listened_at) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, 'Paradise Again', 'Swedish House Mafia', 'House', 5, '2024-12-01']
      );
      console.log('sample album inserted for admin');
    }
  } finally {
    await dbc.end();
  }
}

(async function main() {
  try {
    console.log('DB init starting', { host: DB_CONFIG.host, port: DB_CONFIG.port, db: DB_NAME });
    await waitForDatabase();
    await createDatabase();
    await createTables();
    await seedDefaults();
    console.log('DB init done');
    process.exit(0);
  } catch (e) {
    console.error('DB init failed:', e.message);
    process.exit(1);
  }
})();
