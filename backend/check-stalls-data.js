require('dotenv').config();
const { Client } = require('pg');

async function checkStalls() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? {
      rejectUnauthorized: false
    } : false
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check stalls
    const stallsResult = await client.query(`
      SELECT id, name, department, "isActive", "eventId"
      FROM stalls
      ORDER BY department, name
      LIMIT 20;
    `);

    console.log(`📊 Found ${stallsResult.rowCount} stalls:\n`);
    console.log('ID                                    | Name                      | Dept  | Active | Event ID');
    console.log('--------------------------------------------------------------------------------------------------------');
    
    stallsResult.rows.forEach(stall => {
      const id = stall.id.substring(0, 36);
      const name = stall.name.padEnd(25);
      const dept = (stall.department || 'N/A').padEnd(5);
      const active = stall.isActive ? '✅' : '❌';
      const eventId = stall.eventId ? stall.eventId.substring(0, 8) + '...' : 'N/A';
      console.log(`${id} | ${name} | ${dept} | ${active}    | ${eventId}`);
    });

    console.log('\n');

    // Check events
    const eventsResult = await client.query(`
      SELECT id, name, "isActive", "allowFeedback", "allowVoting"
      FROM events
      ORDER BY "createdAt" DESC
      LIMIT 5;
    `);

    console.log(`📅 Found ${eventsResult.rowCount} events:\n`);
    eventsResult.rows.forEach(event => {
      console.log(`Event: ${event.name}`);
      console.log(`  ID: ${event.id}`);
      console.log(`  Active: ${event.isActive ? '✅ Yes' : '❌ No'}`);
      console.log(`  Allow Feedback: ${event.allowFeedback ? '✅ Yes' : '❌ No'}`);
      console.log(`  Allow Voting: ${event.allowVoting ? '✅ Yes' : '❌ No'}`);
      console.log();
    });

    // Check students
    const studentsResult = await client.query(`
      SELECT id, email, department
      FROM users
      WHERE role = 'student'
      LIMIT 5;
    `);

    console.log(`👥 Sample students:\n`);
    studentsResult.rows.forEach(student => {
      console.log(`  ${student.email} (${student.department}) - ID: ${student.id.substring(0, 8)}...`);
    });
    console.log();

    // Check attendances
    const attendancesResult = await client.query(`
      SELECT COUNT(*) as count, status
      FROM attendances
      GROUP BY status;
    `);

    console.log(`📋 Attendances:\n`);
    attendancesResult.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkStalls();
