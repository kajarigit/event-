require('dotenv').config();
const bcrypt = require('bcryptjs');
const { User } = require('./src/models/index.sequelize');
const { sequelize } = require('./src/config/database');

async function checkDefaultPassword() {
  try {
    await sequelize.authenticate();
    const student = await User.findOne({ 
      where: { role: 'student' },
      limit: 1
    });
    
    if (!student) {
      console.log('❌ No students found');
      return;
    }
    
    console.log(`🔍 Testing student: ${student.name} (${student.regNo})`);
    console.log(`Password length: ${student.password?.length}`);
    
    const testPasswords = ['Student@123', 'student123'];
    
    console.log('\nTesting default passwords:');
    for (const pwd of testPasswords) {
      const isMatch = await bcrypt.compare(pwd, student.password);
      console.log(`  ${pwd}: ${isMatch ? '✅ MATCHES' : '❌ No match'}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkDefaultPassword();