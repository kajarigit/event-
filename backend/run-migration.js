require('dotenv').config();
const { Client } = require('pg');

async function runMigration() {
  console.log('🔄 Starting feedback ratings migration...\n');

  // Create PostgreSQL client with direct connection
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

    // Add new columns
    console.log('📝 Adding new rating columns...');
    
    await client.query(`
      ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS "qualityRating" INTEGER;
    `);
    console.log('✅ Added qualityRating column');
    
    await client.query(`
      ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS "serviceRating" INTEGER;
    `);
    console.log('✅ Added serviceRating column');
    
    await client.query(`
      ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS "innovationRating" INTEGER;
    `);
    console.log('✅ Added innovationRating column');
    
    await client.query(`
      ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS "presentationRating" INTEGER;
    `);
    console.log('✅ Added presentationRating column');
    
    await client.query(`
      ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS "valueRating" INTEGER;
    `);
    console.log('✅ Added valueRating column');
    
    await client.query(`
      ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS "averageRating" DECIMAL(3, 2);
    `);
    console.log('✅ Added averageRating column\n');

    // Check if we have existing data
    const existingFeedbacks = await client.query(`SELECT COUNT(*) as count FROM feedbacks;`);
    const feedbackCount = parseInt(existingFeedbacks.rows[0].count);
    console.log(`📊 Found ${feedbackCount} existing feedbacks`);

    if (feedbackCount > 0) {
      console.log('🔄 Migrating existing data...');
      // For existing data, populate new columns with the old rating value
      await client.query(`
        UPDATE feedbacks 
        SET 
            "qualityRating" = rating,
            "serviceRating" = rating,
            "innovationRating" = rating,
            "presentationRating" = rating,
            "valueRating" = rating,
            "averageRating" = rating::decimal(3,2)
        WHERE "qualityRating" IS NULL;
      `);
      console.log('✅ Existing data migrated successfully\n');
    }

    // Add constraints (with error handling for already existing constraints)
    console.log('🔒 Adding constraints...');
    
    const constraintQueries = [
      { name: 'qualityRating_check', sql: `ALTER TABLE feedbacks ADD CONSTRAINT "feedbacks_qualityRating_check" CHECK ("qualityRating" >= 1 AND "qualityRating" <= 5);` },
      { name: 'serviceRating_check', sql: `ALTER TABLE feedbacks ADD CONSTRAINT "feedbacks_serviceRating_check" CHECK ("serviceRating" >= 1 AND "serviceRating" <= 5);` },
      { name: 'innovationRating_check', sql: `ALTER TABLE feedbacks ADD CONSTRAINT "feedbacks_innovationRating_check" CHECK ("innovationRating" >= 1 AND "innovationRating" <= 5);` },
      { name: 'presentationRating_check', sql: `ALTER TABLE feedbacks ADD CONSTRAINT "feedbacks_presentationRating_check" CHECK ("presentationRating" >= 1 AND "presentationRating" <= 5);` },
      { name: 'valueRating_check', sql: `ALTER TABLE feedbacks ADD CONSTRAINT "feedbacks_valueRating_check" CHECK ("valueRating" >= 1 AND "valueRating" <= 5);` },
      { name: 'averageRating_check', sql: `ALTER TABLE feedbacks ADD CONSTRAINT "feedbacks_averageRating_check" CHECK ("averageRating" >= 1.00 AND "averageRating" <= 5.00);` }
    ];

    for (const constraint of constraintQueries) {
      try {
        await client.query(constraint.sql);
        console.log(`✅ Added ${constraint.name} constraint`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`⚠️ ${constraint.name} constraint already exists - skipping`);
        } else {
          console.log(`❌ Failed to add ${constraint.name} constraint:`, err.message);
        }
      }
    }

    // Create indexes
    console.log('\n📊 Creating indexes...');
    
    const indexQueries = [
      { name: 'idx_feedbacks_qualityRating', sql: `CREATE INDEX IF NOT EXISTS "idx_feedbacks_qualityRating" ON feedbacks("qualityRating");` },
      { name: 'idx_feedbacks_serviceRating', sql: `CREATE INDEX IF NOT EXISTS "idx_feedbacks_serviceRating" ON feedbacks("serviceRating");` },
      { name: 'idx_feedbacks_innovationRating', sql: `CREATE INDEX IF NOT EXISTS "idx_feedbacks_innovationRating" ON feedbacks("innovationRating");` },
      { name: 'idx_feedbacks_presentationRating', sql: `CREATE INDEX IF NOT EXISTS "idx_feedbacks_presentationRating" ON feedbacks("presentationRating");` },
      { name: 'idx_feedbacks_valueRating', sql: `CREATE INDEX IF NOT EXISTS "idx_feedbacks_valueRating" ON feedbacks("valueRating");` },
      { name: 'idx_feedbacks_averageRating', sql: `CREATE INDEX IF NOT EXISTS "idx_feedbacks_averageRating" ON feedbacks("averageRating");` }
    ];

    for (const index of indexQueries) {
      try {
        await client.query(index.sql);
        console.log(`✅ Created ${index.name}`);
      } catch (err) {
        console.log(`⚠️ Index ${index.name}:`, err.message);
      }
    }

    console.log('\n✅ Migration completed successfully!');
    
    // Verify the changes
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'feedbacks' 
      AND column_name IN ('qualityRating', 'serviceRating', 'innovationRating', 'presentationRating', 'valueRating', 'averageRating')
      ORDER BY column_name;
    `);
    
    console.log('\n📋 New columns added:');
    columns.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULLABLE'})`);
    });
    
    console.log('\n🎉 Migration completed! You can now:');
    console.log('1. Restart your backend server');
    console.log('2. Test the new 5-category feedback system');
    console.log('3. Enable the detailed feedback analytics routes');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
    throw error;
  } finally {
    await client.end();
    console.log('\n📡 Database connection closed');
  }
}

// Run the migration
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('\n🎉 Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { runMigration };
