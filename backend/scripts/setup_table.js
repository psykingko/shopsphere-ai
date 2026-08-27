const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'shopsphere_dev',
  user: process.env.DB_USER || 'shopsphere_app',
  password: process.env.DB_PASSWORD || '0000',
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
          id UUID PRIMARY KEY,
          idempotency_key VARCHAR NOT NULL,
          operation VARCHAR NOT NULL,
          request_fingerprint VARCHAR NOT NULL,
          response_status INTEGER NOT NULL,
          response_body JSONB NOT NULL,
          created_at TIMESTAMP NOT NULL,
          UNIQUE(idempotency_key, operation)
      );
    `);
    console.log("Table created.");
  } finally {
    client.release();
    await pool.end();
  }
}
run();
