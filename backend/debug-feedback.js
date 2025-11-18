require('dotenv').config();
const { Client } = require('pg');

async function debugFeedbackIssue() {
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

    // Get active event
    const eventResult = await client.query(`
      SELECT id, name, "isActive", "allowFeedback", "allowVoting"
      FROM events
      WHERE "isActive" = true
      LIMIT 1;
    `);

    if (eventResult.rows.length === 0) {
      console.log('❌ No active event found!');
      console.log('   Please activate an event in the admin panel first.\n');
      return;
    }

    const event = eventResult.rows[0];
    console.log('📅 Active Event:');
    console.log(`   ID: ${event.id}`);
    console.log(`   Name: ${event.name}`);
    console.log(`   Active: ${event.isActive ? '✅ Yes' : '❌ No'}`);
    console.log(`   Allow Feedback: ${event.allowFeedback ? '✅ Yes' : '❌ No'}`);
    console.log(`   Allow Voting: ${event.allowVoting ? '✅ Yes' : '❌ No'}`);
    console.log();

    // Get stalls for this event
    const stallsResult = await client.query(`
      SELECT id, name, "isActive", department
      FROM stalls
      WHERE "eventId" = $1
      ORDER BY department, name;
    `, [event.id]);

    console.log(`🏪 Stalls in Event (${stallsResult.rows.length} total):`);
    console.log('-----------------------------------');
    stallsResult.rows.forEach((stall, idx) => {
      console.log(`${idx + 1}. ${stall.name}`);
      console.log(`   ID: ${stall.id}`);
      console.log(`   Department: ${stall.department}`);
      console.log(`   Active: ${stall.isActive ? '✅ Yes' : '❌ No'}`);
      console.log();
    });

    // Check students
    const studentsResult = await client.query(`
      SELECT id, email, name, department, role
      FROM users
      WHERE role = 'student'
      LIMIT 5;
    `);

    console.log(`👨‍🎓 Sample Students (${studentsResult.rows.length}):`);
    console.log('-----------------------------------');
    studentsResult.rows.forEach((student, idx) => {
      console.log(`${idx + 1}. ${student.name} (${student.email})`);
      console.log(`   ID: ${student.id}`);
      console.log(`   Department: ${student.department}`);
      console.log();
    });

    // Check attendances for the active event
    const attendancesResult = await client.query(`
      SELECT a.*, u.email, u.name
      FROM attendances a
      JOIN users u ON a."studentId" = u.id
      WHERE a."eventId" = $1
      ORDER BY a."checkInTime" DESC;
    `, [event.id]);

    console.log(`✅ Attendances for Active Event (${attendancesResult.rows.length} total):`);
    console.log('-----------------------------------');
    if (attendancesResult.rows.length === 0) {
      console.log('❌ No students checked in!');
      console.log('   Students must be checked in before they can submit feedback.\n');
      console.log('💡 Solutions:');
      console.log('   1. Check in students through the volunteer scanner');
      console.log('   2. Or manually add attendance records');
    } else {
      attendancesResult.rows.forEach((att, idx) => {
        console.log(`${idx + 1}. ${att.name} (${att.email})`);
        console.log(`   Status: ${att.status}`);
        console.log(`   Check-in Time: ${att.checkInTime}`);
        console.log();
      });
    }

    // Check existing feedbacks
    const feedbacksResult = await client.query(`
      SELECT f.*, s.name as stall_name, u.name as student_name
      FROM feedbacks f
      JOIN stalls s ON f."stallId" = s.id
      JOIN users u ON f."studentId" = u.id
      WHERE f."eventId" = $1;
    `, [event.id]);

    console.log(`💬 Existing Feedbacks (${feedbacksResult.rows.length}):`);
    if (feedbacksResult.rows.length > 0) {
      feedbacksResult.rows.forEach((fb, idx) => {
        console.log(`${idx + 1}. ${fb.student_name} → ${fb.stall_name}`);
        console.log(`   Rating: ${'⭐'.repeat(fb.rating)}`);
        console.log(`   Comments: ${fb.comments || 'N/A'}`);
        console.log();
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

debugFeedbackIssue();
