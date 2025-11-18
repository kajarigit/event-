require('dotenv').config();
const { Client } = require('pg');

async function checkTables() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? {
      rejectUnauthorized: false
    } : false
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get all tables
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('📊 Tables in database:');
    console.log('-----------------------------------');
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    console.log('-----------------------------------\n');

    // Check for stalls table specifically
    const stallsCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name = 'stalls' OR table_name = 'Stalls')
      LIMIT 1;
    `);

    if (stallsCheck.rows.length > 0) {
      const tableName = stallsCheck.rows[0].table_name;
      console.log(`✅ Found stalls table: "${tableName}"\n`);

      // Get columns
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);

      console.log(`📋 Columns in "${tableName}":`);
      console.log('-----------------------------------');
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
      console.log('-----------------------------------');
    } else {
      console.log('❌ Stalls table not found!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTables();
