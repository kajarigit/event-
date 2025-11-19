const { Event, Attendance, User } = require('../models/index.sequelize');
const { Op } = require('sequelize');

/**
 * @desc    Get all student attendance records for an event (direct from attendance table)
 * @route   GET /api/admin/attendance/event/:eventId
 * @access  Private (Admin)
 */
exports.getEventAttendanceRecords = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { limit = 100 } = req.query;

    console.log('[Simple Attendance] Fetching records for eventId:', eventId);

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required',
      });
    }

    // Verify event exists
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Fetch all attendance records for the event directly
    const attendanceRecords = await Attendance.findAll({
      where: { eventId },
      include: [{
        model: User,
        as: 'student',
        attributes: ['id', 'name', 'rollNumber', 'department', 'email']
      }],
      order: [['checkInTime', 'DESC']], // Most recent first
      limit: parseInt(limit)
    });

    console.log(`[Simple Attendance] Found ${attendanceRecords.length} records`);

    // Process each record to calculate duration and format data
    const processedRecords = attendanceRecords.map(record => {
      const checkInTime = new Date(record.checkInTime);
      const checkOutTime = record.checkOutTime ? new Date(record.checkOutTime) : null;
      
      // Calculate duration
      let durationMinutes = 0;
      let durationFormatted = 'Still checked in';
      let isActive = true;
      
      if (checkOutTime) {
        durationMinutes = Math.round((checkOutTime - checkInTime) / (1000 * 60));
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        durationFormatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        isActive = false;
      } else {
        // Calculate current duration if still checked in
        const now = new Date();
        durationMinutes = Math.round((now - checkInTime) / (1000 * 60));
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        durationFormatted = `${hours > 0 ? `${hours}h ` : ''}${minutes}m (ongoing)`;
        isActive = true;
      }

      return {
        id: record.id,
        student: record.student,
        checkInTime: record.checkInTime,
        checkOutTime: record.checkOutTime,
        checkInDate: checkInTime.toLocaleDateString(),
        checkInTimeFormatted: checkInTime.toLocaleTimeString(),
        checkOutDate: checkOutTime ? checkOutTime.toLocaleDateString() : null,
        checkOutTimeFormatted: checkOutTime ? checkOutTime.toLocaleTimeString() : null,
        durationMinutes,
        durationFormatted,
        isActive,
        status: record.status
      };
    });

    // Calculate summary statistics
    const totalRecords = attendanceRecords.length;
    const activeStudents = processedRecords.filter(r => r.isActive).length;
    const completedSessions = processedRecords.filter(r => !r.isActive).length;
    const uniqueStudents = new Set(processedRecords.map(r => r.student.id)).size;
    
    // Calculate total time spent (only for completed sessions)
    const totalMinutesSpent = processedRecords
      .filter(r => !r.isActive)
      .reduce((sum, r) => sum + r.durationMinutes, 0);
    
    const totalHoursSpent = Math.round((totalMinutesSpent / 60) * 100) / 100;

    res.status(200).json({
      success: true,
      data: {
        event: {
          id: event.id,
          name: event.name,
          startDate: event.startDate,
          endDate: event.endDate
        },
        summary: {
          totalRecords,
          uniqueStudents,
          activeStudents,
          completedSessions,
          totalMinutesSpent,
          totalHoursSpent,
          averageSessionMinutes: completedSessions > 0 ? Math.round(totalMinutesSpent / completedSessions) : 0
        },
        records: processedRecords,
        generatedAt: new Date().toISOString(),
        recordCount: processedRecords.length
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
 * @desc    Get attendance records for a specific student
 * @route   GET /api/admin/attendance/student/:studentId
 * @access  Private (Admin)
 */
exports.getStudentAttendanceRecords = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { eventId } = req.query;

    console.log('[Simple Attendance] Fetching student records for:', studentId);

    const whereClause = { studentId };
    if (eventId) {
      whereClause.eventId = eventId;
    }

    // Fetch student's attendance records
    const attendanceRecords = await Attendance.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'rollNumber', 'department', 'email']
        },
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name', 'startDate', 'endDate']
        }
      ],
      order: [['checkInTime', 'DESC']]
    });

    if (attendanceRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No attendance records found for this student'
      });
    }

    // Process records similar to above
    const processedRecords = attendanceRecords.map(record => {
      const checkInTime = new Date(record.checkInTime);
      const checkOutTime = record.checkOutTime ? new Date(record.checkOutTime) : null;
      
      let durationMinutes = 0;
      let durationFormatted = 'Still checked in';
      let isActive = true;
      
      if (checkOutTime) {
        durationMinutes = Math.round((checkOutTime - checkInTime) / (1000 * 60));
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        durationFormatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        isActive = false;
      } else {
        const now = new Date();
        durationMinutes = Math.round((now - checkInTime) / (1000 * 60));
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        durationFormatted = `${hours > 0 ? `${hours}h ` : ''}${minutes}m (ongoing)`;
      }

      return {
        id: record.id,
        event: record.event,
        checkInTime: record.checkInTime,
        checkOutTime: record.checkOutTime,
        checkInDate: checkInTime.toLocaleDateString(),
        checkInTimeFormatted: checkInTime.toLocaleTimeString(),
        checkOutDate: checkOutTime ? checkOutTime.toLocaleDateString() : null,
        checkOutTimeFormatted: checkOutTime ? checkOutTime.toLocaleTimeString() : null,
        durationMinutes,
        durationFormatted,
        isActive,
        status: record.status
      };
    });

    // Calculate totals for this student
    const totalMinutesSpent = processedRecords
      .filter(r => !r.isActive)
      .reduce((sum, r) => sum + r.durationMinutes, 0);
    
    const totalHoursSpent = Math.round((totalMinutesSpent / 60) * 100) / 100;

    res.status(200).json({
      success: true,
      data: {
        student: attendanceRecords[0].student,
        summary: {
          totalSessions: processedRecords.length,
          activeSessions: processedRecords.filter(r => r.isActive).length,
          completedSessions: processedRecords.filter(r => !r.isActive).length,
          totalMinutesSpent,
          totalHoursSpent,
          averageSessionMinutes: processedRecords.filter(r => !r.isActive).length > 0 
            ? Math.round(totalMinutesSpent / processedRecords.filter(r => !r.isActive).length) 
            : 0
        },
        records: processedRecords,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[Simple Attendance] Student error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student attendance records',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};