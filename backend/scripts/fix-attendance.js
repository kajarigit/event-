/**
 * Fix Attendance Duplicate Constraint
 * Removes unique constraint to allow multiple check-ins/check-outs
 */

require('dotenv').config({ path: '../.env' });
const { Sequelize } = require('sequelize');

async function fixAttendanceConstraint() {
  console.log('========================================');
  console.log('Fix Attendance Duplicate Constraint');
  console.log('========================================\n');

  // Get database credentials from environment variables
  if (!process.env.DB_HOST || !process.env.DB_PASSWORD) {
    console.error('❌ ERROR: Missing database credentials!');
    console.error('Please set environment variables:');
    console.error('  - DB_HOST');
    console.error('  - DB_PORT (optional, default: 19044)');
    console.error('  - DB_NAME (optional, default: defaultdb)');
    console.error('  - DB_USER (optional, default: avnadmin)');
    console.error('  - DB_PASSWORD (required)');
    process.exit(1);
  }

  const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 19044,
    database: process.env.DB_NAME || 'defaultdb',
    username: process.env.DB_USER || 'avnadmin',
    password: process.env.DB_PASSWORD,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  };

  console.log('📡 Connecting to database...');
  console.log(`Host: ${dbConfig.host}`);
  console.log(`Database: ${dbConfig.database}\n`);

  const sequelize = new Sequelize(dbConfig);

  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    console.log('🔄 Running migration...\n');

    // Step 1: Drop unique constraint
    console.log('1. Removing unique constraint...');
    try {
      await sequelize.query(`
        ALTER TABLE "attendances" 
        DROP CONSTRAINT IF EXISTS "attendances_eventId_studentId_key"
      `);
      console.log('   ✅ Unique constraint removed\n');
    } catch (error) {
      if (error.message.includes('does not exist')) {
        console.log('   ℹ️  Constraint does not exist (already removed)\n');
      } else {
        throw error;
      }
    }

    // Step 2: Drop old index
    console.log('2. Removing old unique index...');
    try {
      await sequelize.query(`
        DROP INDEX IF EXISTS "attendances_event_id_student_id"
      `);
      console.log('   ✅ Old index removed\n');
    } catch (error) {
      console.log('   ℹ️  Index does not exist\n');
    }

    // Step 3: Create new non-unique indexes
    console.log('3. Creating performance indexes...');
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_attendances_event_student_time" 
      ON "attendances" ("eventId", "studentId", "checkInTime" DESC)
    `);
    console.log('   ✅ Created index: idx_attendances_event_student_time');

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_attendances_event_status" 
      ON "attendances" ("eventId", "status")
    `);
    console.log('   ✅ Created index: idx_attendances_event_status');

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_attendances_student" 
      ON "attendances" ("studentId")
    `);
    console.log('   ✅ Created index: idx_attendances_student\n');

    // Verify changes
    console.log('4. Verifying changes...');
    const [constraints] = await sequelize.query(`
      SELECT conname AS constraint_name, contype AS constraint_type
      FROM pg_constraint
      WHERE conrelid = 'attendances'::regclass
        AND conname LIKE '%eventId%'
    `);

    if (constraints.length === 0) {
      console.log('   ✅ No unique constraint found (correct!)\n');
    } else {
      console.log('   ⚠️  Constraints found:', constraints, '\n');
    }

    const [indexes] = await sequelize.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'attendances'
      ORDER BY indexname
    `);

    console.log('   📊 Current indexes:');
    indexes.forEach(idx => {
      console.log(`      - ${idx.indexname}`);
    });

    console.log('\n========================================');
    console.log('✅ SUCCESS! Migration completed!');
    console.log('========================================\n');

    console.log('Changes applied:');
    console.log('  ✅ Removed unique constraint on (eventId, studentId)');
    console.log('  ✅ Created performance indexes');
    console.log('  ✅ Students can now check-in/check-out multiple times\n');

    console.log('🧪 Next Steps:');
    console.log('1. Test scanning the same student QR code twice');
    console.log('2. Verify no "duplicate" errors occur');
    console.log('3. Add REDIS_URL environment variable for performance\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('📡 Database connection closed');
  }
}

// Run the migration
fixAttendanceConstraint()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
