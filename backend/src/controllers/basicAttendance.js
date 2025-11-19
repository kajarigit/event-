const { Event, Attendance, User } = require('../models/index.sequelize');

/**
 * @desc    Get raw attendance records for an event (minimal processing)
 * @route   GET /api/admin/attendance/raw/:eventId
 * @access  Private (Admin)
 */
exports.getRawEventAttendance = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    console.log('[Raw Attendance] Starting for eventId:', eventId);

    // Just get raw attendance data
    const rawAttendances = await Attendance.findAll({
      where: { eventId: eventId },
      limit: 10,
      order: [['checkInTime', 'DESC']]
    });

    console.log(`[Raw Attendance] Found ${rawAttendances.length} raw records`);

    // Convert to plain JSON to avoid Sequelize issues
    const plainAttendances = rawAttendances.map(record => ({
      id: record.id,
      studentId: record.studentId,
      eventId: record.eventId,
      checkInTime: record.checkInTime,
      checkOutTime: record.checkOutTime,
      status: record.status
    }));

    res.status(200).json({
      success: true,
      message: 'Raw attendance data',
      data: {
        eventId: eventId,
        recordCount: plainAttendances.length,
        records: plainAttendances
      }
    });

  } catch (error) {
    console.error('[Raw Attendance] Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch raw attendance',
      error: error.message
    });
  }
};

/**
 * @desc    Get processed attendance with manual student lookup
 * @route   GET /api/admin/attendance/processed/:eventId
 * @access  Private (Admin)
 */
exports.getProcessedEventAttendance = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { limit = 10 } = req.query;
    
    console.log('[Processed Attendance] Starting for eventId:', eventId, 'limit:', limit);

    // Step 1: Get event info
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Step 2: Get attendance records
    const attendances = await Attendance.findAll({
      where: { eventId: eventId },
      limit: parseInt(limit),
      order: [['checkInTime', 'DESC']]
    });

    console.log(`[Processed Attendance] Found ${attendances.length} attendance records`);

    if (attendances.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          event: { id: event.id, name: event.name },
          records: [],
          summary: { total: 0, active: 0, completed: 0 }
        }
      });
    }

    // Step 3: Get student IDs and fetch students
    const studentIds = attendances.map(a => a.studentId);
    const students = await User.findAll({
      where: { id: studentIds },
      attributes: ['id', 'name', 'rollNumber', 'department']
    });

    console.log(`[Processed Attendance] Found ${students.length} students`);

    // Step 4: Create student lookup
    const studentLookup = {};
    students.forEach(student => {
      studentLookup[student.id] = {
        id: student.id,
        name: student.name,
        rollNumber: student.rollNumber,
        department: student.department
      };
    });

    // Step 5: Process attendance records
    const processedRecords = [];
    let activeCount = 0;
    let completedCount = 0;

    attendances.forEach(attendance => {
      const student = studentLookup[attendance.studentId];
      if (!student) {
        console.log('[Processed Attendance] Student not found for ID:', attendance.studentId);
        return;
      }

      const checkIn = new Date(attendance.checkInTime);
      const checkOut = attendance.checkOutTime ? new Date(attendance.checkOutTime) : null;
      const isActive = !attendance.checkOutTime;

      if (isActive) {
        activeCount++;
      } else {
        completedCount++;
      }

      // Calculate duration
      let durationText = 'Active';
      if (checkOut) {
        const durationMs = checkOut - checkIn;
        const minutes = Math.round(durationMs / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        durationText = hours > 0 ? `${hours}h ${remainingMinutes}m` : `${minutes}m`;
      } else {
        const durationMs = new Date() - checkIn;
        const minutes = Math.round(durationMs / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        durationText = `${hours}h ${remainingMinutes}m (ongoing)`;
      }

      processedRecords.push({
        id: attendance.id,
        student: student,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        checkInFormatted: checkIn.toLocaleString(),
        checkOutFormatted: checkOut ? checkOut.toLocaleString() : null,
        duration: durationText,
        isActive: isActive,
        status: isActive ? 'active' : 'completed'
      });
    });

    console.log('[Processed Attendance] Successfully processed records');

    res.status(200).json({
      success: true,
      data: {
        event: {
          id: event.id,
          name: event.name
        },
        summary: {
          total: processedRecords.length,
          active: activeCount,
          completed: completedCount,
          uniqueStudents: students.length
        },
        records: processedRecords,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[Processed Attendance] Error:', error.message);
    console.error('[Processed Attendance] Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to process attendance',
      error: error.message
    });
  }
};