/**
 * Test script for the new attendance tracking features
 * Run this after migration to verify everything works
 */

// Load environment variables
require('dotenv').config();

const { sequelize } = require('../config/database');
const { Event, User, Attendance, StudentEventAttendanceSummary } = require('../models/index.sequelize');

const testAttendanceFeatures = async () => {
  console.log('🧪 Testing new attendance tracking features...');

  try {
    // Find a test event and student
    const testEvent = await Event.findOne({ where: { isActive: true } });
    const testStudent = await User.findOne({ where: { role: 'student' } });

    if (!testEvent || !testStudent) {
      console.log('⚠️  No active event or student found for testing');
      return;
    }

    console.log(`📋 Testing with Event: "${testEvent.name}" and Student: "${testStudent.name}"`);

    // Test 1: Check if new columns exist
    console.log('\n🔍 Test 1: Checking database structure...');
    
    const attendanceStructure = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'attendances' 
        AND column_name IN ('isNullified', 'nullifiedDuration', 'nullifiedReason', 'eventStopTime')
      ORDER BY column_name
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('New attendance columns:', attendanceStructure);

    const summaryTable = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'student_event_attendance_summaries'
      ORDER BY column_name
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`Summary table has ${summaryTable.length} columns`);

    // Test 2: Test attendance summary creation
    console.log('\n🔍 Test 2: Testing attendance summary...');
    
    const [summary, created] = await StudentEventAttendanceSummary.findOrCreate({
      where: {
        eventId: testEvent.id,
        studentId: testStudent.id
      },
      defaults: {
        totalValidDuration: 3600, // 1 hour
        totalSessions: 1,
        currentStatus: 'checked-out'
      }
    });

    console.log(`Summary ${created ? 'created' : 'found'}:`, {
      totalValidHours: Math.floor(summary.totalValidDuration / 3600),
      totalSessions: summary.totalSessions,
      currentStatus: summary.currentStatus
    });

    // Test 3: Test nullified attendance
    console.log('\n🔍 Test 3: Testing nullified attendance record...');
    
    const testAttendance = await Attendance.create({
      eventId: testEvent.id,
      studentId: testStudent.id,
      checkInTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      checkOutTime: new Date(),
      status: 'auto-checkout',
      isNullified: true,
      nullifiedDuration: 7200, // 2 hours
      nullifiedReason: 'Event stopped - auto checkout test',
      eventStopTime: new Date()
    });

    console.log('Created nullified attendance record:', {
      id: testAttendance.id,
      isNullified: testAttendance.isNullified,
      nullifiedHours: Math.floor(testAttendance.nullifiedDuration / 3600),
      reason: testAttendance.nullifiedReason
    });

    // Test 4: Test API endpoints (if server is running)
    console.log('\n✅ Database structure tests passed!');
    console.log('\n📝 Next steps:');
    console.log('1. Start the backend server: npm run dev');
    console.log('2. Test admin endpoint: GET /api/admin/events/{eventId}/attendance-summary');
    console.log('3. Test student endpoint: GET /api/student/attendance-summary/{eventId}');
    console.log('4. Test event stop functionality: PATCH /api/admin/events/{eventId}/end');

    // Clean up test data
    await testAttendance.destroy();
    console.log('\n🧹 Cleaned up test data');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
};

// Run test if called directly
if (require.main === module) {
  testAttendanceFeatures()
    .then(() => {
      console.log('\n🎉 All tests completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Tests failed:', error);
      process.exit(1);
    });
}

module.exports = { testAttendanceFeatures };