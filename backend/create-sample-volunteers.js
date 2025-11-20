require('dotenv').config();
const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

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

async function createSampleVolunteers() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Sample volunteer data
    const volunteersData = [
      {
        name: 'Alice Johnson',
        email: 'alice.johnson@example.com',
        volunteerId: 'VOL001',
        department: 'CSE',
        faculty: 'Engineering',
        year: 3,
        phone: '9876543210'
      },
      {
        name: 'Bob Smith', 
        email: 'bob.smith@example.com',
        volunteerId: 'VOL002',
        department: 'ECE',
        faculty: 'Engineering', 
        year: 2,
        phone: '9876543211'
      },
      {
        name: 'Carol Brown',
        email: 'carol.brown@example.com',
        volunteerId: 'VOL003',
        department: 'MECH',
        faculty: 'Engineering',
        year: 4,
        phone: '9876543212'
      },
      {
        name: 'David Wilson',
        email: 'david.wilson@example.com',
        volunteerId: 'VOL004',
        department: 'CIVIL',
        faculty: 'Engineering',
        year: 3,
        phone: '9876543213'
      },
      {
        name: 'Emily Davis',
        email: 'emily.davis@example.com',
        volunteerId: 'VOL005',
        department: 'IT',
        faculty: 'Engineering',
        year: 2,
        phone: '9876543214'
      },
      {
        name: 'Frank Miller',
        email: 'frank.miller@example.com',
        volunteerId: 'VOL006',
        department: 'EEE',
        faculty: 'Engineering',
        year: 4,
        phone: '9876543215'
      },
      {
        name: 'Grace Lee',
        email: 'grace.lee@example.com',
        volunteerId: 'VOL007',
        department: 'CSE',
        faculty: 'Engineering',
        year: 3,
        phone: '9876543216'
      },
      {
        name: 'Henry Taylor',
        email: 'henry.taylor@example.com',
        volunteerId: 'VOL008',
        department: 'ECE',
        faculty: 'Engineering',
        year: 2,
        phone: '9876543217'
      },
      {
        name: 'Iris Chen',
        email: 'iris.chen@example.com',
        volunteerId: 'VOL009',
        department: 'MECH',
        faculty: 'Engineering',
        year: 4,
        phone: '9876543218'
      },
      {
        name: 'Jack Brown',
        email: 'jack.brown@example.com',
        volunteerId: 'VOL010',
        department: 'CIVIL',
        faculty: 'Engineering',
        year: 3,
        phone: '9876543219'
      }
    ];

    const defaultPassword = 'volunteer123';
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    console.log('📋 Creating sample volunteers...\n');

    // Check if volunteers already exist
    const [existingVolunteers] = await sequelize.query(`
      SELECT "volunteerId" FROM volunteers
      WHERE "volunteerId" IN (${volunteersData.map(v => `'${v.volunteerId}'`).join(',')})
    `);
    
    const existingIds = existingVolunteers.map(v => v.volunteerId);
    const newVolunteers = volunteersData.filter(v => !existingIds.includes(v.volunteerId));

    if (newVolunteers.length === 0) {
      console.log('⚠️  All sample volunteers already exist!');
    } else {
      console.log(`📝 Creating ${newVolunteers.length} new volunteers...`);
    }

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const volunteer of volunteersData) {
      try {
        if (existingIds.includes(volunteer.volunteerId)) {
          console.log(`⏩ Skipping ${volunteer.volunteerId} - already exists`);
          skippedCount++;
          continue;
        }

        await sequelize.query(`
          INSERT INTO volunteers (
            name, email, password, "volunteerId", department, faculty, year, phone,
            "isActive", "permissions", "assignedEvents", "joinDate", "isFirstLogin", 
            "createdAt", "updatedAt"
          ) VALUES (
            :name, :email, :password, :volunteerId, :department, :faculty, :year, :phone,
            true, '{"canScanQR": true, "canManageAttendance": true, "canViewReports": false}',
            '[]', CURRENT_DATE, true, NOW(), NOW()
          )
        `, {
          replacements: {
            name: volunteer.name,
            email: volunteer.email,
            password: hashedPassword,
            volunteerId: volunteer.volunteerId,
            department: volunteer.department,
            faculty: volunteer.faculty,
            year: volunteer.year,
            phone: volunteer.phone
          }
        });

        console.log(`✅ Created: ${volunteer.name} (${volunteer.volunteerId})`);
        createdCount++;
      } catch (error) {
        console.error(`❌ Error creating ${volunteer.volunteerId}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 CREATION SUMMARY:');
    console.log('='.repeat(50));
    console.log(`Total volunteers: ${volunteersData.length}`);
    console.log(`Successfully created: ${createdCount}`);
    console.log(`Skipped (already exists): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('='.repeat(50));

    // Display all volunteers in the table
    const [allVolunteers] = await sequelize.query(`
      SELECT id, name, "volunteerId", email, department, year, "isActive", "isFirstLogin"
      FROM volunteers
      ORDER BY "volunteerId" ASC
    `);

    console.log('\n👥 ALL VOLUNTEERS IN DATABASE:');
    console.log('='.repeat(120));
    console.log('ID'.padEnd(8) + 'Name'.padEnd(20) + 'Volunteer ID'.padEnd(12) + 'Email'.padEnd(30) + 'Dept'.padEnd(8) + 'Year'.padEnd(6) + 'Active'.padEnd(8) + 'FirstLogin');
    console.log('-'.repeat(120));
    
    allVolunteers.forEach(vol => {
      const id = vol.id.substring(0, 7).padEnd(8);
      const name = (vol.name || '').substring(0, 19).padEnd(20);
      const volId = (vol.volunteerId || '').padEnd(12);
      const email = (vol.email || '').substring(0, 29).padEnd(30);
      const dept = (vol.department || 'N/A').substring(0, 7).padEnd(8);
      const year = String(vol.year || 'N/A').padEnd(6);
      const active = vol.isActive ? '✓'.padEnd(8) : '✗'.padEnd(8);
      const firstLogin = vol.isFirstLogin ? '✓' : '✗';
      
      console.log(`${id}${name}${volId}${email}${dept}${year}${active}${firstLogin}`);
    });
    console.log('='.repeat(120));

    console.log('\n🔑 VOLUNTEER LOGIN CREDENTIALS:');
    console.log('='.repeat(120));
    console.log('Login Method: Use Volunteer ID (not email)');
    console.log('Default Password: volunteer123');
    console.log('Login URL: /volunteer/login (or use main login with volunteer ID)');
    console.log('='.repeat(120));
    console.log('Volunteer ID  | Name           | Default Password');
    console.log('-'.repeat(50));
    allVolunteers.forEach(vol => {
      console.log(`${vol.volunteerId.padEnd(12)} | ${vol.name.substring(0, 14).padEnd(14)} | volunteer123`);
    });
    console.log('='.repeat(50));

    console.log('\n📝 TEST LOGIN INSTRUCTIONS:');
    console.log('='.repeat(120));
    console.log('1. Go to login page');
    console.log('2. Enter Volunteer ID (e.g., VOL001)');
    console.log('3. Enter password: volunteer123');
    console.log('4. Click Login');
    console.log('5. Should redirect to volunteer dashboard');
    console.log('='.repeat(120));
    
    console.log('\n✅ Sample volunteer creation completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
  }
}

// Add this check for direct execution
if (require.main === module) {
  createSampleVolunteers();
}

module.exports = createSampleVolunteers;