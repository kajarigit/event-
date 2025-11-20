// Migration script to hash all existing plain text stall owner passwords
const { Stall, sequelize } = require('./backend/src/models/index.sequelize');
const bcrypt = require('bcryptjs');

async function fixExistingStallPasswords() {
  try {
    console.log('🔐 Fixing existing stall owner passwords...\n');

    // Find all stalls with plain text passwords (not starting with $2)
    const [stalls] = await sequelize.query(`
      SELECT id, name, "ownerEmail", "ownerPassword" 
      FROM stalls 
      WHERE "ownerPassword" IS NOT NULL 
      AND "ownerPassword" NOT LIKE '$2%'
      ORDER BY "createdAt" DESC
    `);

    if (stalls.length === 0) {
      console.log('✅ No plain text passwords found. All passwords are already hashed!');
      return;
    }

    console.log(`📋 Found ${stalls.length} stalls with plain text passwords:\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const stall of stalls) {
      try {
        console.log(`🏪 Processing: ${stall.name} (${stall.ownerEmail || 'No email'})`);
        console.log(`   📝 Current password: ${stall.ownerPassword}`);
        
        // Hash the plain text password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(stall.ownerPassword, salt);
        
        // Update the database directly
        await sequelize.query(`
          UPDATE stalls 
          SET "ownerPassword" = :hashedPassword 
          WHERE id = :id
        `, {
          replacements: { 
            hashedPassword: hashedPassword,
            id: stall.id 
          }
        });
        
        console.log(`   ✅ Password hashed and updated successfully`);
        console.log(`   🔒 New hash: ${hashedPassword.substring(0, 20)}...\n`);
        
        successCount++;
      } catch (error) {
        console.error(`   ❌ Error processing stall ${stall.name}:`, error.message);
        errorCount++;
      }
    }

    console.log('📊 Migration Summary:');
    console.log(`   ✅ Successfully updated: ${successCount} stalls`);
    console.log(`   ❌ Errors: ${errorCount} stalls`);
    
    if (successCount > 0) {
      console.log('\n🎉 Password migration completed! All stall owner passwords are now securely hashed.');
      
      // Test a few passwords to verify they work
      console.log('\n🧪 Running verification tests...');
      
      const testStalls = stalls.slice(0, 3); // Test first 3 stalls
      
      for (const originalStall of testStalls) {
        try {
          // Get the updated stall from database
          const updatedStall = await Stall.findByPk(originalStall.id);
          
          if (updatedStall) {
            // Test password matching
            const isMatch = await updatedStall.matchOwnerPassword(originalStall.ownerPassword);
            console.log(`   🔍 ${updatedStall.name}: Password verification ${isMatch ? '✅ PASSED' : '❌ FAILED'}`);
          }
        } catch (testError) {
          console.log(`   🔍 ${originalStall.name}: Test error - ${testError.message}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await sequelize.close();
    console.log('\n🔌 Database connection closed.');
  }
}

// Run the migration
console.log('🚀 Starting stall password migration...\n');
fixExistingStallPasswords();