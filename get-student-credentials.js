require('dotenv').config();
const { sequelize } = require('./src/config/database');
const { User } = require('./src/models/index.sequelize');

async function getStudentCredentials() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Fetch all students
    const students = await User.findAll({
      where: { role: 'student' },
      attributes: ['id', 'name', 'regNo', 'email', 'department', 'year', 'isActive', 'isVerified', 'isFirstLogin'],
      order: [['name', 'ASC']],
      raw: true
    });

    if (students.length === 0) {
      console.log('❌ No students found in database');
      process.exit(0);
    }

    console.log(`📊 Found ${students.length} student(s)\n`);
    console.log('=' .repeat(120));
    console.log('STUDENT LOGIN CREDENTIALS');
    console.log('=' .repeat(120));
    console.log('Default Password for all students: student123');
    console.log('Students must verify with birthDate + PIN on first login, then set new password');
    console.log('=' .repeat(120));
    console.log();

    // Display in table format
    console.log('┌─────┬────────────────────────────────┬────────────────┬──────────────────────────────┬────────────────┬──────┬────────┬──────────┬────────────┐');
    console.log('│ No. │ Name                           │ RegNo (UID)    │ Email                        │ Department     │ Year │ Active │ Verified │ FirstLogin │');
    console.log('├─────┼────────────────────────────────┼────────────────┼──────────────────────────────┼────────────────┼──────┼────────┼──────────┼────────────┤');

    students.forEach((student, index) => {
      const no = String(index + 1).padEnd(3);
      const name = (student.name || '').substring(0, 30).padEnd(30);
      const regNo = (student.regNo || '').substring(0, 14).padEnd(14);
      const email = (student.email || 'N/A').substring(0, 28).padEnd(28);
      const department = (student.department || 'N/A').substring(0, 14).padEnd(14);
      const year = String(student.year || 'N/A').padEnd(4);
      const isActive = student.isActive ? '  ✓   ' : '  ✗   ';
      const isVerified = student.isVerified ? '   ✓    ' : '   ✗    ';
      const isFirstLogin = student.isFirstLogin ? '     ✓     ' : '     ✗     ';

      console.log(`│ ${no} │ ${name} │ ${regNo} │ ${email} │ ${department} │ ${year} │ ${isActive} │ ${isVerified} │ ${isFirstLogin} │`);
    });

    console.log('└─────┴────────────────────────────────┴────────────────┴──────────────────────────────┴────────────────┴──────┴────────┴──────────┴────────────┘');
    console.log();

    // Generate CSV format
    console.log('\n📄 CSV FORMAT (for import/reference):');
    console.log('=' .repeat(120));
    console.log('RegNo,Name,Email,Department,Year,DefaultPassword,Active,Verified,FirstLogin');
    students.forEach(student => {
      console.log(`${student.regNo || ''},"${student.name || ''}",${student.email || 'N/A'},${student.department || 'N/A'},${student.year || 'N/A'},student123,${student.isActive},${student.isVerified},${student.isFirstLogin}`);
    });
    console.log('=' .repeat(120));

    // Login instructions
    console.log('\n📝 LOGIN INSTRUCTIONS FOR STUDENTS:');
    console.log('=' .repeat(120));
    console.log('1. Go to login page and click "Student Login"');
    console.log('2. Enter RegNo (UID) - NOT email');
    console.log('3. Enter password: student123');
    console.log('4. On first login, verify with:');
    console.log('   - Birth Date (YYYY-MM-DD format)');
    console.log('   - Permanent Address PIN Code (6 digits)');
    console.log('5. After verification, set a new password');
    console.log('6. Login again with RegNo + new password');
    console.log('=' .repeat(120));

    // Statistics
    console.log('\n📈 STATISTICS:');
    console.log('=' .repeat(120));
    const activeCount = students.filter(s => s.isActive).length;
    const verifiedCount = students.filter(s => s.isVerified).length;
    const firstLoginCount = students.filter(s => s.isFirstLogin).length;
    console.log(`Total Students: ${students.length}`);
    console.log(`Active: ${activeCount} (${((activeCount/students.length)*100).toFixed(1)}%)`);
    console.log(`Verified: ${verifiedCount} (${((verifiedCount/students.length)*100).toFixed(1)}%)`);
    console.log(`Awaiting First Login: ${firstLoginCount} (${((firstLoginCount/students.length)*100).toFixed(1)}%)`);
    console.log('=' .repeat(120));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the script
getStudentCredentials();
