require('dotenv').config();
const { User } = require('./src/models/index.sequelize');
const { sequelize } = require('./src/config/database');

async function checkStudentEmails() {
  try {
    await sequelize.authenticate();
    
    const students = await User.findAll({ 
      where: { role: 'student' },
      limit: 10,
      order: [['regNo', 'ASC']]
    });
    
    console.log('📧 CHECKING STUDENT EMAIL ADDRESSES FOR FORGOT PASSWORD:');
    console.log('='.repeat(80));
    
    let withEmail = 0;
    let withoutEmail = 0;
    
    for (const student of students) {
      const hasEmail = student.email && student.email.trim() !== '';
      
      if (hasEmail) withEmail++;
      else withoutEmail++;
      
      console.log(`${student.regNo}: ${student.name}`);
      console.log(`  📧 Email: ${student.email || 'NO EMAIL'}`);
      console.log(`  🔐 Can use forgot password: ${hasEmail ? '✅ YES' : '❌ NO - NO EMAIL'}`);
      console.log('');
    }
    
    console.log('📊 SUMMARY:');
    console.log(`✅ Students WITH email: ${withEmail}`);
    console.log(`❌ Students WITHOUT email: ${withoutEmail}`);
    console.log(`📈 Email coverage: ${Math.round((withEmail / (withEmail + withoutEmail)) * 100)}%`);
    
    if (withoutEmail > 0) {
      console.log('\n🚨 ISSUE: Some students cannot use forgot password feature!');
      console.log('💡 SOLUTION NEEDED: Alternative recovery method for students without email');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkStudentEmails();