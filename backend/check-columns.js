require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function checkColumns() {
  try {
    await sequelize.authenticate();
    
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    console.log('📊 Users table columns:\n');
    columns.forEach(col => {
      console.log(`  - ${col.column_name.padEnd(30)} (${col.data_type})`);
    });
    
    // Check for volunteerId
    const hasVolunteerId = columns.some(c => c.column_name === 'volunteerId');
    console.log('\n✅ Has volunteerId column:', hasVolunteerId);
    
    if (!hasVolunteerId) {
      console.log('\n⚠️  volunteerId column is MISSING!');
      console.log('This is causing the 500 error.');
    }
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkColumns();
