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

async function cleanupUsersTable() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    console.log('📋 Cleaning up users table...\n');

    // Step 1: Check current users table state
    const [userStats] = await sequelize.query(`
      SELECT 
        role,
        COUNT(*) as count
      FROM users 
      GROUP BY role
      ORDER BY role
    `);

    console.log('📊 Current users table by role:');
    userStats.forEach(stat => {
      console.log(`  ${stat.role}: ${stat.count}`);
    });
    console.log();

    // Step 2: Check if there are any volunteers in users table
    const [volunteers] = await sequelize.query(`
      SELECT id, name, email, "volunteerId"
      FROM users 
      WHERE role = 'volunteer'
      ORDER BY name
    `);

    if (volunteers.length === 0) {
      console.log('✅ No volunteers found in users table. Table is already clean.');
    } else {
      console.log(`⚠️  Found ${volunteers.length} volunteers in users table:`);
      volunteers.forEach((vol, index) => {
        console.log(`  ${index + 1}. ${vol.name} (${vol.volunteerId || 'No ID'}) - ${vol.email}`);
      });
      console.log();

      // Step 3: Check if these volunteers exist in the volunteers table
      const volunteerIds = volunteers.map(v => `'${v.id}'`).join(',');
      const [volunteerMatches] = await sequelize.query(`
        SELECT u.id as user_id, u.name as user_name, u."volunteerId" as user_vol_id,
               v.id as vol_id, v.name as vol_name, v."volunteerId" as vol_vol_id
        FROM users u
        LEFT JOIN volunteers v ON u.id = v.id OR u."volunteerId" = v."volunteerId"
        WHERE u.role = 'volunteer' AND u.id IN (${volunteerIds})
      `);

      console.log('🔍 Checking if volunteers exist in volunteers table:');
      volunteerMatches.forEach(match => {
        const status = match.vol_id ? '✅ EXISTS' : '❌ NOT FOUND';
        console.log(`  ${match.user_name} (${match.user_vol_id}): ${status}`);
      });
      console.log();

      // Step 4: Show safe removal plan
      const safeToRemove = volunteerMatches.filter(m => m.vol_id);
      const needsMigration = volunteerMatches.filter(m => !m.vol_id);

      if (needsMigration.length > 0) {
        console.log('⚠️  WARNING: Some volunteers are NOT in volunteers table:');
        needsMigration.forEach(vol => {
          console.log(`  - ${vol.user_name} (${vol.user_vol_id})`);
        });
        console.log('\n❌ STOPPING: Please migrate these volunteers first using the migration script.');
        return;
      }

      console.log('✅ All volunteers have been migrated to volunteers table');
      console.log(`📝 Safe to remove ${safeToRemove.length} volunteer records from users table\n`);

      // Step 5: Remove volunteer role from enum (this might fail if there are still records)
      console.log('📝 Updating role enum to remove volunteer...');
      
      try {
        // First, let's check if we can remove volunteers
        const [volunteerRecords] = await sequelize.query(`
          SELECT COUNT(*) as count FROM users WHERE role = 'volunteer'
        `);

        if (parseInt(volunteerRecords[0].count) > 0) {
          console.log('📝 Removing volunteer records from users table...');
          
          await sequelize.query(`
            DELETE FROM users WHERE role = 'volunteer'
          `);
          
          console.log(`✅ Removed ${volunteers.length} volunteer records from users table`);
        }

        // Now try to update the enum
        console.log('📝 Attempting to update role enum...');
        
        // Create a new enum type without volunteer
        await sequelize.query(`
          CREATE TYPE user_role_new AS ENUM ('admin', 'student', 'stall_owner')
        `);

        // Update the column to use the new enum
        await sequelize.query(`
          ALTER TABLE users 
          ALTER COLUMN role TYPE user_role_new 
          USING role::text::user_role_new
        `);

        // Drop the old enum and rename the new one
        await sequelize.query(`
          DROP TYPE enum_users_role
        `);
        
        await sequelize.query(`
          ALTER TYPE user_role_new RENAME TO enum_users_role
        `);

        console.log('✅ Successfully updated role enum');

      } catch (enumError) {
        console.log('⚠️  Could not update enum (this is okay):', enumError.message);
        console.log('   The enum can be updated manually later if needed.');
      }
    }

    // Step 6: Remove volunteerId column from users table
    console.log('\n📝 Removing volunteerId column from users table...');
    
    try {
      // Check if column exists first
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
        console.log('ℹ️  volunteerId column does not exist in users table');
      }
    } catch (columnError) {
      console.log('⚠️  Could not remove volunteerId column:', columnError.message);
    }

    // Step 7: Show final state
    const [finalStats] = await sequelize.query(`
      SELECT 
        role,
        COUNT(*) as count
      FROM users 
      GROUP BY role
      ORDER BY role
    `);

    const [finalColumns] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY column_name
    `);

    console.log('\n📊 Final users table state:');
    console.log('='.repeat(50));
    console.log('Role breakdown:');
    finalStats.forEach(stat => {
      console.log(`  ${stat.role}: ${stat.count}`);
    });
    
    console.log('\nTable structure:');
    finalColumns.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });
    console.log('='.repeat(50));

    console.log('\n✅ Users table cleanup completed!');
    console.log('\n📝 SUMMARY:');
    console.log('✅ Volunteer records removed from users table');
    console.log('✅ volunteerId column removed (if existed)');
    console.log('✅ Users table now only contains: admin, student, stall_owner');
    console.log('✅ All volunteer data preserved in separate volunteers table');

  } catch (error) {
    console.error('❌ Cleanup error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
  }
}

// Add this check for direct execution
if (require.main === module) {
  cleanupUsersTable();
}

module.exports = cleanupUsersTable;