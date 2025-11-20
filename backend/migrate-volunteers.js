require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

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
    logging: console.log,
  }
);

async function migrateVolunteersToSeparateTable() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Step 1: Check if volunteers table already exists
    const [existingTable] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'volunteers'
    `);

    if (existingTable.length > 0) {
      console.log('⚠️  volunteers table already exists!');
      console.log('Do you want to:');
      console.log('1. Drop and recreate (DESTRUCTIVE)');
      console.log('2. Skip table creation');
      console.log('3. Exit');
      // For automation, we'll skip if exists
      console.log('📋 Skipping table creation, proceeding to data migration...\n');
    } else {
      // Step 2: Create volunteers table
      console.log('📋 Creating volunteers table...');
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS "volunteers" (
          "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          "name" VARCHAR(255) NOT NULL,
          "email" VARCHAR(255),
          "password" VARCHAR(255) NOT NULL,
          "phone" VARCHAR(255),
          "volunteerId" VARCHAR(255) NOT NULL UNIQUE,
          "faculty" VARCHAR(255),
          "department" VARCHAR(255),
          "programme" VARCHAR(255),
          "year" INTEGER,
          "isActive" BOOLEAN DEFAULT true,
          "qrToken" TEXT,
          "permissions" JSONB DEFAULT '{"canScanQR": true, "canManageAttendance": true, "canViewReports": false}',
          "assignedEvents" JSONB DEFAULT '[]',
          "shiftStart" TIME,
          "shiftEnd" TIME,
          "supervisorId" UUID,
          "joinDate" DATE,
          "lastLoginAt" TIMESTAMP WITH TIME ZONE,
          "isFirstLogin" BOOLEAN DEFAULT true,
          "notes" TEXT,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
      `);
      console.log('✅ volunteers table created');
    }

    // Step 3: Get all volunteers from users table
    console.log('🔍 Finding volunteers in users table...');
    const [volunteers] = await sequelize.query(`
      SELECT id, name, email, password, phone, "volunteerId", faculty, department, programme, year, 
             "isActive", "qrToken", "createdAt", "updatedAt"
      FROM users
      WHERE role = 'volunteer' AND "volunteerId" IS NOT NULL
      ORDER BY name ASC
    `);

    console.log(`📊 Found ${volunteers.length} volunteers in users table\n`);

    if (volunteers.length === 0) {
      console.log('ℹ️  No volunteers found in users table. Migration complete.');
      await sequelize.close();
      return;
    }

    // Step 4: Check if volunteers already exist in volunteers table
    const [existingVolunteers] = await sequelize.query(`
      SELECT "volunteerId" FROM volunteers
    `);
    
    const existingVolunteerIds = existingVolunteers.map(v => v.volunteerId);
    console.log(`📋 Found ${existingVolunteers.length} existing volunteers in volunteers table`);

    // Step 5: Migrate volunteers one by one
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const volunteer of volunteers) {
      try {
        if (existingVolunteerIds.includes(volunteer.volunteerId)) {
          console.log(`⏩ Skipping ${volunteer.volunteerId} - already exists in volunteers table`);
          skippedCount++;
          continue;
        }

        await sequelize.query(`
          INSERT INTO volunteers (
            id, name, email, password, phone, "volunteerId", faculty, department, 
            programme, year, "isActive", "qrToken", "createdAt", "updatedAt"
          ) VALUES (
            :id, :name, :email, :password, :phone, :volunteerId, :faculty, :department,
            :programme, :year, :isActive, :qrToken, :createdAt, :updatedAt
          )
        `, {
          replacements: {
            id: volunteer.id,
            name: volunteer.name,
            email: volunteer.email,
            password: volunteer.password,
            phone: volunteer.phone,
            volunteerId: volunteer.volunteerId,
            faculty: volunteer.faculty,
            department: volunteer.department,
            programme: volunteer.programme,
            year: volunteer.year,
            isActive: volunteer.isActive,
            qrToken: volunteer.qrToken,
            createdAt: volunteer.createdAt,
            updatedAt: volunteer.updatedAt
          }
        });

        console.log(`✅ Migrated: ${volunteer.name} (${volunteer.volunteerId})`);
        migratedCount++;
      } catch (error) {
        console.error(`❌ Error migrating ${volunteer.volunteerId}:`, error.message);
        errorCount++;
      }
    }

    // Step 6: Verify migration
    console.log('\n📊 MIGRATION SUMMARY:');
    console.log('='.repeat(50));
    console.log(`Total volunteers found: ${volunteers.length}`);
    console.log(`Successfully migrated: ${migratedCount}`);
    console.log(`Skipped (already exists): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('='.repeat(50));

    // Step 7: Display migrated volunteers
    const [migratedVolunteers] = await sequelize.query(`
      SELECT id, name, "volunteerId", email, department, "isActive"
      FROM volunteers
      ORDER BY name ASC
    `);

    console.log('\n📋 VOLUNTEERS IN NEW TABLE:');
    console.log('='.repeat(80));
    console.log('Name'.padEnd(25) + 'Volunteer ID'.padEnd(15) + 'Email'.padEnd(25) + 'Dept'.padEnd(10) + 'Active');
    console.log('-'.repeat(80));
    
    migratedVolunteers.forEach(vol => {
      const name = (vol.name || '').substring(0, 24).padEnd(25);
      const volId = (vol.volunteerId || '').substring(0, 14).padEnd(15);
      const email = (vol.email || 'N/A').substring(0, 24).padEnd(25);
      const dept = (vol.department || 'N/A').substring(0, 9).padEnd(10);
      const active = vol.isActive ? '✓' : '✗';
      
      console.log(`${name}${volId}${email}${dept}${active}`);
    });
    console.log('='.repeat(80));

    // Step 8: Generate volunteer credentials for reference
    console.log('\n🔑 VOLUNTEER LOGIN CREDENTIALS:');
    console.log('='.repeat(80));
    console.log('Default password: volunteer123 (if not already changed)');
    console.log('Login URL: /volunteer/login');
    console.log('Login Method: Use volunteerId (not email)');
    console.log('='.repeat(80));

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Update authentication controller to use volunteers table');
    console.log('2. Update any scan log references to volunteers table');
    console.log('3. Test volunteer login functionality');
    console.log('4. Consider removing volunteers from users table after testing');

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
  }
}

// Add this check for direct execution
if (require.main === module) {
  migrateVolunteersToSeparateTable();
}

module.exports = migrateVolunteersToSeparateTable;