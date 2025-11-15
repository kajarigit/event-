const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

const testLogin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected\n');

    // Test login with admin credentials
    const testEmail = 'admin@event.com';
    const testPassword = 'admin123';

    console.log(`🔍 Testing login for: ${testEmail}`);
    console.log(`📝 Testing password: ${testPassword}\n`);

    // Find user
    const user = await User.findOne({ email: testEmail }).select('+password');
    
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   Password hash: ${user.password.substring(0, 30)}...`);
    console.log();

    // Test password comparison
    console.log('🔐 Testing password comparison...');
    const isMatch = await user.comparePassword(testPassword);
    
    console.log(`   Result: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
    console.log();

    if (!isMatch) {
      console.log('⚠️  Password does not match!');
      console.log('   Possible reasons:');
      console.log('   1. Password was changed manually in database');
      console.log('   2. Password hash is corrupted');
      console.log('   3. Wrong test password');
      console.log();
      console.log('💡 Solution: Update password in database');
      
      // Update password
      console.log('   Updating password to "admin123"...');
      user.password = 'admin123';
      await user.save();
      console.log('   ✅ Password updated successfully');
      console.log();
      
      // Test again
      const updatedUser = await User.findOne({ email: testEmail }).select('+password');
      const newMatch = await updatedUser.comparePassword(testPassword);
      console.log(`   Re-test result: ${newMatch ? '✅ MATCH' : '❌ STILL NO MATCH'}`);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

testLogin();
