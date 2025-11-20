require('dotenv').config();
const { sequelize } = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function checkVolunteerPasswords() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully\n');

    // Get sample volunteers with their hashed passwords
    console.log('📊 CHECKING VOLUNTEER PASSWORDS:');
    console.log('='.repeat(80));
    
    const [volunteers] = await sequelize.query(`
      SELECT id, name, "volunteerId", password, "defaultPassword", "isPasswordDefault"
      FROM volunteers
      ORDER BY "createdAt" DESC
      LIMIT 5;
    `);

    if (volunteers.length === 0) {
      console.log('❌ No volunteers found');
      return;
    }

    console.log(`✅ Found ${volunteers.length} volunteer(s):\n`);

    for (const volunteer of volunteers) {
      console.log(`👤 Volunteer: ${volunteer.name} (${volunteer.volunteerId})`);
      console.log(`   Has password: ${!!volunteer.password}`);
      console.log(`   Password length: ${volunteer.password ? volunteer.password.length : 0}`);
      console.log(`   Looks hashed: ${volunteer.password && volunteer.password.startsWith('$2') ? '✅ YES (bcrypt)' : '❌ NO - Plain text!'}`);
      console.log(`   Default password field: ${volunteer.defaultPassword || 'NULL'}`);
      console.log(`   Is password default: ${volunteer.isPasswordDefault}`);
      
      if (volunteer.password) {
        // Test common default passwords
        const testPasswords = ['volunteer123', 'Volunteer@123', 'volunteer', 'admin123'];
        
        console.log('   Testing passwords:');
        for (const testPass of testPasswords) {
          try {
            const isMatch = await bcrypt.compare(testPass, volunteer.password);
            console.log(`     "${testPass}": ${isMatch ? '✅ MATCH!' : '❌ No match'}`);
            if (isMatch) {
              console.log(`     🎯 FOUND WORKING PASSWORD: "${testPass}"`);
            }
          } catch (error) {
            console.log(`     "${testPass}": ❌ Error testing`);
          }
        }
      }
      console.log('');
    }

    // Also check if there are any volunteers with plain text passwords
    console.log('🔍 Checking for plain text passwords...');
    const [plainTextCheck] = await sequelize.query(`
      SELECT id, name, "volunteerId", password
      FROM volunteers
      WHERE password NOT LIKE '$2%' AND password IS NOT NULL
      LIMIT 3;
    `);

    if (plainTextCheck.length > 0) {
      console.log(`⚠️  Found ${plainTextCheck.length} volunteers with plain text passwords:`);
      plainTextCheck.forEach(vol => {
        console.log(`   ${vol.name} (${vol.volunteerId}): "${vol.password}"`);
      });
    } else {
      console.log('✅ All passwords are properly hashed');
    }

    console.log('\n✅ Password check complete!');

  } catch (error) {
    console.error('❌ Error checking passwords:', error);
  } finally {
    await sequelize.close();
  }
}

checkVolunteerPasswords();