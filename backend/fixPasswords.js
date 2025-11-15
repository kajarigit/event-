const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

const fixPasswords = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected\n');

    // Get all users
    const users = await User.find({}).select('+password');
    console.log(`📊 Found ${users.length} users\n`);

    let fixed = 0;
    let alreadyHashed = 0;

    for (const user of users) {
      // Check if password is already hashed (bcrypt hashes start with $2a$ or $2b$)
      if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
        console.log(`✓ ${user.email} - Password already hashed`);
        alreadyHashed++;
        continue;
      }

      // Password is plain text, need to hash it
      const plainPassword = user.password;
      console.log(`🔧 Fixing ${user.email} - Plain text: "${plainPassword}"`);
      
      // Save will trigger the pre-save hook to hash it
      user.password = plainPassword;
      await user.save();
      
      fixed++;
      console.log(`   ✅ Hashed successfully`);
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Fixed: ${fixed} users`);
    console.log(`✓ Already hashed: ${alreadyHashed} users`);
    console.log(`📊 Total: ${users.length} users`);
    console.log('='.repeat(50));

    // Test login with admin
    console.log('\n🧪 Testing login with admin@event.com...');
    const admin = await User.findOne({ email: 'admin@event.com' }).select('+password');
    const isMatch = await admin.comparePassword('admin123');
    console.log(`   Result: ${isMatch ? '✅ LOGIN WORKS!' : '❌ LOGIN FAILED'}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
};

fixPasswords();
