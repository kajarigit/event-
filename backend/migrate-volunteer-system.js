const { sequelize } = require('./src/config/database');
const { User } = require('./src/models/index.sequelize');

async function migrateVolunteerSystem() {
  try {
    console.log('🚀 Starting volunteer system migration...');

    // Add volunteerId column if it doesn't exist
    try {
      await sequelize.getQueryInterface().addColumn('users', 'volunteerId', {
        type: sequelize.Sequelize.DataTypes.STRING,
        allowNull: true,
        comment: 'Unique volunteer identifier for volunteer login'
      });
      console.log('✅ Added volunteerId column to users table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  volunteerId column already exists');
      } else {
        throw error;
      }
    }

    // Update any existing volunteers to have volunteer IDs if they don't have them
    const volunteers = await User.findAll({
      where: { 
        role: 'volunteer',
        volunteerId: null
      }
    });

    console.log(`🔄 Found ${volunteers.length} volunteers without volunteer IDs`);

    for (const volunteer of volunteers) {
      const volunteerId = `VOL${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`;
      await volunteer.update({ volunteerId });
      console.log(`✅ Assigned volunteer ID ${volunteerId} to ${volunteer.name}`);
    }

    console.log('🎉 Volunteer system migration completed successfully!');
    console.log('');
    console.log('📋 Migration Summary:');
    console.log('- Added volunteerId field to User model');
    console.log('- Updated authentication to support volunteer ID login');  
    console.log('- Enhanced CSV upload for volunteers');
    console.log('- Added volunteer credentials download endpoint');
    console.log('- Updated frontend login interface');
    console.log('');
    console.log('🔧 New Login System:');
    console.log('- Students: Registration Number + password');
    console.log('- Volunteers: Volunteer ID + password');
    console.log('- Stall Owners: Email OR Stall ID + password');
    console.log('- Admin: Email + password');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration
migrateVolunteerSystem()
  .then(() => {
    console.log('✅ Migration completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });