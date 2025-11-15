const { sequelize } = require('../config/database');

async function createOTPTable() {
  try {
    console.log('🚀 Creating OTP table...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS otps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        otp VARCHAR(6) NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "isUsed" BOOLEAN DEFAULT FALSE,
        purpose VARCHAR(50) DEFAULT 'password_reset' CHECK (purpose IN ('password_reset', 'email_verification')),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ OTP table created successfully');

    // Create indexes
    console.log('📊 Creating indexes on OTP table...');

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_otps_user_used 
      ON otps("userId", "isUsed");
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_otps_expires 
      ON otps("expiresAt");
    `);

    console.log('✅ Indexes created successfully');

    // Verify table structure
    const [tables] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'otps'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 OTP Table Structure:');
    console.table(tables);

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

createOTPTable();
