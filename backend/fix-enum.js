require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    logging: console.log,
  }
);

async function fixEnumIssue() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    console.log('🔧 Fixing role enum issue...\n');

    // Step 1: Check current enum
    const [currentEnum] = await sequelize.query(`
      SELECT unnest(enum_range(NULL::enum_users_role)) as role_value
    `);
    
    console.log('Current enum values:', currentEnum.map(e => e.role_value));

    // Step 2: Remove default value first
    console.log('\n📝 Removing default value from role column...');
    try {
      await sequelize.query(`
        ALTER TABLE users ALTER COLUMN role DROP DEFAULT
      `);
      console.log('✅ Removed default value');
    } catch (error) {
      console.log('ℹ️  No default value to remove:', error.message);
    }

    // Step 3: Now try to update the enum
    console.log('\n📝 Updating role enum...');
    try {
      // Drop the existing new type if it exists
      await sequelize.query(`
        DROP TYPE IF EXISTS user_role_new CASCADE
      `);

      // Create new enum
      await sequelize.query(`
        CREATE TYPE user_role_new AS ENUM ('admin', 'student', 'stall_owner')
      `);

      // Update column
      await sequelize.query(`
        ALTER TABLE users 
        ALTER COLUMN role TYPE user_role_new 
        USING role::text::user_role_new
      `);

      // Drop old enum and rename
      await sequelize.query(`
        DROP TYPE enum_users_role
      `);
      
      await sequelize.query(`
        ALTER TYPE user_role_new RENAME TO enum_users_role
      `);

      console.log('✅ Successfully updated role enum');

    } catch (error) {
      console.log('⚠️  Could not update enum:', error.message);
    }

    // Step 4: Check final enum
    const [finalEnum] = await sequelize.query(`
      SELECT unnest(enum_range(NULL::enum_users_role)) as role_value
    `);

    console.log('\n📊 Final enum values:', finalEnum.map(e => e.role_value));

    // Step 5: Verify table structure
    const [tableInfo] = await sequelize.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role'
    `);

    console.log('\n📊 Role column info:');
    console.log(`  Column: ${tableInfo[0].column_name}`);
    console.log(`  Type: ${tableInfo[0].data_type}`);
    console.log(`  Nullable: ${tableInfo[0].is_nullable}`);
    console.log(`  Default: ${tableInfo[0].column_default || 'None'}`);

    console.log('\n✅ Enum fix completed!');

  } catch (error) {
    console.error('❌ Error fixing enum:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  fixEnumIssue();
}

module.exports = fixEnumIssue;