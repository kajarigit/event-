const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
require('dotenv').config();

const fixAllPasswords = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected\n');

    // Define the expected passwords for each role
    const passwordMap = {
      admin: 'admin123',
      volunteer: 'volunteer123',
      student: 'student123'
    };

    // Get all users
    const users = await User.find({}).select('+password');
    console.log(`📊 Found ${users.length} users\n`);

    let fixed = 0;

    for (const user of users) {
      const expectedPassword = passwordMap[user.role];
      
      console.log(`🔧 Processing ${user.email} (${user.role})`);
      
      // Generate fresh hash
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(expectedPassword, salt);
      
      // Update directly with updateOne to bypass pre-save hook
      await User.updateOne(
        { _id: user._id },
        { password: hashedPassword }
      );
      
      // Verify it worked
      const updated = await User.findById(user._id).select('+password');
      const isMatch = await bcrypt.compare(expectedPassword, updated.password);
      
      if (isMatch) {
        console.log(`   ✅ Password: "${expectedPassword}" - VERIFIED`);
        fixed++;
      } else {
        console.log(`   ❌ FAILED to verify password`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Successfully fixed and verified: ${fixed}/${users.length} users`);
    console.log('='.repeat(60));
    console.log('\n🔐 Test Credentials:');
    console.log('   Admin: admin@event.com / admin123');
    console.log('   Volunteer: volunteer1@event.com / volunteer123');
    console.log('   Student: student1@event.com / student123');
    console.log('\n✨ You can now login!');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixAllPasswords();
