const { sequelize } = require('./src/config/database');

async function addPlainTextPasswordColumn() {
  try {
    console.log('🔄 Starting migration to add plainTextPassword column...');
    
    // Add the new column to the stalls table
    await sequelize.query(`
      ALTER TABLE stalls 
      ADD COLUMN IF NOT EXISTS "plainTextPassword" VARCHAR(255);
    `);
    
    console.log('✅ Successfully added plainTextPassword column to stalls table');
    
    // Check if the column was added successfully
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'stalls' AND column_name = 'plainTextPassword';
    `);
    
    if (results.length > 0) {
      console.log('✅ Column verification successful:', results[0]);
    } else {
      console.log('⚠️  Column not found - might already exist or migration failed');
    }
    
    // Show current stalls count
    const [stallsCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM stalls;
    `);
    
    console.log(`📊 Current stalls in database: ${stallsCount[0].count}`);
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the migration
addPlainTextPasswordColumn();