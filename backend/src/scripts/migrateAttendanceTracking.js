/**
 * Migration script to add attendance nullification and summary tracking features
 * Run this script to update existing database with new attendance tracking features
 */

// Load environment variables
require('dotenv').config();

const { sequelize } = require('../config/database');

const runMigration = async () => {
  console.log('🚀 Starting attendance tracking migration...');

  try {
    // Check if columns exist before adding them
    console.log('📝 Checking existing attendance table structure...');
    
    const attendanceColumns = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'attendances' 
        AND column_name IN ('isNullified', 'nullifiedDuration', 'nullifiedReason', 'eventStopTime')
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`Found ${attendanceColumns.length} existing new columns in attendances table`);

    // Add new columns to attendances table if they don't exist
    if (attendanceColumns.length < 4) {
      console.log('📝 Adding nullification columns to attendances table...');
      
      // Update status enum to include 'auto-checkout'
      await sequelize.query(`
        ALTER TYPE "enum_attendances_status" ADD VALUE IF NOT EXISTS 'auto-checkout'
      `);

      // Add isNullified column
      if (!attendanceColumns.some(col => col.column_name === 'isNullified')) {
        await sequelize.query(`
          ALTER TABLE "attendances" 
          ADD COLUMN IF NOT EXISTS "isNullified" BOOLEAN DEFAULT false
        `);
        console.log('✅ Added isNullified column');
      }

      // Add nullifiedDuration column  
      if (!attendanceColumns.some(col => col.column_name === 'nullifiedDuration')) {
        await sequelize.query(`
          ALTER TABLE "attendances" 
          ADD COLUMN IF NOT EXISTS "nullifiedDuration" INTEGER
        `);
        console.log('✅ Added nullifiedDuration column');
      }

      // Add nullifiedReason column
      if (!attendanceColumns.some(col => col.column_name === 'nullifiedReason')) {
        await sequelize.query(`
          ALTER TABLE "attendances" 
          ADD COLUMN IF NOT EXISTS "nullifiedReason" VARCHAR(255)
        `);
        console.log('✅ Added nullifiedReason column');
      }

      // Add eventStopTime column
      if (!attendanceColumns.some(col => col.column_name === 'eventStopTime')) {
        await sequelize.query(`
          ALTER TABLE "attendances" 
          ADD COLUMN IF NOT EXISTS "eventStopTime" TIMESTAMP WITH TIME ZONE
        `);
        console.log('✅ Added eventStopTime column');
      }
    } else {
      console.log('⏭️  Attendances table already has nullification columns');
    }

    // Create student_event_attendance_summaries table if it doesn't exist
    console.log('📝 Creating student_event_attendance_summaries table...');
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "student_event_attendance_summaries" (
        "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "eventId" UUID NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
        "studentId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "totalValidDuration" INTEGER DEFAULT 0,
        "totalNullifiedDuration" INTEGER DEFAULT 0,
        "totalSessions" INTEGER DEFAULT 0,
        "nullifiedSessions" INTEGER DEFAULT 0,
        "lastCheckInTime" TIMESTAMP WITH TIME ZONE,
        "currentStatus" VARCHAR(20) DEFAULT 'checked-out' CHECK ("currentStatus" IN ('checked-in', 'checked-out')),
        "hasImproperCheckouts" BOOLEAN DEFAULT false,
        "lastActivityDate" DATE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("eventId", "studentId")
      )
    `);
    console.log('✅ Created student_event_attendance_summaries table');

    // Create indexes for performance
    console.log('📝 Creating indexes...');
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_attendance_summaries_event_student" 
      ON "student_event_attendance_summaries"("eventId", "studentId")
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_attendance_summaries_event_status" 
      ON "student_event_attendance_summaries"("eventId", "currentStatus")
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_attendance_summaries_improper_checkouts" 
      ON "student_event_attendance_summaries"("hasImproperCheckouts")
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_attendances_nullified" 
      ON "attendances"("eventId", "studentId", "isNullified")
    `);

    console.log('✅ Created indexes');

    // Populate summary table with existing data
    console.log('📝 Populating attendance summaries from existing data...');
    
    await sequelize.query(`
      INSERT INTO "student_event_attendance_summaries" 
      ("eventId", "studentId", "totalValidDuration", "totalSessions", "lastCheckInTime", "currentStatus", "lastActivityDate", "createdAt", "updatedAt")
      SELECT 
        a."eventId",
        a."studentId",
        COALESCE(SUM(
          CASE 
            WHEN a."checkOutTime" IS NOT NULL AND a."isNullified" IS NOT true 
            THEN EXTRACT(EPOCH FROM (a."checkOutTime" - a."checkInTime"))::INTEGER
            ELSE 0 
          END
        ), 0) as "totalValidDuration",
        COUNT(*) as "totalSessions",
        MAX(a."checkInTime") as "lastCheckInTime",
        CASE 
          WHEN MAX(CASE WHEN a."checkOutTime" IS NULL THEN a."checkInTime" END) IS NOT NULL 
          THEN 'checked-in'::VARCHAR
          ELSE 'checked-out'::VARCHAR
        END as "currentStatus",
        CURRENT_DATE as "lastActivityDate",
        CURRENT_TIMESTAMP as "createdAt",
        CURRENT_TIMESTAMP as "updatedAt"
      FROM "attendances" a
      GROUP BY a."eventId", a."studentId"
      ON CONFLICT ("eventId", "studentId") DO NOTHING
    `);
    
    console.log('✅ Populated attendance summaries');

    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('New features available:');
    console.log('- Automatic nullification of incomplete sessions when events are stopped');
    console.log('- Cumulative attendance tracking across multiple days');
    console.log('- Warning system for improper checkouts');
    console.log('- Enhanced admin dashboard with attendance summaries');
    console.log('- Student dashboard showing nullified time warnings');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
};

// Run migration if called directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };