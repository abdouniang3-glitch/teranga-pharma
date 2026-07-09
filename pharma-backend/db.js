// ============================================================
//  TERANGA PHARMA BACKEND — db.js
//  Pool PostgreSQL avec reconnexion automatique
// ============================================================
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'teranga_pharma',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,                  // connexions max dans le pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Erreur pool PostgreSQL:', err.message);
});

pool.on('connect', () => {
  console.log('[DB] Nouvelle connexion PostgreSQL établie');
});

// Wrapper avec logging
const db = {
  async query(text, params) {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const dur = Date.now() - start;
      if (dur > 500) console.warn(`[DB] Requête lente (${dur}ms): ${text.substring(0,60)}`);
      return res;
    } catch (err) {
      console.error('[DB] Erreur requête:', err.message, '\nSQL:', text.substring(0, 100));
      throw err;
    }
  },

  async transaction(callback) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async healthCheck() {
    const res = await this.query('SELECT NOW() as time, version() as pg_version');
    return { ok: true, time: res.rows[0].time, version: res.rows[0].pg_version };
  }
};

module.exports = db;
