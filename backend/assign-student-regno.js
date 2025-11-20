require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function assignRegNoToStudents() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected\n');

    // Get all students without regNo
    const [students] = await sequelize.query(`
      SELECT id, name, email
      FROM users
      WHERE role = 'student' AND ("regNo" IS NULL OR "regNo" = '')
      ORDER BY name ASC
    `);

    if (students.length === 0) {
      console.log('✅ All students already have regNo assigned!');
      await sequelize.close();
      process.exit(0);
    }

    console.log(`📝 Found ${students.length} students without regNo`);
    console.log('🔄 Assigning registration numbers...\n');

    // Assign regNo to each student
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      // Generate regNo: REG001, REG002, etc.
      const regNo = `REG${String(i + 1).padStart(3, '0')}`;
      
      await sequelize.query(`
        UPDATE users
        SET "regNo" = :regNo
        WHERE id = :id
      `, {
        replacements: { regNo, id: student.id }
      });

      console.log(`✅ ${i + 1}. ${student.name} → RegNo: ${regNo}`);
    }

    console.log(`\n✅ Successfully assigned regNo to ${students.length} students!`);
    console.log('\n📊 Verification:');
    
    // Verify the update
    const [updated] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE role = 'student' AND "regNo" IS NOT NULL
    `);

    console.log(`Total students with regNo: ${updated[0].count}`);
    
    // Show sample
    const [sample] = await sequelize.query(`
      SELECT name, "regNo", email
      FROM users
      WHERE role = 'student' AND "regNo" IS NOT NULL
      ORDER BY "regNo" ASC
      LIMIT 5
    `);

    console.log('\nSample students:');
    sample.forEach(s => {
      console.log(`  ${s.regNo} - ${s.name} (${s.email})`);
    });

    await sequelize.close();
    console.log('\n✅ Migration completed successfully!');
    console.log('\nℹ️  Students can now login with:');
    console.log('   - RegNo: REG001, REG002, REG003, etc.');
    console.log('   - Password: student123\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

assignRegNoToStudents();
