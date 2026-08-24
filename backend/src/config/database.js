const { Pool } = require('pg');
const config = require('./env');
const logger = require('../utils/logger');

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
});

pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle PostgreSQL client', { error: err.message });
});

/**
 * Validates the database connectivity with a minimal query.
 * Throws an error if the connection fails.
 */
async function validateConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
  } catch (err) {
    throw new Error(`PostgreSQL connection failed: ${err.message}`);
  }
}

/**
 * Cleanly shuts down the database connection pool.
 */
async function closePool() {
  try {
    await pool.end();
  } catch (err) {
    logger.error('Failed to close PostgreSQL pool cleanly', { error: err.message });
  }
}

module.exports = {
  pool,
  validateConnection,
  closePool,
};
