// Load environment variables first
require('dotenv').config();

const { sequelize } = require('../config/database');

async function addStallEmailAndDepartment() {
  try {
    console.log('🚀 Adding ownerEmail and department columns to stalls table...');

    // Add ownerEmail column
    await sequelize.query(`
      ALTER TABLE stalls 
      ADD COLUMN IF NOT EXISTS "ownerEmail" VARCHAR(255);
    `);

    console.log('✅ ownerEmail column added');

    // Add department column
    await sequelize.query(`
      ALTER TABLE stalls 
      ADD COLUMN IF NOT EXISTS department VARCHAR(255);
    `);

    console.log('✅ department column added');

    // Create index on department for faster filtering
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_stalls_department 
      ON stalls(department);
    `);

    console.log('✅ Department index created');

    // Verify columns
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'stalls' 
      AND column_name IN ('ownerEmail', 'department')
      ORDER BY column_name;
    `);

    console.log('\n📋 New Columns Added:');
    console.table(columns);

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addStallEmailAndDepartment();
