// Load environment variables first
require('dotenv').config();

const { sequelize } = require('../config/database');

async function updateUserFields() {
  try {
    console.log('Starting User table migration...');

    // Add new fields
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS "regNo" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "faculty" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "programme" VARCHAR(255);
    `);

    console.log('✓ Added regNo, faculty, and programme columns');

    // Copy rollNumber to regNo if it exists
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'rollNumber';
    `);

    if (results.length > 0) {
      await sequelize.query(`
        UPDATE users 
        SET "regNo" = "rollNumber" 
        WHERE "rollNumber" IS NOT NULL AND "regNo" IS NULL;
      `);
      console.log('✓ Copied rollNumber data to regNo');

      // Drop rollNumber column
      await sequelize.query(`
        ALTER TABLE users DROP COLUMN IF EXISTS "rollNumber";
      `);
      console.log('✓ Removed rollNumber column');
    }

    // Verify changes
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('regNo', 'faculty', 'programme', 'department');
    `);

    console.log('\nCurrent user columns:', columns.map(c => c.column_name));
    console.log('\n✅ User table migration completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

updateUserFields();
