require('dotenv').config();
const bcrypt = require('bcryptjs');
const { User } = require('./src/models/index.sequelize');
const { sequelize } = require('./src/config/database');

async function checkStudentPasswords() {
  try {
    await sequelize.authenticate();
    
    const students = await User.findAll({ 
      where: { role: 'student' },
      limit: 10,
      order: [['regNo', 'ASC']]
    });
    
    console.log('🔍 CHECKING STUDENT DEFAULT PASSWORDS:');
    console.log('='.repeat(80));
    
    for (const student of students) {
      const hasDefaultPassword = await bcrypt.compare('student123', student.password);
      
      console.log(`${student.regNo}: ${student.name}`);
      console.log(`  📧 Email: ${student.email}`);
      console.log(`  🔐 Has default password "student123": ${hasDefaultPassword ? '✅ YES' : '❌ NO'}`);
      console.log(`  🎫 First login: ${student.isFirstLogin}`);
      console.log(`  ✅ Verified: ${student.isVerified}`);
      console.log('');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkStudentPasswords();