const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// We use native process.env for the simple script to avoid depending on complex setup
// Ensure environment variables are loaded by running `node --env-file=../../.env init_db.js`

async function initDB() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'shopsphere_dev',
    user: process.env.DB_USER || 'shopsphere_app',
    password: process.env.DB_PASSWORD || '0000',
  });

  const client = await pool.connect();
  
  try {
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Starting schema initialization...');
    await client.query('BEGIN');
    
    // Execute the raw DDL
    await client.query(schemaSql);
    
    await client.query('COMMIT');
    console.log('Schema initialization successful!');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Schema initialization failed! Rolling back transaction.');
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initDB();
