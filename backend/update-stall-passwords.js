require('dotenv').config();
const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function updateExistingStallsWithPlainTextPasswords() {
  let sequelize;
  
  try {
    console.log('🔄 Generating new passwords for existing stalls...');
    
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
    
    // Find stalls that have hashed passwords but no plain text passwords
    const [stallsNeedingUpdate] = await sequelize.query(`
      SELECT id, name, "ownerEmail", "ownerPassword"
      FROM stalls 
      WHERE "ownerPassword" IS NOT NULL 
      AND "plainTextPassword" IS NULL;
    `);
    
    console.log(`📊 Found ${stallsNeedingUpdate.length} stalls needing password updates`);
    
    if (stallsNeedingUpdate.length === 0) {
      console.log('ℹ️  No stalls need password updates');
      return;
    }
    
    console.log('\n🔑 Generating new passwords and updating stalls:');
    
    for (const stall of stallsNeedingUpdate) {
      // Generate new 8-character password
      const newPassword = crypto.randomBytes(4).toString('hex');
      
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      // Update both fields
      await sequelize.query(`
        UPDATE stalls 
        SET "ownerPassword" = :hashedPassword, 
            "plainTextPassword" = :plainTextPassword
        WHERE id = :stallId;
      `, {
        replacements: {
          hashedPassword,
          plainTextPassword: newPassword,
          stallId: stall.id
        }
      });
      
      console.log(`✅ ${stall.name} (${stall.ownerEmail || 'No email'}) → Password: ${newPassword}`);
    }
    
    // Verify updates
    const [updatedCount] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_stalls,
        COUNT("plainTextPassword") as stalls_with_plaintext
      FROM stalls;
    `);
    
    console.log('\n📊 Final database status:', updatedCount[0]);
    console.log('🎉 Password updates completed successfully!');
    console.log('\n⚠️  IMPORTANT: Make sure to share these new passwords with stall owners!');
    
  } catch (error) {
    console.error('❌ Password update failed:', error.message);
  } finally {
    if (sequelize) {
      await sequelize.close();
    }
  }
}

updateExistingStallsWithPlainTextPasswords();