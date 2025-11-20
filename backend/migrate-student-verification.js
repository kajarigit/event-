require('dotenv').config();
const { Sequelize } = require('sequelize');

async function addStudentVerificationFields() {
  let sequelize;
  
  try {
    console.log('🔄 Adding student verification fields to users table...');
    
    // Create Sequelize instance
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
        logging: false
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
    
    await sequelize.authenticate();
    console.log('✅ Connected to database');
    
    // Add new columns for student verification
    const migrations = [
      {
        name: 'birthDate',
        sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS "birthDate" DATE;`
      },
      {
        name: 'permanentAddressPinCode',
        sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS "permanentAddressPinCode" VARCHAR(10);`
      },
      {
        name: 'isFirstLogin',
        sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS "isFirstLogin" BOOLEAN DEFAULT true;`
      },
      {
        name: 'isVerified',
        sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN DEFAULT false;`
      },
      {
        name: 'email_nullable',
        sql: `ALTER TABLE users ALTER COLUMN email DROP NOT NULL;`
      },
      {
        name: 'email_unique_drop',
        sql: `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;`
      }
    ];
    
    for (const migration of migrations) {
      try {
        await sequelize.query(migration.sql);
        console.log(`✅ Added/Modified ${migration.name}`);
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('does not exist')) {
          console.log(`ℹ️  ${migration.name} already exists or constraint not found`);
        } else {
          console.error(`❌ Error with ${migration.name}:`, error.message);
        }
      }
    }
    
    // Verify columns were added
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('birthDate', 'permanentAddressPinCode', 'isFirstLogin', 'isVerified');
    `);
    
    console.log('📊 New columns verification:', results);
    
    // Update existing students to have default password and first login flag
    const defaultPassword = 'student123'; // Common default password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    await sequelize.query(`
      UPDATE users 
      SET 
        "isFirstLogin" = true,
        "isVerified" = false,
        password = :hashedPassword
      WHERE role = 'student';
    `, {
      replacements: { hashedPassword }
    });
    
    console.log(`✅ Updated existing students with default password: ${defaultPassword}`);
    console.log('🎉 Student verification system migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    if (sequelize) {
      await sequelize.close();
    }
  }
}

addStudentVerificationFields();