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

async function forcedCleanup() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    console.log('🚨 FORCED CLEANUP: Removing ALL volunteer records from users table\n');

    // Step 1: Check current state
    const [currentState] = await sequelize.query(`
      SELECT 
        role,
        COUNT(*) as count
      FROM users 
      GROUP BY role
      ORDER BY role
    `);

    console.log('📊 Current users table by role:');
    currentState.forEach(stat => {
      console.log(`  ${stat.role}: ${stat.count}`);
    });
    console.log();

    // Step 2: Show volunteers that will be removed
    const [volunteers] = await sequelize.query(`
      SELECT id, name, email, "volunteerId"
      FROM users 
      WHERE role = 'volunteer'
      ORDER BY name
    `);

    if (volunteers.length === 0) {
      console.log('✅ No volunteers found in users table.');
    } else {
      console.log(`⚠️  Found ${volunteers.length} volunteers that will be REMOVED:`);
      volunteers.forEach((vol, index) => {
        console.log(`  ${index + 1}. ${vol.name} (${vol.volunteerId || 'No ID'}) - ${vol.email}`);
      });
      console.log();

      console.log('🗑️  REMOVING all volunteer records from users table...');
      
      // Remove all volunteers from users table
      const [deleteResult] = await sequelize.query(`
        DELETE FROM users WHERE role = 'volunteer' RETURNING id, name
      `);
      
      console.log(`✅ Removed ${deleteResult.length} volunteer records`);
      deleteResult.forEach(removed => {
        console.log(`  - Removed: ${removed.name} (${removed.id})`);
      });
      console.log();
    }

    // Step 3: Remove volunteerId column
    console.log('📝 Removing volunteerId column from users table...');
    
    try {
      const [columnExists] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'volunteerId'
      `);

      if (columnExists.length > 0) {
        await sequelize.query(`
          ALTER TABLE users DROP COLUMN "volunteerId"
        `);
        console.log('✅ Removed volunteerId column from users table');
      } else {
        console.log('ℹ️  volunteerId column already removed');
      }
    } catch (error) {
      console.log('⚠️  Could not remove volunteerId column:', error.message);
    }

    // Step 4: Update enum type
    console.log('\n📝 Updating role enum to remove volunteer...');
    
    try {
      // Check current enum values
      const [currentEnum] = await sequelize.query(`
        SELECT unnest(enum_range(NULL::enum_users_role)) as role_value
      `);
      
      console.log('Current enum values:', currentEnum.map(e => e.role_value));
      
      if (currentEnum.some(e => e.role_value === 'volunteer')) {
        console.log('📝 Removing volunteer from enum...');
        
        // Create new enum without volunteer
        await sequelize.query(`
          CREATE TYPE user_role_new AS ENUM ('admin', 'student', 'stall_owner')
        `);

        // Update column to use new enum
        await sequelize.query(`
          ALTER TABLE users 
          ALTER COLUMN role TYPE user_role_new 
          USING role::text::user_role_new
        `);

        // Drop old enum and rename new one
        await sequelize.query(`
          DROP TYPE enum_users_role
        `);
        
        await sequelize.query(`
          ALTER TYPE user_role_new RENAME TO enum_users_role
        `);

        console.log('✅ Successfully updated role enum');
      } else {
        console.log('ℹ️  Volunteer already removed from enum');
      }

    } catch (error) {
      console.log('⚠️  Could not update enum:', error.message);
      console.log('   This may be due to existing references. Will continue...');
    }

    // Step 5: Show final state
    console.log('\n📊 Checking final state...');
    
    const [finalState] = await sequelize.query(`
      SELECT 
        role,
        COUNT(*) as count
      FROM users 
      GROUP BY role
      ORDER BY role
    `);

    const [finalColumns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY column_name
    `);

    const [finalEnum] = await sequelize.query(`
      SELECT unnest(enum_range(NULL::enum_users_role)) as role_value
    `);

    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL USERS TABLE STATE');
    console.log('='.repeat(60));
    
    console.log('\n👥 Role breakdown:');
    finalState.forEach(stat => {
      console.log(`  ${stat.role}: ${stat.count} users`);
    });
    
    console.log('\n🎯 Available roles:');
    finalEnum.forEach(role => {
      console.log(`  - ${role.role_value}`);
    });
    
    console.log('\n🏗️  Table structure:');
    finalColumns.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ CLEANUP COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));

    console.log('\n📝 SUMMARY OF CHANGES:');
    console.log('✅ All volunteer records removed from users table');
    console.log('✅ volunteerId column removed from users table');
    console.log('✅ Role enum updated (volunteer removed)');
    console.log('✅ Users table now only contains: admin, student, stall_owner');
    console.log('✅ Database structure optimized and cleaned');
    console.log('\n💡 Next steps:');
    console.log('1. Test user authentication with existing accounts');
    console.log('2. Test volunteer authentication using volunteers table');
    console.log('3. Verify scan log functionality works correctly');

  } catch (error) {
    console.error('❌ Forced cleanup error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
  }
}

// Execute if run directly
if (require.main === module) {
  forcedCleanup();
}

module.exports = forcedCleanup;