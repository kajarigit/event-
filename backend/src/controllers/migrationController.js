const { sequelize } = require('../config/database');

/**
 * @desc    Run migration to add 5-category rating fields to feedbacks table
 * @route   POST /api/admin/migrate/feedback-ratings
 * @access  Private (Admin)
 */
exports.runFeedbackRatingMigration = async (req, res, next) => {
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

    // Add constraints (with error handling for already existing constraints)
    console.log('🔒 Adding constraints...');
    
    const constraintQueries = [
      {
        name: 'qualityRating_check',
        query: `ALTER TABLE feedbacks ADD CONSTRAINT "feedbacks_qualityRating_check" CHECK ("qualityRating" >= 1 AND "qualityRating" <= 5);`
      },
      {
        name: 'serviceRating_check',
        query: `ALTER TABLE feedbacks ADD CONSTRAINT "feedbacks_serviceRating_check" CHECK ("serviceRating" >= 1 AND "serviceRating" <= 5);`
      },
      {
        name: 'innovationRating_check',
        query: `ALTER TABLE feedbacks ADD CONSTRAINT "feedbacks_innovationRating_check" CHECK ("innovationRating" >= 1 AND "innovationRating" <= 5);`
      },
      {
        name: 'presentationRating_check',
        query: `ALTER TABLE feedbacks ADD CONSTRAINT "feedbacks_presentationRating_check" CHECK ("presentationRating" >= 1 AND "presentationRating" <= 5);`
      },
      {
        name: 'valueRating_check',
        query: `ALTER TABLE feedbacks ADD CONSTRAINT "feedbacks_valueRating_check" CHECK ("valueRating" >= 1 AND "valueRating" <= 5);`
      },
      {
        name: 'averageRating_check',
        query: `ALTER TABLE feedbacks ADD CONSTRAINT "feedbacks_averageRating_check" CHECK ("averageRating" >= 1.00 AND "averageRating" <= 5.00);`
      }
    ];

    for (const constraint of constraintQueries) {
      try {
        await sequelize.query(constraint.query);
        console.log(`✅ Added ${constraint.name} constraint`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`⚠️ ${constraint.name} constraint already exists - skipping`);
        } else {
          console.log(`❌ Failed to add ${constraint.name}:`, err.message);
        }
      }
    }

    // Create indexes
    console.log('📊 Creating indexes...');
    
    const indexQueries = [
      `CREATE INDEX IF NOT EXISTS "idx_feedbacks_qualityRating" ON feedbacks("qualityRating");`,
      `CREATE INDEX IF NOT EXISTS "idx_feedbacks_serviceRating" ON feedbacks("serviceRating");`,
      `CREATE INDEX IF NOT EXISTS "idx_feedbacks_innovationRating" ON feedbacks("innovationRating");`,
      `CREATE INDEX IF NOT EXISTS "idx_feedbacks_presentationRating" ON feedbacks("presentationRating");`,
      `CREATE INDEX IF NOT EXISTS "idx_feedbacks_valueRating" ON feedbacks("valueRating");`,
      `CREATE INDEX IF NOT EXISTS "idx_feedbacks_averageRating" ON feedbacks("averageRating");`
    ];

    for (const indexQuery of indexQueries) {
      try {
        await sequelize.query(indexQuery);
      } catch (err) {
        console.log('Index creation warning:', err.message);
      }
    }

    // Set NOT NULL constraints after populating data
    if (feedbackCount > 0) {
      console.log('🔒 Setting NOT NULL constraints...');
      
      const notNullQueries = [
        `ALTER TABLE feedbacks ALTER COLUMN "qualityRating" SET NOT NULL;`,
        `ALTER TABLE feedbacks ALTER COLUMN "serviceRating" SET NOT NULL;`,
        `ALTER TABLE feedbacks ALTER COLUMN "innovationRating" SET NOT NULL;`,
        `ALTER TABLE feedbacks ALTER COLUMN "presentationRating" SET NOT NULL;`,
        `ALTER TABLE feedbacks ALTER COLUMN "valueRating" SET NOT NULL;`,
        `ALTER TABLE feedbacks ALTER COLUMN "averageRating" SET NOT NULL;`
      ];

      for (const query of notNullQueries) {
        try {
          await sequelize.query(query);
        } catch (err) {
          console.log('NOT NULL constraint warning:', err.message);
        }
      }
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
    
    res.status(200).json({
      success: true,
      message: 'Feedback rating migration completed successfully!',
      data: {
        existingFeedbacks: feedbackCount,
        newColumns: columns,
        migratedData: feedbackCount > 0
      }
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: error.message
    });
  }
};