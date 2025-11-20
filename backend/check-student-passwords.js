require('dotenv').config();
const { sequelize } = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function checkStudentPasswords() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Get a sample student
    const [students] = await sequelize.query(`
      SELECT id, name, "regNo", password, "isFirstLogin", "isVerified"
      FROM users
      WHERE role = 'student'
      LIMIT 3
    `);

    console.log('📊 Sample Student Password Check:\n');
    
    for (const student of students) {
      console.log(`Student: ${student.name} (${student.regNo})`);
      console.log(`  Has password: ${!!student.password}`);
      console.log(`  Password length: ${student.password ? student.password.length : 0}`);
      console.log(`  Looks hashed: ${student.password && student.password.startsWith('$2') ? 'Yes (bcrypt)' : 'No - Plain text!'}`);
      console.log(`  isFirstLogin: ${student.isFirstLogin}`);
      console.log(`  isVerified: ${student.isVerified}`);
      
      if (student.password) {
        // Test if "student123" matches
        const isMatch = await bcrypt.compare('student123', student.password);
        console.log(`  Matches "student123": ${isMatch ? '✅ YES' : '❌ NO'}`);
      }
      console.log('');
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkStudentPasswords();
