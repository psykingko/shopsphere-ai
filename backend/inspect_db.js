const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'shopsphere_dev',
  user: 'shopsphere_app',
  password: '0000',
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables:', res.rows.map(r => r.table_name));
    
    // Check sequences
    const seqs = await pool.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public'
    `);
    console.log('Sequences:', seqs.rows.map(r => r.sequence_name));
    
    // Check enums
    const enums = await pool.query(`
      SELECT t.typname, e.enumlabel
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
    `);
    console.log('Enums:', enums.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
