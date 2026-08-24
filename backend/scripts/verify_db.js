const { Pool } = require('pg');

async function verifyDB() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'shopsphere_dev',
    user: process.env.DB_USER || 'shopsphere_app',
    password: process.env.DB_PASSWORD || '0000',
  });

  const client = await pool.connect();
  
  try {
    console.log('--- ENUMS ---');
    const enums = await client.query(`
      SELECT t.typname, e.enumlabel
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder;
    `);
    const enumMap = {};
    for (const row of enums.rows) {
      if (!enumMap[row.typname]) enumMap[row.typname] = [];
      enumMap[row.typname].push(row.enumlabel);
    }
    console.log(JSON.stringify(enumMap, null, 2));

    console.log('\n--- TABLES & COLUMNS ---');
    const cols = await client.query(`
      SELECT table_name, column_name, data_type, udt_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `);
    const tableMap = {};
    for (const row of cols.rows) {
      if (!tableMap[row.table_name]) tableMap[row.table_name] = [];
      tableMap[row.table_name].push({
        col: row.column_name,
        type: row.data_type === 'USER-DEFINED' ? row.udt_name : row.data_type,
        nullable: row.is_nullable
      });
    }
    console.log(JSON.stringify(tableMap, null, 2));

    console.log('\n--- CONSTRAINTS (PK/FK/UNIQUE) ---');
    const constraints = await client.query(`
      SELECT 
          tc.table_name, 
          tc.constraint_name, 
          tc.constraint_type, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu 
        ON tc.constraint_name = kcu.constraint_name 
        AND tc.table_schema = kcu.table_schema 
      LEFT JOIN information_schema.constraint_column_usage AS ccu 
        ON ccu.constraint_name = tc.constraint_name 
        AND ccu.table_schema = tc.table_schema 
      WHERE tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_type;
    `);
    const constraintMap = {};
    for (const row of constraints.rows) {
      if (!constraintMap[row.table_name]) constraintMap[row.table_name] = [];
      constraintMap[row.table_name].push({
        name: row.constraint_name,
        type: row.constraint_type,
        col: row.column_name,
        f_table: row.foreign_table_name,
        f_col: row.foreign_column_name
      });
    }
    console.log(JSON.stringify(constraintMap, null, 2));
    
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyDB();
