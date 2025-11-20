require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function addVolunteerIdColumn() {
  try {
    console.log('🔄 Adding volunteerId column to users table...\n');
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Add volunteerId column
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS "volunteerId" VARCHAR(255) NULL
    `);

    console.log('✅ Added volunteerId column\n');

    // Verify the column was added
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'volunteerId'
    `);

    if (columns.length > 0) {
      console.log('✅ Verification: volunteerId column exists');
    } else {
      console.log('❌ Verification failed: column not found');
    }

    // Check if any volunteers exist and need volunteerId
    const [volunteers] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE role = 'volunteer'
    `);

    console.log(`\n📊 Found ${volunteers[0].count} volunteer(s) in database`);

    if (volunteers[0].count > 0) {
      console.log('\n💡 Note: If volunteers exist without volunteerId, run:');
      console.log('   node assign-volunteer-ids.js');
    }

    await sequelize.close();
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

addVolunteerIdColumn();
