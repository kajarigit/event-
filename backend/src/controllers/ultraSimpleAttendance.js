const { Event, Attendance, User } = require('../models/index.sequelize');

/**
 * @desc    Get all attendance records for an event (ultra-simple approach)
 * @route   GET /api/admin/attendance/event/:eventId
 * @access  Private (Admin)
 */
exports.getEventAttendanceRecords = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { limit = 50 } = req.query;

    console.log('[Ultra Simple] Fetching attendance for eventId:', eventId);

    // Verify event exists
    const event = await Event.findByPk(eventId);
    if (!event) {
      console.log('[Ultra Simple] Event not found');
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    console.log('[Ultra Simple] Event found:', event.name);

    // Get attendance records WITHOUT associations first
    console.log('[Ultra Simple] Fetching attendance records...');
    const attendances = await Attendance.findAll({
      where: { eventId: eventId },
      order: [['checkInTime', 'DESC']],
      limit: parseInt(limit)
    });

    console.log(`[Ultra Simple] Found ${attendances.length} attendance records`);

    if (attendances.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          event: { id: event.id, name: event.name },
          summary: { totalRecords: 0, uniqueStudents: 0, activeStudents: 0, completedSessions: 0, totalHoursSpent: 0 },
          records: [],
          generatedAt: new Date().toISOString()
        }
      });
    }

    // Get unique student IDs
    const studentIds = [...new Set(attendances.map(a => a.studentId))];
    console.log(`[Ultra Simple] Fetching ${studentIds.length} unique students...`);

    // Fetch students separately
    const students = await User.findAll({
      where: { 
        id: studentIds,
        role: 'student'
      },
      attributes: ['id', 'name', 'rollNumber', 'department', 'email']
    });

    console.log(`[Ultra Simple] Found ${students.length} students`);

    // Create a student lookup map
    const studentMap = {};
    students.forEach(student => {
      studentMap[student.id] = student;
    });

    // Process records
    const processedRecords = [];
    let totalMinutes = 0;
    let activeCount = 0;
    let completedCount = 0;

    attendances.forEach(attendance => {
      const student = studentMap[attendance.studentId];
      if (!student) return; // Skip if student not found or not a student role

      const checkIn = new Date(attendance.checkInTime);
      const checkOut = attendance.checkOutTime ? new Date(attendance.checkOutTime) : null;
      
      let durationMinutes = 0;
      let durationFormatted = 'Active';
      let isActive = true;
      
      if (checkOut) {
        durationMinutes = Math.round((checkOut - checkIn) / (1000 * 60));
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        durationFormatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        totalMinutes += durationMinutes;
        completedCount++;
        isActive = false;
      } else {
        // Calculate current duration for active sessions
        durationMinutes = Math.round((new Date() - checkIn) / (1000 * 60));
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        durationFormatted = `${hours}h ${minutes}m (Active)`;
        activeCount++;
      }

      processedRecords.push({
        id: attendance.id,
        student: {
          id: student.id,
          name: student.name,
          rollNumber: student.rollNumber,
          department: student.department,
          email: student.email
        },
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        checkInDate: checkIn.toDateString(),
        checkInTimeFormatted: checkIn.toLocaleTimeString(),
        checkOutDate: checkOut ? checkOut.toDateString() : null,
        checkOutTimeFormatted: checkOut ? checkOut.toLocaleTimeString() : null,
        status: isActive ? 'active' : 'completed',
        durationMinutes: durationMinutes,
        durationFormatted: durationFormatted,
        isActive: isActive
      });
    });

    const summary = {
      totalRecords: processedRecords.length,
      uniqueStudents: studentIds.length,
      activeStudents: activeCount,
      completedSessions: completedCount,
      totalMinutesSpent: totalMinutes,
      totalHoursSpent: Math.round((totalMinutes / 60) * 100) / 100
    };

    console.log('[Ultra Simple] Successfully processed records');

    res.status(200).json({
      success: true,
      data: {
        event: {
          id: event.id,
          name: event.name,
          startDate: event.startDate,
          endDate: event.endDate
        },
        summary,
        records: processedRecords,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[Ultra Simple] Error:', error.message);
    console.error('[Ultra Simple] Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance records',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @desc    Test endpoint to verify controller is working
 * @route   GET /api/admin/attendance/test
 * @access  Private (Admin)
 */
exports.testAttendanceEndpoint = async (req, res, next) => {
  try {
    console.log('[Test] Attendance endpoint test...');
    
    // Test basic model access
    const eventCount = await Event.count();
    const attendanceCount = await Attendance.count();
    const userCount = await User.count({ where: { role: 'student' } });

    res.status(200).json({
      success: true,
      message: 'Attendance endpoint is working!',
      stats: {
        events: eventCount,
        attendances: attendanceCount,
        students: userCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Test] Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error.message
    });
  }
};