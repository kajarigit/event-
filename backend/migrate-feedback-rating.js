const { sequelize } = require('./src/config/database');

async function runMigration() {
  try {
    console.log('🔄 Starting feedback table migration...');
    
    // Add new columns
    console.log('📝 Adding new rating columns...');
    
    await sequelize.query(`
      ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS "qualityRating" INTEGER;
    `);
    
    await sequelize.query(`
      ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS "serviceRating" INTEGER;
    `);
    
    await sequelize.query(`
      ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS "innovationRating" INTEGER;
    `);
    
    await sequelize.query(`
      ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS "presentationRating" INTEGER;
    `);
    
    await sequelize.query(`
      ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS "valueRating" INTEGER;
    `);
    
    await sequelize.query(`
      ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS "averageRating" DECIMAL(3, 2);
    `);

    // Check if we have existing data
    const [existingFeedbacks] = await sequelize.query(`
      SELECT COUNT(*) as count FROM feedbacks;
    `);
    
    const feedbackCount = parseInt(existingFeedbacks[0].count);
    console.log(`📊 Found ${feedbackCount} existing feedbacks`);

    if (feedbackCount > 0) {
      console.log('🔄 Migrating existing data...');
      // For existing data, populate new columns with the old rating value
      await sequelize.query(`
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
      console.log('✅ Existing data migrated successfully');
    }

    // Add constraints
    console.log('🔒 Adding constraints...');
    
    try {
      await sequelize.query(`
        ALTER TABLE feedbacks ADD CONSTRAINT "feedbacks_qualityRating_check" 
        CHECK ("qualityRating" >= 1 AND "qualityRating" <= 5);
      `);
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.log('⚠️ Quality rating constraint may already exist');
      }
    }

    try {
      await sequelize.query(`
        ALTER TABLE feedbacks ADD CONSTRAINT "feedbacks_serviceRating_check" 
        CHECK ("serviceRating" >= 1 AND "serviceRating" <= 5);
      `);
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.log('⚠️ Service rating constraint may already exist');
      }
    }

    try {
      await sequelize.query(`
        ALTER TABLE feedbacks ADD CONSTRAINT "feedbacks_innovationRating_check" 
        CHECK ("innovationRating" >= 1 AND "innovationRating" <= 5);
      `);
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.log('⚠️ Innovation rating constraint may already exist');
      }
    }

    try {
      await sequelize.query(`
        ALTER TABLE feedbacks ADD CONSTRAINT "feedbacks_presentationRating_check" 
        CHECK ("presentationRating" >= 1 AND "presentationRating" <= 5);
      `);
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.log('⚠️ Presentation rating constraint may already exist');
      }
    }

    try {
      await sequelize.query(`
        ALTER TABLE feedbacks ADD CONSTRAINT "feedbacks_valueRating_check" 
        CHECK ("valueRating" >= 1 AND "valueRating" <= 5);
      `);
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.log('⚠️ Value rating constraint may already exist');
      }
    }

    try {
      await sequelize.query(`
        ALTER TABLE feedbacks ADD CONSTRAINT "feedbacks_averageRating_check" 
        CHECK ("averageRating" >= 1.00 AND "averageRating" <= 5.00);
      `);
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.log('⚠️ Average rating constraint may already exist');
      }
    }

    // Create indexes
    console.log('📊 Creating indexes...');
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_feedbacks_qualityRating" ON feedbacks("qualityRating");
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_feedbacks_serviceRating" ON feedbacks("serviceRating");
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_feedbacks_innovationRating" ON feedbacks("innovationRating");
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_feedbacks_presentationRating" ON feedbacks("presentationRating");
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_feedbacks_valueRating" ON feedbacks("valueRating");
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_feedbacks_averageRating" ON feedbacks("averageRating");
    `);

    // Set NOT NULL constraints after populating data
    if (feedbackCount > 0) {
      console.log('🔒 Setting NOT NULL constraints...');
      
      await sequelize.query(`
        ALTER TABLE feedbacks ALTER COLUMN "qualityRating" SET NOT NULL;
      `);
      
      await sequelize.query(`
        ALTER TABLE feedbacks ALTER COLUMN "serviceRating" SET NOT NULL;
      `);
      
      await sequelize.query(`
        ALTER TABLE feedbacks ALTER COLUMN "innovationRating" SET NOT NULL;
      `);
      
      await sequelize.query(`
        ALTER TABLE feedbacks ALTER COLUMN "presentationRating" SET NOT NULL;
      `);
      
      await sequelize.query(`
        ALTER TABLE feedbacks ALTER COLUMN "valueRating" SET NOT NULL;
      `);
      
      await sequelize.query(`
        ALTER TABLE feedbacks ALTER COLUMN "averageRating" SET NOT NULL;
      `);
    }

    console.log('✅ Migration completed successfully!');
    
    // Verify the changes
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'feedbacks' 
      AND column_name IN ('qualityRating', 'serviceRating', 'innovationRating', 'presentationRating', 'valueRating', 'averageRating')
      ORDER BY column_name;
    `);
    
    console.log('\n📋 New columns added:');
    columns.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULLABLE'})`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };