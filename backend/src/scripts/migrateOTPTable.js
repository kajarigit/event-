const { sequelize } = require('../config/database');

async function migrateOTPTable() {
  try {
    console.log('🚀 Starting OTP table migration...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS otps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        otp VARCHAR(6) NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "isUsed" BOOLEAN DEFAULT FALSE,
        purpose VARCHAR(50) DEFAULT 'password_reset',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    console.log('✅ OTP table created successfully');

    // Create indexes
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_otps_user_used 
      ON otps("userId", "isUsed");
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_otps_expires 
      ON otps("expiresAt");
    `);

    console.log('✅ OTP indexes created successfully');

    console.log('✅ OTP table migration completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateOTPTable();
