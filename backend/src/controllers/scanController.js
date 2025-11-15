const Attendance = require('../models/Attendance');
const ScanLog = require('../models/ScanLog');
const Event = require('../models/Event');
const User = require('../models/User');
const Stall = require('../models/Stall');
const { verifyQRToken } = require('../utils/jwt');
const mongoose = require('mongoose');

/**
 * @desc    Scan student QR at gate (check-in/check-out)
 * @route   POST /api/scan/student
 * @access  Private (Volunteer, Admin)
 */
exports.scanStudent = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { qrToken } = req.body;
    const volunteerId = req.user._id;

    // Edge Case 1: Validate QR token exists
    if (!qrToken) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'QR token is required',
      });
    }

    // Verify QR token
    let decoded;
    try {
      decoded = verifyQRToken(qrToken);
    } catch (error) {
      await session.abortTransaction();
      
      // Edge Case 2: Handle expired QR codes
      if (error.message.includes('expired')) {
        return res.status(400).json({
          success: false,
          message: 'QR code has expired. Please generate a new one.',
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code: ' + error.message,
      });
    }

    // Edge Case 3: Validate token type
    if (decoded.type !== 'student') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code type. This is not a student QR code.',
      });
    }

    const { studentId, eventId } = decoded;

    // Edge Case 4: Validate student exists and is active
    const student = await User.findById(studentId);
    if (!student) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Student not found in the system',
      });
    }

    if (!student.isActive) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: 'Student account is inactive. Please contact admin.',
      });
    }

    if (student.role !== 'student') {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: 'This QR code does not belong to a student',
      });
    }

    // Edge Case 5: Validate event exists and is active
    const event = await Event.findById(eventId);
    if (!event) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    if (!event.isActive) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: 'This event is no longer active',
      });
    }

    // Edge Case 6: Check if event has ended
    if (event.endDate && new Date() > new Date(event.endDate)) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: 'This event has already ended',
      });
    }

    // Edge Case 7: Check if event hasn't started yet
    if (event.startDate && new Date() < new Date(event.startDate)) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: 'This event has not started yet',
      });
    }

    // Edge Case 8: Check current attendance status
    // CRITICAL: Student stays checked-in even after logout until they physically check out
    const currentAttendance = await Attendance.findOne({
      studentId,
      eventId,
      status: 'checked-in',
    }).session(session);

    let action, attendance;

    if (!currentAttendance) {
      // CHECK IN
      // Edge Case 9: Prevent duplicate check-ins (check for recent check-out)
      const recentCheckout = await Attendance.findOne({
        studentId,
        eventId,
        status: 'checked-out',
        outTimestamp: { $gte: new Date(Date.now() - 60000) }, // Within last minute
      }).session(session);

      if (recentCheckout) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'You just checked out. Please wait a minute before checking in again.',
        });
      }

      attendance = await Attendance.create(
        [
          {
            studentId,
            eventId,
            inTimestamp: new Date(),
            gate: req.user.assignedGate || 'Main Gate',
            checkedInBy: volunteerId,
            status: 'checked-in',
          },
        ],
        { session }
      );
      action = 'in';
    } else {
      // CHECK OUT
      // Edge Case 10: Prevent immediate re-checkout
      if (currentAttendance.inTimestamp > new Date(Date.now() - 30000)) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'You just checked in. Please wait at least 30 seconds before checking out.',
        });
      }

      currentAttendance.outTimestamp = new Date();
      currentAttendance.checkedOutBy = volunteerId;
      currentAttendance.status = 'checked-out';
      await currentAttendance.save({ session });
      attendance = currentAttendance;
      action = 'out';
    }

    // Create scan log
    await ScanLog.create(
      [
        {
          volunteerId,
          studentId,
          eventId,
          qrType: 'student',
          action: action === 'in' ? 'gate-check-in' : 'gate-check-out',
          gate: req.user.assignedGate || 'Main Gate',
          metadata: {
            studentName: student.name,
            studentRollNo: student.rollNo,
            department: student.department,
            programme: student.programme,
          },
          scanTime: new Date(),
        },
      ],
      { session }
    );

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: action === 'in' ? 'Student checked in successfully' : 'Student checked out successfully',
      data: {
        action,
        student: {
          id: student._id,
          name: student.name,
          rollNo: student.rollNo,
          department: student.department,
          programme: student.programme,
        },
        attendance: attendance[0] || attendance,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Scan stall QR (for feedback/voting)
 * @route   POST /api/scan/stall
 * @access  Private (Student, must be checked in)
 */
exports.scanStall = async (req, res, next) => {
  try {
    const { token, eventId } = req.body;
    const studentId = req.user._id;

    // Verify QR token
    let decoded;
    try {
      decoded = verifyQRToken(token);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    // Validate token type
    if (decoded.type !== 'stall') {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code type',
      });
    }

    // Get stall
    const stall = await Stall.findById(decoded.stallId);
    if (!stall) {
      return res.status(404).json({
        success: false,
        message: 'Stall not found',
      });
    }

    if (!stall.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Stall is not active',
      });
    }

    // Check attendance
    const Feedback = require('../models/Feedback');
    const Vote = require('../models/Vote');

    const canFeedback = !(await Feedback.findOne({ studentId, stallId: stall._id, eventId }));
    const hasCompletedVoting = await Vote.hasCompletedVoting(studentId, eventId);

    // Log scan
    await ScanLog.create({
      volunteerId: studentId, // Student is scanner in this case
      studentId,
      stallId: stall._id,
      eventId,
      qrType: 'stall',
      action: 'stall-scan',
      metadata: {
        stallName: stall.name,
        canFeedback,
        canVote: !hasCompletedVoting,
      },
      timestamp: new Date(),
    });

    // Update stall stats
    stall.stats.totalScans += 1;
    await stall.save();

    res.status(200).json({
      success: true,
      message: 'Stall scanned successfully',
      data: {
        stall: {
          id: stall._id,
          name: stall.name,
          department: stall.department,
          description: stall.description,
        },
        canFeedback,
        canVote: !hasCompletedVoting,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get scan logs
 * @route   GET /api/scan/logs
 * @access  Private (Volunteer, Admin)
 */
exports.getScanLogs = async (req, res, next) => {
  try {
    const { eventId, volunteerId, studentId, qrType, action, limit = 50, page = 1 } = req.query;

    const filter = {};
    if (eventId) filter.eventId = eventId;
    if (volunteerId) filter.volunteerId = volunteerId;
    if (studentId) filter.studentId = studentId;
    if (qrType) filter.qrType = qrType;
    if (action) filter.action = action;

    const logs = await ScanLog.find(filter)
      .populate('volunteerId', 'name email role')
      .populate('studentId', 'name rollNo department')
      .populate('stallId', 'name department')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await ScanLog.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get scan log by ID
 * @route   GET /api/scan/logs/:id
 * @access  Private (Volunteer, Admin)
 */
exports.getScanLogById = async (req, res, next) => {
  try {
    const log = await ScanLog.findById(req.params.id)
      .populate('volunteerId', 'name email role')
      .populate('studentId', 'name rollNo department')
      .populate('stallId', 'name department');

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Scan log not found',
      });
    }

    res.status(200).json({
      success: true,
      data: log,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Flag scan as erroneous
 * @route   PUT /api/scan/logs/:id/flag
 * @access  Private (Volunteer, Admin)
 */
exports.flagScanError = async (req, res, next) => {
  try {
    const { errorMessage, correctionNote } = req.body;

    const log = await ScanLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Scan log not found',
      });
    }

    log.isError = true;
    log.errorMessage = errorMessage;
    log.correctionNote = correctionNote;
    log.correctedBy = req.user._id;

    await log.save();

    res.status(200).json({
      success: true,
      message: 'Scan flagged successfully',
      data: log,
    });
  } catch (error) {
    next(error);
  }
};
