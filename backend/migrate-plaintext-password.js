require('dotenv').config();
const { Sequelize } = require('sequelize');

async function addPlainTextPasswordColumn() {
  let sequelize;
  
  try {
    console.log('🔄 Starting migration to add plainTextPassword column...');
    
    // Create Sequelize instance using same config as main app
    if (process.env.DATABASE_URL) {
      const cleanUrl = process.env.DATABASE_URL.replace(/\?sslmode=require$/, '');
      sequelize = new Sequelize(cleanUrl, {
        dialect: 'postgres',
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        },
        logging: false // Disable logging for migration
      });
    } else {
      sequelize = new Sequelize(
        process.env.DB_NAME || 'defaultdb',
        process.env.DB_USER || 'avnadmin', 
        process.env.DB_PASSWORD,
        {
          host: process.env.DB_HOST,
          port: process.env.DB_PORT || 19044,
          dialect: 'postgres',
          dialectOptions: {
            ssl: process.env.DB_SSL === 'true' ? {
              require: true,
              rejectUnauthorized: false
            } : false
          },
          logging: false
        }
      );
    }
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Connected to database');
    
    // Check if column already exists
    const [existingColumns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stalls' AND column_name = 'plainTextPassword';
    `);
    
    if (existingColumns.length > 0) {
      console.log('ℹ️  Column plainTextPassword already exists');
    } else {
      // Add the new column
      await sequelize.query(`
        ALTER TABLE stalls 
        ADD COLUMN "plainTextPassword" VARCHAR(255);
      `);
      console.log('✅ Successfully added plainTextPassword column');
    }
    
    // Verify the column exists
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'stalls' AND column_name = 'plainTextPassword';
    `);
    
    if (results.length > 0) {
      console.log('✅ Column verification successful:', results[0]);
    }
    
    // Show stalls that need plain text passwords
    const [stallsCount] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_stalls,
        COUNT("plainTextPassword") as stalls_with_plaintext
      FROM stalls;
    `);
    
    console.log('📊 Database status:', stallsCount[0]);
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    if (sequelize) {
      await sequelize.close();
    }
  }
}

addPlainTextPasswordColumn();