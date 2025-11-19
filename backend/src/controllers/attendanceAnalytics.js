const { Event, Attendance, User, Vote, Feedback } = require('../models/index.sequelize');
const { Op } = require('sequelize');

/**
 * @desc    Get comprehensive attendance analytics with multiple sessions per student
 * @route   GET /api/admin/analytics/attendance-comprehensive
 * @access  Private (Admin)
 */
exports.getComprehensiveAttendance = async (req, res, next) => {
  try {
    const { eventId, limit = 100 } = req.query;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required',
      });
    }

    console.log('[Analytics] Fetching comprehensive attendance for eventId:', eventId);

    // Verify event exists
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Get all attendance records for the event
    const attendances = await Attendance.findAll({
      where: { eventId },
      include: [{
        model: User,
        as: 'student',
        where: { role: 'student' },
        attributes: ['id', 'name', 'rollNumber', 'department', 'email']
      }],
      order: [['student', 'name', 'ASC'], ['checkInTime', 'ASC']]
    });

    console.log(`[Analytics] Found ${attendances.length} attendance records`);

    // Group attendance records by student
    const studentMap = new Map();
    
    attendances.forEach(record => {
      const studentId = record.student.id;
      
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          student: {
            id: record.student.id,
            name: record.student.name,
            rollNumber: record.student.rollNumber,
            department: record.student.department,
            email: record.student.email
          },
          sessions: [],
          statistics: {
            totalSessions: 0,
            totalTimeMinutes: 0,
            totalTimeHours: 0,
            averageSessionMinutes: 0,
            currentlyCheckedIn: false,
            firstCheckIn: null,
            lastActivity: null
          }
        });
      }
      
      const studentData = studentMap.get(studentId);
      
      // Calculate session duration
      const checkInTime = new Date(record.checkInTime);
      const checkOutTime = record.checkOutTime ? new Date(record.checkOutTime) : new Date();
      const sessionMinutes = Math.round((checkOutTime - checkInTime) / (1000 * 60));
      
      // Add session
      studentData.sessions.push({
        id: record.id,
        checkInTime: record.checkInTime,
        checkOutTime: record.checkOutTime,
        status: record.checkOutTime ? 'completed' : 'active',
        durationMinutes: sessionMinutes,
        durationHours: Math.round((sessionMinutes / 60) * 100) / 100,
        formattedDuration: formatDuration(sessionMinutes)
      });
    });

    // Calculate statistics for each student
    const studentsWithStats = Array.from(studentMap.values()).map(studentData => {
      const { sessions } = studentData;
      
      studentData.statistics.totalSessions = sessions.length;
      studentData.statistics.totalTimeMinutes = sessions.reduce((sum, session) => sum + session.durationMinutes, 0);
      studentData.statistics.totalTimeHours = Math.round((studentData.statistics.totalTimeMinutes / 60) * 100) / 100;
      studentData.statistics.averageSessionMinutes = sessions.length > 0 
        ? Math.round(studentData.statistics.totalTimeMinutes / sessions.length) 
        : 0;
      studentData.statistics.currentlyCheckedIn = sessions.some(session => session.status === 'active');
      studentData.statistics.firstCheckIn = sessions.length > 0 ? sessions[0].checkInTime : null;
      studentData.statistics.lastActivity = sessions.length > 0 
        ? sessions[sessions.length - 1].checkOutTime || sessions[sessions.length - 1].checkInTime 
        : null;
      studentData.statistics.formattedTotalTime = formatDuration(studentData.statistics.totalTimeMinutes);
      
      return studentData;
    });

    // Sort by total time (highest first) and limit results
    const topStudents = studentsWithStats
      .sort((a, b) => b.statistics.totalTimeMinutes - a.statistics.totalTimeMinutes)
      .slice(0, parseInt(limit));

    // Calculate overall statistics
    const overallStats = {
      totalUniqueStudents: studentsWithStats.length,
      totalAttendanceSessions: attendances.length,
      currentlyCheckedIn: studentsWithStats.filter(s => s.statistics.currentlyCheckedIn).length,
      totalTimeAllStudents: studentsWithStats.reduce((sum, s) => sum + s.statistics.totalTimeMinutes, 0),
      averageTimePerStudent: studentsWithStats.length > 0 
        ? Math.round((studentsWithStats.reduce((sum, s) => sum + s.statistics.totalTimeMinutes, 0) / studentsWithStats.length) * 100) / 100
        : 0,
      averageSessionsPerStudent: studentsWithStats.length > 0
        ? Math.round((attendances.length / studentsWithStats.length) * 100) / 100
        : 0
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
        students: topStudents,
        overallStatistics: overallStats,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[Analytics] Comprehensive attendance error:', error.message);
    console.error('[Analytics] Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @desc    Get individual student attendance history
 * @route   GET /api/admin/analytics/student-history/:studentId
 * @access  Private (Admin)
 */
exports.getStudentAttendanceHistory = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { eventId } = req.query;

    const whereClause = { studentId };
    if (eventId) {
      whereClause.eventId = eventId;
    }

    const attendances = await Attendance.findAll({
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

    const formattedHistory = attendances.map(record => {
      const checkInTime = new Date(record.checkInTime);
      const checkOutTime = record.checkOutTime ? new Date(record.checkOutTime) : null;
      const durationMinutes = checkOutTime 
        ? Math.round((checkOutTime - checkInTime) / (1000 * 60))
        : Math.round((new Date() - checkInTime) / (1000 * 60));

      return {
        id: record.id,
        event: record.event,
        checkInTime: record.checkInTime,
        checkOutTime: record.checkOutTime,
        status: record.checkOutTime ? 'completed' : 'active',
        durationMinutes,
        durationHours: Math.round((durationMinutes / 60) * 100) / 100,
        formattedDuration: formatDuration(durationMinutes)
      };
    });

    const totalTime = formattedHistory.reduce((sum, record) => sum + record.durationMinutes, 0);

    res.status(200).json({
      success: true,
      data: {
        student: attendances.length > 0 ? attendances[0].student : null,
        attendanceHistory: formattedHistory,
        statistics: {
          totalSessions: formattedHistory.length,
          totalTimeMinutes: totalTime,
          totalTimeHours: Math.round((totalTime / 60) * 100) / 100,
          formattedTotalTime: formatDuration(totalTime),
          averageSessionMinutes: formattedHistory.length > 0 ? Math.round(totalTime / formattedHistory.length) : 0,
          currentlyActive: formattedHistory.some(record => record.status === 'active')
        }
      }
    });

  } catch (error) {
    console.error('[Analytics] Student history error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student attendance history',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @desc    Get attendance summary by department
 * @route   GET /api/admin/analytics/department-attendance
 * @access  Private (Admin)
 */
exports.getDepartmentAttendanceStats = async (req, res, next) => {
  try {
    const { eventId } = req.query;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required',
      });
    }

    const attendances = await Attendance.findAll({
      where: { eventId },
      include: [{
        model: User,
        as: 'student',
        where: { role: 'student' },
        attributes: ['id', 'name', 'department']
      }],
      order: [['checkInTime', 'ASC']]
    });

    // Group by department
    const departmentStats = {};

    attendances.forEach(record => {
      const dept = record.student.department || 'Unknown';
      
      if (!departmentStats[dept]) {
        departmentStats[dept] = {
          department: dept,
          uniqueStudents: new Set(),
          totalSessions: 0,
          totalTimeMinutes: 0,
          currentlyCheckedIn: 0
        };
      }

      const checkInTime = new Date(record.checkInTime);
      const checkOutTime = record.checkOutTime ? new Date(record.checkOutTime) : new Date();
      const sessionMinutes = Math.round((checkOutTime - checkInTime) / (1000 * 60));

      departmentStats[dept].uniqueStudents.add(record.student.id);
      departmentStats[dept].totalSessions++;
      departmentStats[dept].totalTimeMinutes += sessionMinutes;
      
      if (!record.checkOutTime) {
        departmentStats[dept].currentlyCheckedIn++;
      }
    });

    // Convert to array and calculate averages
    const departmentArray = Object.values(departmentStats).map(dept => ({
      department: dept.department,
      uniqueStudents: dept.uniqueStudents.size,
      totalSessions: dept.totalSessions,
      currentlyCheckedIn: dept.currentlyCheckedIn,
      totalTimeMinutes: dept.totalTimeMinutes,
      totalTimeHours: Math.round((dept.totalTimeMinutes / 60) * 100) / 100,
      averageTimePerStudent: dept.uniqueStudents.size > 0 
        ? Math.round((dept.totalTimeMinutes / dept.uniqueStudents.size) * 100) / 100 
        : 0,
      averageSessionsPerStudent: dept.uniqueStudents.size > 0
        ? Math.round((dept.totalSessions / dept.uniqueStudents.size) * 100) / 100
        : 0
    })).sort((a, b) => b.totalTimeMinutes - a.totalTimeMinutes);

    res.status(200).json({
      success: true,
      data: departmentArray
    });

  } catch (error) {
    console.error('[Analytics] Department stats error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department attendance statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Helper function to format duration
function formatDuration(totalMinutes) {
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (minutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${minutes}m`;
}