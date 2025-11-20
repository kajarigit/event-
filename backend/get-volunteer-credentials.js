require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    logging: false,
  }
);

async function getVolunteerCredentials() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Get all volunteers from volunteers table
    const [volunteers] = await sequelize.query(`
      SELECT id, name, "volunteerId", email, department, faculty, programme, year, 
             phone, "isActive", "isFirstLogin", permissions, "assignedEvents", 
             "joinDate", "lastLoginAt", "createdAt"
      FROM volunteers
      ORDER BY "volunteerId" ASC
    `);

    if (volunteers.length === 0) {
      console.log('❌ No volunteers found in volunteers table');
      await sequelize.close();
      process.exit(0);
    }

    console.log(`👥 Found ${volunteers.length} volunteer(s)\n`);
    console.log('='.repeat(140));
    console.log('VOLUNTEER LOGIN CREDENTIALS');
    console.log('='.repeat(140));
    console.log('Default Password for ALL volunteers: volunteer123');
    console.log('Login Method: Use Volunteer ID (not email)');
    console.log('Login URL: /volunteer/login or main login page with volunteer ID');
    console.log('='.repeat(140));
    console.log();

    // Display in table format
    console.log('┌─────┬────────────────────────────────┬──────────────┬─────────────────────────────┬──────────────┬──────┬────────┬────────────┬─────────────┐');
    console.log('│ No. │ Name                           │ Volunteer ID │ Email                       │ Department   │ Year │ Active │ First Login │ Join Date   │');
    console.log('├─────┼────────────────────────────────┼──────────────┼─────────────────────────────┼──────────────┼──────┼────────┼─────────────┼─────────────┤');

    volunteers.forEach((volunteer, index) => {
      const no = String(index + 1).padEnd(3);
      const name = (volunteer.name || '').substring(0, 30).padEnd(30);
      const volId = (volunteer.volunteerId || '').substring(0, 12).padEnd(12);
      const email = (volunteer.email || 'N/A').substring(0, 27).padEnd(27);
      const department = (volunteer.department || 'N/A').substring(0, 12).padEnd(12);
      const year = String(volunteer.year || 'N/A').padEnd(4);
      const isActive = volunteer.isActive ? '  ✓   ' : '  ✗   ';
      const isFirstLogin = volunteer.isFirstLogin ? '     ✓      ' : '     ✗      ';
      const joinDate = volunteer.joinDate ? volunteer.joinDate.substring(0, 10) : 'N/A'.padEnd(10);

      console.log(`│ ${no} │ ${name} │ ${volId} │ ${email} │ ${department} │ ${year} │ ${isActive} │ ${isFirstLogin} │ ${joinDate} │`);
    });

    console.log('└─────┴────────────────────────────────┴──────────────┴─────────────────────────────┴──────────────┴──────┴────────┴─────────────┴─────────────┘');
    console.log();

    // Quick login format
    console.log('\n🔑 QUICK LOGIN REFERENCE:');
    console.log('='.repeat(140));
    console.log('Volunteer ID | Name            | Password    | Department | Email');
    console.log('-'.repeat(70));
    volunteers.forEach(volunteer => {
      const id = volunteer.volunteerId.padEnd(12);
      const name = (volunteer.name || '').substring(0, 15).padEnd(15);
      const dept = (volunteer.department || 'N/A').substring(0, 10).padEnd(10);
      const email = (volunteer.email || 'N/A').substring(0, 25);
      console.log(`${id} | ${name} | volunteer123 | ${dept} | ${email}`);
    });
    console.log('='.repeat(140));

    // Generate CSV format
    console.log('\n📄 CSV FORMAT (for import/reference):');
    console.log('='.repeat(140));
    console.log('VolunteerId,Name,Email,Department,Year,DefaultPassword,Active,FirstLogin,JoinDate');
    volunteers.forEach(volunteer => {
      const joinDate = volunteer.joinDate ? volunteer.joinDate.substring(0, 10) : 'N/A';
      console.log(`${volunteer.volunteerId || ''},"${volunteer.name || ''}",${volunteer.email || 'N/A'},${volunteer.department || 'N/A'},${volunteer.year || 'N/A'},volunteer123,${volunteer.isActive},${volunteer.isFirstLogin},${joinDate}`);
    });
    console.log('='.repeat(140));

    // Login instructions
    console.log('\n📝 LOGIN INSTRUCTIONS FOR VOLUNTEERS:');
    console.log('='.repeat(140));
    console.log('1. Go to login page');
    console.log('2. Enter Volunteer ID (e.g., VOL001) - NOT email');
    console.log('3. Enter password: volunteer123');
    console.log('4. Click Login');
    console.log('5. Should redirect to volunteer dashboard');
    console.log('='.repeat(140));

    // Statistics
    console.log('\n📈 STATISTICS:');
    console.log('='.repeat(140));
    const activeCount = volunteers.filter(v => v.isActive).length;
    const firstLoginCount = volunteers.filter(v => v.isFirstLogin).length;
    const departmentStats = {};
    volunteers.forEach(v => {
      const dept = v.department || 'Unknown';
      departmentStats[dept] = (departmentStats[dept] || 0) + 1;
    });
    
    console.log(`Total Volunteers: ${volunteers.length}`);
    console.log(`Active: ${activeCount} (${((activeCount/volunteers.length)*100).toFixed(1)}%)`);
    console.log(`Awaiting First Login: ${firstLoginCount} (${((firstLoginCount/volunteers.length)*100).toFixed(1)}%)`);
    console.log('\nBy Department:');
    Object.entries(departmentStats).forEach(([dept, count]) => {
      console.log(`  ${dept}: ${count}`);
    });
    console.log('='.repeat(140));
    console.log();

    // Test login example
    if (volunteers.length > 0) {
      const testVol = volunteers[0];
      console.log('\n🧪 TEST LOGIN EXAMPLE:');
      console.log('='.repeat(140));
      console.log('Copy and paste these credentials to test:');
      console.log(`Volunteer ID: ${testVol.volunteerId}`);
      console.log('Password: volunteer123');
      console.log(`Expected User: ${testVol.name}`);
      console.log(`Department: ${testVol.department}`);
      console.log('='.repeat(140));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

getVolunteerCredentials();