require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function checkDatabaseStructure() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully\n');

    // Get all table names
    console.log('📋 DATABASE TABLES:');
    console.log('='.repeat(50));
    const [tables] = await sequelize.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);
    
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.tablename}`);
    });
    console.log('='.repeat(50));

    // Check if volunteers table exists
    const volunteerTableExists = tables.some(t => t.tablename === 'volunteers');
    console.log(`\n🔍 Volunteers table exists: ${volunteerTableExists ? '✅ YES' : '❌ NO'}`);

    if (volunteerTableExists) {
      // Get volunteers table structure
      console.log('\n📊 VOLUNTEERS TABLE STRUCTURE:');
      console.log('='.repeat(80));
      const [columns] = await sequelize.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'volunteers'
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `);

      columns.forEach(col => {
        console.log(`${col.column_name.padEnd(20)} | ${col.data_type.padEnd(15)} | Nullable: ${col.is_nullable.padEnd(3)} | Default: ${col.column_default || 'None'}`);
      });
      console.log('='.repeat(80));

      // Check data in volunteers table
      console.log('\n📈 VOLUNTEERS TABLE DATA:');
      console.log('='.repeat(120));
      const [volunteers] = await sequelize.query(`
        SELECT id, name, "volunteerId", email, department, "isActive", "isFirstLogin", "createdAt"::date as created
        FROM volunteers
        ORDER BY "createdAt" DESC
        LIMIT 10;
      `);

      if (volunteers.length === 0) {
        console.log('❌ No volunteers found in the table');
      } else {
        console.log(`✅ Found ${volunteers.length} volunteer(s):`);
        console.log('');
        console.log('ID'.padEnd(38) + '| Name'.padEnd(25) + '| Volunteer ID'.padEnd(15) + '| Email'.padEnd(30) + '| Department'.padEnd(15) + '| Active | Created');
        console.log('-'.repeat(120));
        volunteers.forEach(vol => {
          const id = vol.id.toString().substring(0, 36).padEnd(38);
          const name = (vol.name || '').substring(0, 23).padEnd(25);
          const volId = (vol.volunteerId || '').padEnd(15);
          const email = (vol.email || 'N/A').substring(0, 28).padEnd(30);
          const dept = (vol.department || 'N/A').substring(0, 13).padEnd(15);
          const active = vol.isActive ? '✅' : '❌';
          const created = vol.created || 'N/A';
          console.log(`${id}| ${name}| ${volId}| ${email}| ${dept}| ${active.padEnd(6)} | ${created}`);
        });
      }
      console.log('='.repeat(120));

      // Get total count
      const [countResult] = await sequelize.query(`SELECT COUNT(*) as total FROM volunteers;`);
      console.log(`\n📊 Total volunteers in database: ${countResult[0].total}`);
    }

    // Also check users table for volunteers (in case they're stored there)
    console.log('\n🔍 CHECKING USERS TABLE FOR VOLUNTEERS:');
    console.log('='.repeat(80));
    const [userVolunteers] = await sequelize.query(`
      SELECT id, name, email, role, "volunteerId", "createdAt"::date as created
      FROM users
      WHERE role = 'volunteer'
      ORDER BY "createdAt" DESC
      LIMIT 10;
    `);

    if (userVolunteers.length === 0) {
      console.log('❌ No volunteers found in users table');
    } else {
      console.log(`✅ Found ${userVolunteers.length} volunteer(s) in users table:`);
      console.log('');
      console.log('Name'.padEnd(25) + '| Email'.padEnd(30) + '| Volunteer ID'.padEnd(15) + '| Role'.padEnd(10) + '| Created');
      console.log('-'.repeat(80));
      userVolunteers.forEach(vol => {
        const name = (vol.name || '').substring(0, 23).padEnd(25);
        const email = (vol.email || 'N/A').substring(0, 28).padEnd(30);
        const volId = (vol.volunteerId || 'N/A').padEnd(15);
        const role = (vol.role || '').padEnd(10);
        const created = vol.created || 'N/A';
        console.log(`${name}| ${email}| ${volId}| ${role}| ${created}`);
      });
    }
    console.log('='.repeat(80));

    // Get total count of user volunteers
    const [userCountResult] = await sequelize.query(`SELECT COUNT(*) as total FROM users WHERE role = 'volunteer';`);
    console.log(`\n📊 Total volunteers in users table: ${userCountResult[0].total}`);

    console.log('\n✅ Database structure check complete!');

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await sequelize.close();
  }
}

checkDatabaseStructure();