const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
require('dotenv').config();

const diagnosePassword = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected\n');

    // Get admin user
    const admin = await User.findOne({ email: 'admin@event.com' }).select('+password');
    
    console.log('📊 Admin User Details:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Stored Password: ${admin.password}`);
    console.log(`   Password Length: ${admin.password.length}`);
    console.log(`   Starts with $2a$: ${admin.password.startsWith('$2a$')}`);
    console.log(`   Starts with $2b$: ${admin.password.startsWith('$2b$')}`);
    console.log();

    // Manual bcrypt test
    console.log('🧪 Manual bcrypt test:');
    const testPassword = 'admin123';
    console.log(`   Test password: "${testPassword}"`);
    
    const manualMatch = await bcrypt.compare(testPassword, admin.password);
    console.log(`   bcrypt.compare result: ${manualMatch}`);
    console.log();

    // Model method test
    console.log('🧪 Model method test:');
    const modelMatch = await admin.comparePassword(testPassword);
    console.log(`   admin.comparePassword result: ${modelMatch}`);
    console.log();

    // Try creating a new hash manually
    console.log('🔨 Creating fresh hash:');
    const salt = await bcrypt.genSalt(10);
    const freshHash = await bcrypt.hash(testPassword, salt);
    console.log(`   Fresh hash: ${freshHash.substring(0, 30)}...`);
    
    const freshMatch = await bcrypt.compare(testPassword, freshHash);
    console.log(`   Fresh hash matches: ${freshMatch}`);
    console.log();

    // Update admin with fresh hash
    console.log('💾 Updating admin password directly with fresh hash...');
    await User.updateOne(
      { email: 'admin@event.com' },
      { password: freshHash }
    );
    console.log('   ✅ Updated');
    console.log();

    // Test again
    const updatedAdmin = await User.findOne({ email: 'admin@event.com' }).select('+password');
    const finalMatch = await bcrypt.compare(testPassword, updatedAdmin.password);
    console.log(`🎯 Final test: ${finalMatch ? '✅ SUCCESS!' : '❌ FAILED'}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

diagnosePassword();
