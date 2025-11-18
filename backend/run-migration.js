require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🔄 Starting database migration...\n');

  // Create PostgreSQL client
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
    // Connect to database
    console.log('📡 Connecting to database...');
    console.log(`   Host: ${process.env.DB_HOST}`);
    console.log(`   Database: ${process.env.DB_NAME}`);
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'database', 'migrations', '001_add_owner_password.sql');
    console.log('📄 Reading migration file...');
    console.log(`   Path: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded\n');

    // Run migration
    console.log('🔧 Running migration...');
    console.log('-----------------------------------');
    console.log(migrationSQL);
    console.log('-----------------------------------\n');

    await client.query(migrationSQL);
    console.log('✅ Migration completed successfully!\n');

    // Verify the column was added
    console.log('🔍 Verifying column was added...');
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'stalls' AND column_name = 'ownerPassword';
    `);

    if (result.rows.length > 0) {
      console.log('✅ Column verified:');
      console.log('   Column Name:', result.rows[0].column_name);
      console.log('   Data Type:', result.rows[0].data_type);
      console.log('   Nullable:', result.rows[0].is_nullable);
      console.log('\n🎉 Migration successful! Database is ready.');
    } else {
      console.log('⚠️  Warning: Column not found after migration');
    }

  } catch (error) {
    console.error('❌ Migration failed:');
    console.error('   Error:', error.message);
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
    process.exit(1);
  } finally {
    // Close connection
    await client.end();
    console.log('\n📡 Database connection closed');
  }
}

// Run the migration
runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
