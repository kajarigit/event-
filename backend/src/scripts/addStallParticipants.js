// Load environment variables first
require('dotenv').config();

const { sequelize } = require('../config/database');

async function addStallParticipants() {
  try {
    console.log('Starting Stall participants migration...');

    // Add participants column
    await sequelize.query(`
      ALTER TABLE stalls 
      ADD COLUMN IF NOT EXISTS "participants" TEXT;
    `);

    console.log('✓ Added participants column (JSON field)');

    // Verify changes
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stalls' 
      AND column_name = 'participants';
    `);

    if (columns.length > 0) {
      console.log('\n✅ Stall participants migration completed successfully!');
      console.log('ℹ️  Participants will be stored as JSON array with format:');
      console.log('   [{ "name": "John Doe", "regNo": "REG123", "department": "CS" }]');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addStallParticipants();
