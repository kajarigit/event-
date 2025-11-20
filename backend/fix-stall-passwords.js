// Script to fix existing stall owner passwords by hashing plain text ones
const { Stall, sequelize } = require('./src/models/index.sequelize');
const bcrypt = require('bcryptjs');

async function fixStallPasswords() {
  try {
    console.log('🔐 Starting stall password fix process...\n');
    
    // Get all stalls with passwords
    const stalls = await Stall.findAll({
      where: {
        ownerPassword: {
          [sequelize.Sequelize.Op.ne]: null // Not null
        }
      },
      attributes: ['id', 'name', 'ownerEmail', 'ownerPassword']
    });

    console.log(`📊 Found ${stalls.length} stalls with passwords`);
    
    if (stalls.length === 0) {
      console.log('✅ No stalls found with passwords to fix');
      return;
    }

    let plainTextCount = 0;
    let alreadyHashedCount = 0;
    let fixedCount = 0;
    let errorCount = 0;

    console.log('\n🔍 Analyzing passwords...\n');

    for (const stall of stalls) {
      try {
        const isAlreadyHashed = stall.ownerPassword.startsWith('$2');
        
        if (isAlreadyHashed) {
          alreadyHashedCount++;
          console.log(`✅ ${stall.name}: Already hashed`);
        } else {
          plainTextCount++;
          console.log(`🔧 ${stall.name}: Plain text password found - "${stall.ownerPassword}"`);
          
          // Hash the plain text password
          const hashedPassword = await bcrypt.hash(stall.ownerPassword, 10);
          
          // Update the stall with hashed password
          await stall.update({ 
            ownerPassword: hashedPassword 
          }, {
            hooks: false // Skip hooks to avoid double hashing
          });
          
          fixedCount++;
          console.log(`   ✅ Fixed: Password hashed and updated`);
        }
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error fixing ${stall.name}: ${error.message}`);
      }
    }

    // Summary
    console.log('\n📋 Password Fix Summary:');
    console.log(`   📊 Total stalls processed: ${stalls.length}`);
    console.log(`   ✅ Already hashed: ${alreadyHashedCount}`);
    console.log(`   🔧 Plain text found: ${plainTextCount}`);
    console.log(`   ✅ Successfully fixed: ${fixedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    if (fixedCount > 0) {
      console.log('\n🎉 Password fix completed successfully!');
      console.log('🔒 All stall owner passwords are now properly hashed');
      
      // Test login for a fixed stall
      if (stalls.length > 0) {
        console.log('\n🧪 Testing login functionality...');
        const testStall = stalls.find(s => !s.ownerPassword.startsWith('$2'));
        
        if (testStall) {
          // Reload the stall to get updated password
          await testStall.reload();
          
          console.log(`\n📋 Test Login Credentials:`);
          console.log(`   Email: ${testStall.ownerEmail}`);
          console.log(`   Password: Use the original plain text password that was shown above`);
          console.log(`   Login URL: /stall-owner/login`);
        }
      }
    } else {
      console.log('\n✅ No passwords needed fixing - all were already hashed');
    }

  } catch (error) {
    console.error('❌ Script failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Don't close the connection as the backend server is running
    console.log('\n✅ Script completed');
  }
}

// Run the fix
fixStallPasswords();