require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function getStudentCredentials() {
  try {
    await sequelize.authenticate();
    console.log('🔌 Connected to database...\n');

    // Get all students
    const students = await sequelize.query(
      'SELECT id, name, "regNo", email, department, "isActive" FROM users WHERE role = \'student\' ORDER BY name LIMIT 10',
      { type: sequelize.QueryTypes.SELECT }
    );

    if (students.length === 0) {
      console.log('❌ No students found in database');
      return;
    }

    console.log('🎓 STUDENT LOGIN CREDENTIALS');
    console.log('=' .repeat(60));
    console.log('📍 Login URL: http://192.168.7.20:3000/login');
    console.log('🔑 Default Password: Student@123');
    console.log('📝 Note: Students login with Registration Number (regNo), not email\n');
    
    console.log('📊 Available Students:');
    console.log('-'.repeat(60));
    students.forEach((student, index) => {
      console.log(`${index + 1}. ${student.name}`);
      console.log(`   📧 Email: ${student.email || 'No email'}`);
      console.log(`   🆔 Registration No: ${student.regNo || 'No regNo'}`);
      console.log(`   🏢 Department: ${student.department || 'No department'}`);
      console.log(`   ✅ Active: ${student.isActive}`);
      console.log('');
    });

    console.log('🔐 HOW TO LOGIN AS STUDENT:');
    console.log('1. Go to: http://192.168.7.20:3000/login');
    console.log('2. Select "Student Login"');
    console.log('3. Enter Registration Number (regNo) - NOT email');
    console.log('4. Enter Password: Student@123');
    console.log('5. Complete verification if prompted');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit();
  }
}

getStudentCredentials();