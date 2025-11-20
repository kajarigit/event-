require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function addStudentVerificationData() {
  try {
    console.log('🔄 Adding birthDate and PIN codes for students...\n');
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Get all students
    const [students] = await sequelize.query(`
      SELECT id, name, "regNo"
      FROM users
      WHERE role = 'student'
      ORDER BY "regNo" ASC
    `);

    console.log(`📊 Found ${students.length} students\n`);

    // Add verification data for each student
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      
      // Generate sample data
      // Birth dates: random dates between 2000-2005 (students would be 20-25 years old)
      const year = 2000 + (i % 6); // 2000-2005
      const month = String(1 + (i % 12)).padStart(2, '0'); // 01-12
      const day = String(1 + (i % 28)).padStart(2, '0'); // 01-28
      const birthDate = `${year}-${month}-${day}`;
      
      // PIN codes: Use different Indian PIN codes
      const basePIN = 560001; // Bangalore base PIN
      const pinCode = String(basePIN + (i * 10)); // 560001, 560011, 560021, etc.

      await sequelize.query(`
        UPDATE users
        SET "birthDate" = :birthDate,
            "permanentAddressPinCode" = :pinCode
        WHERE id = :id
      `, {
        replacements: { birthDate, pinCode, id: student.id }
      });

      console.log(`✅ ${i + 1}. ${student.regNo.padEnd(8)} - ${student.name.padEnd(25)} → DOB: ${birthDate}, PIN: ${pinCode}`);
    }

    console.log('\n✅ Successfully added verification data for all students!');
    
    // Display sample data for testing
    console.log('\n📋 Sample Verification Data for Testing:');
    console.log('='.repeat(80));
    
    const [sampleStudents] = await sequelize.query(`
      SELECT "regNo", name, "birthDate", "permanentAddressPinCode"
      FROM users
      WHERE role = 'student'
      ORDER BY "regNo" ASC
      LIMIT 5
    `);

    console.log('\nFirst 5 students:');
    sampleStudents.forEach(s => {
      console.log(`  ${s.regNo}: ${s.name}`);
      console.log(`     DOB: ${s.birthDate}`);
      console.log(`     PIN: ${s.permanentAddressPinCode}`);
      console.log('');
    });

    console.log('='.repeat(80));
    console.log('\n💡 To verify a student:');
    console.log('   1. Login with RegNo + password "student123"');
    console.log('   2. Enter their birthDate (YYYY-MM-DD format)');
    console.log('   3. Enter their PIN code (6 digits)');
    console.log('   4. Set new password\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

addStudentVerificationData();
