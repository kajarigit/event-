const { Event, Attendance, User, sequelize } = require('../models/index.sequelize');
const { Op } = require('sequelize');

/**
 * @desc    Get all attendance records for an event (simple direct query)
 * @route   GET /api/admin/attendance/event/:eventId
 * @access  Private (Admin)
 */
exports.getEventAttendanceRecords = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { limit = 50 } = req.query;

    console.log('[Simple Attendance] Fetching records for eventId:', eventId);

    // First verify the event exists
    const event = await Event.findByPk(eventId);
    if (!event) {
      console.log('[Simple Attendance] Event not found');
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    console.log('[Simple Attendance] Event found:', event.name);

    // Try simple Sequelize query first
    console.log('[Simple Attendance] Using simple Sequelize query...');
    
    const attendanceRecords = await Attendance.findAll({
      where: { eventId: eventId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'rollNumber', 'department', 'email'],
          where: { role: 'student' }
        }
      ],
      order: [['checkInTime', 'DESC']],
      limit: parseInt(limit)
    });

    console.log(`[Simple Attendance] Found ${attendanceRecords.length} records`);

    // Process the results (Sequelize objects)
    const processedRecords = attendanceRecords.map(record => {
      const checkIn = new Date(record.checkInTime);
      const checkOut = record.checkOutTime ? new Date(record.checkOutTime) : null;
      
      let duration = null;
      let durationMinutes = 0;
      let durationFormatted = 'Active';
      
      if (checkOut) {
        durationMinutes = Math.round((checkOut - checkIn) / (1000 * 60));
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        durationFormatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      } else {
        // Calculate current duration for active sessions
        durationMinutes = Math.round((new Date() - checkIn) / (1000 * 60));
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        durationFormatted = `${hours}h ${minutes}m (Active)`;
      }

      return {
        id: record.id,
        student: {
          id: record.student.id,
          name: record.student.name,
          rollNumber: record.student.rollNumber,
          department: record.student.department,
          email: record.student.email
        },
        checkInTime: record.checkInTime,
        checkOutTime: record.checkOutTime,
        checkInDate: checkIn.toDateString(),
        checkInTimeFormatted: checkIn.toLocaleTimeString(),
        checkOutDate: checkOut ? checkOut.toDateString() : null,
        checkOutTimeFormatted: checkOut ? checkOut.toLocaleTimeString() : null,
        status: record.checkOutTime ? 'completed' : 'active',
        durationMinutes: durationMinutes,
        durationFormatted: durationFormatted,
        isActive: !record.checkOutTime
      };
    });

    // Calculate summary statistics
    const totalRecords = processedRecords.length;
    const uniqueStudents = new Set(processedRecords.map(r => r.student.id)).size;
    const activeStudents = processedRecords.filter(r => r.isActive).length;
    const completedSessions = processedRecords.filter(r => !r.isActive).length;
    const totalMinutes = processedRecords
      .filter(r => !r.isActive)
      .reduce((sum, r) => sum + r.durationMinutes, 0);
    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

    const summary = {
      totalRecords,
      uniqueStudents,
      activeStudents,
      completedSessions,
      totalMinutesSpent: totalMinutes,
      totalHoursSpent: totalHours
    };

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
    console.error('[Simple Attendance] Error:', error.message);
    console.error('[Simple Attendance] Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance records',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @desc    Get simple attendance summary for all events
 * @route   GET /api/admin/attendance/summary
 * @access  Private (Admin)
 */
exports.getAttendanceSummary = async (req, res, next) => {
  try {
    console.log('[Attendance Summary] Fetching summary...');
    
    const summaryData = await sequelize.query(`
      SELECT 
        e.id::text as event_id,
        e.name as event_name,
        COUNT(a.id)::integer as total_records,
        COUNT(DISTINCT a."studentId")::integer as unique_students,
        COUNT(CASE WHEN a."checkOutTime" IS NULL THEN 1 END)::integer as active_sessions,
        COUNT(CASE WHEN a."checkOutTime" IS NOT NULL THEN 1 END)::integer as completed_sessions
      FROM events e
      LEFT JOIN attendances a ON e.id = a."eventId"
      LEFT JOIN users u ON a."studentId" = u.id AND u.role = 'student'
      WHERE e.active = true
      GROUP BY e.id, e.name
      ORDER BY e."createdAt" DESC
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    res.status(200).json({
      success: true,
      data: summaryData
    });

  } catch (error) {
    console.error('[Attendance Summary] Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance summary',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};