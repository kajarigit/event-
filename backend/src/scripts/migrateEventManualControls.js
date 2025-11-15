/**
 * Migration script to add manuallyStarted and manuallyEnded columns to events table
 * Run this once to update existing database
 */

require('dotenv').config();
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

async function migrate() {
  try {
    console.log('🔄 Starting migration...');
    
    // Check if columns already exist
    const columns = await sequelize.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'events' AND column_name IN ('manuallyStarted', 'manuallyEnded')`,
      { type: QueryTypes.SELECT }
    );

    if (columns.length === 2) {
      console.log('✅ Columns already exist, skipping migration');
      process.exit(0);
    }

    console.log('📝 Adding manuallyStarted column...');
    await sequelize.query(
      `ALTER TABLE events 
       ADD COLUMN IF NOT EXISTS "manuallyStarted" BOOLEAN DEFAULT false`,
      { type: QueryTypes.RAW }
    );

    console.log('📝 Adding manuallyEnded column...');
    await sequelize.query(
      `ALTER TABLE events 
       ADD COLUMN IF NOT EXISTS "manuallyEnded" BOOLEAN DEFAULT false`,
      { type: QueryTypes.RAW }
    );

    console.log('📝 Making startDate and endDate nullable...');
    await sequelize.query(
      `ALTER TABLE events 
       ALTER COLUMN "startDate" DROP NOT NULL,
       ALTER COLUMN "endDate" DROP NOT NULL`,
      { type: QueryTypes.RAW }
    );

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
