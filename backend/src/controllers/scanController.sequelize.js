const { Attendance, ScanLog, Event, User, Stall, Feedback, Vote, sequelize } = require('../models/index.sequelize');
const { verifyQRToken } = require('../utils/jwt');
const { Op } = require('sequelize');

/**
 * @desc    Scan student QR at gate (check-in/check-out)
 * @route   POST /api/scan/student
 * @access  Private (Volunteer, Admin)
 */
exports.scanStudent = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { qrToken } = req.body;
    const volunteerId = req.user.id;

    console.log('🔍 [SCAN] Request received:', { 
      hasQrToken: !!qrToken, 
      qrTokenType: typeof qrToken,
      tokenLength: qrToken?.length,
      tokenStart: qrToken?.substring(0, 20) + '...',
      volunteerId,
      volunteerIdType: typeof volunteerId
    });

    // VALIDATION 1: QR token must exist
    if (!qrToken || typeof qrToken !== 'string') {
      await transaction.rollback();
      console.error('❌ [SCAN] No QR token provided');
      return res.status(400).json({
        success: false,
        message: 'QR token is required and must be a string',
      });
    }

    // VALIDATION 2: Clean and normalize the token
    const cleanToken = qrToken.trim();
    
    if (!cleanToken) {
      await transaction.rollback();
      console.error('❌ [SCAN] Empty QR token after trimming');
      return res.status(400).json({
        success: false,
        message: 'QR token cannot be empty',
      });
    }

    console.log('✅ [SCAN] Token cleaned, length:', cleanToken.length);

    // VALIDATION 3: Verify and decode JWT token
    let decoded;
    try {
      decoded = verifyQRToken(cleanToken);
      console.log('✅ [SCAN] Token decoded:', {
        studentId: decoded.studentId,
        studentIdType: typeof decoded.studentId,
        eventId: decoded.eventId,
        eventIdType: typeof decoded.eventId,
        type: decoded.type,
        hasNonce: !!decoded.nonce,
        iat: decoded.iat,
        exp: decoded.exp
      });
    } catch (error) {
      await transaction.rollback();
      console.error('❌ [SCAN] Token verification failed:', {
        error: error.message,
        name: error.name
      });
      
      // Handle specific JWT errors
      if (error.name === 'TokenExpiredError' || error.message.includes('expired')) {
        return res.status(400).json({
          success: false,
          message: 'QR code has expired. Please generate a new one.',
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid QR code format. Please generate a new one.',
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code: ' + error.message,
      });
    }

    // VALIDATION 4: Check token type
    if (decoded.type !== 'student') {
      await transaction.rollback();
      console.error('❌ [SCAN] Invalid token type:', decoded.type);
      return res.status(400).json({
        success: false,
        message: `Invalid QR code type "${decoded.type}". Expected "student" QR code.`,
      });
    }

    // VALIDATION 5: Extract and normalize IDs
    const studentId = String(decoded.studentId).trim();
    const eventId = String(decoded.eventId).trim();

    if (!studentId || !eventId) {
      await transaction.rollback();
      console.error('❌ [SCAN] Missing IDs in token:', { studentId, eventId });
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code: missing student or event information',
      });
    }

    console.log('🔍 [SCAN] Looking up student:', {
      studentId,
      studentIdLength: studentId.length
    });

    // VALIDATION 6: Verify student exists
    const student = await User.findByPk(studentId, { transaction });
    
    if (!student) {
      await transaction.rollback();
      console.error('❌ [SCAN] Student not found:', studentId);
      return res.status(404).json({
        success: false,
        message: 'Student not found in the system. Please contact admin.',
      });
    }

    console.log('✅ [SCAN] Student found:', { 
      id: student.id, 
      name: student.name, 
      role: student.role,
      isActive: student.isActive
    });

    // VALIDATION 7: Check student is active
    if (!student.isActive) {
      await transaction.rollback();
      console.error('❌ [SCAN] Student account inactive:', student.id);
      return res.status(403).json({
        success: false,
        message: 'Student account is inactive. Please contact admin.',
      });
    }

    // VALIDATION 8: Verify student role
    if (student.role !== 'student') {
      await transaction.rollback();
      console.error('❌ [SCAN] User is not a student:', {
        userId: student.id,
        role: student.role
      });
      return res.status(403).json({
        success: false,
        message: `This QR code belongs to a ${student.role}, not a student`,
      });
    }

    console.log('🔍 [SCAN] Looking up event:', eventId);

    // VALIDATION 9: Verify event exists
    const event = await Event.findByPk(eventId, { transaction });
    
    if (!event) {
      await transaction.rollback();
      console.error('❌ [SCAN] Event not found:', eventId);
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    console.log('✅ [SCAN] Event found:', {
      id: event.id,
      name: event.name,
      isActive: event.isActive
    });

    // VALIDATION 10: Check event is active
    if (!event.isActive) {
      await transaction.rollback();
      console.error('❌ [SCAN] Event inactive:', event.id);
      return res.status(403).json({
        success: false,
        message: 'This event is no longer active',
      });
    }

    // VALIDATION 11: Check event dates
    const now = new Date();
    
    if (event.endDate && now > new Date(event.endDate)) {
      await transaction.rollback();
      console.error('❌ [SCAN] Event ended:', {
        eventId: event.id,
        endDate: event.endDate,
        now
      });
      return res.status(403).json({
        success: false,
        message: 'This event has already ended',
      });
    }

    if (event.startDate && now < new Date(event.startDate)) {
      await transaction.rollback();
      console.error('❌ [SCAN] Event not started:', {
        eventId: event.id,
        startDate: event.startDate,
        now
      });
      return res.status(403).json({
        success: false,
        message: 'This event has not started yet',
      });
    }

    // VALIDATION 12: Check current attendance status
    console.log('🔍 [SCAN] Checking attendance status...');
    
    const currentAttendance = await Attendance.findOne({
      where: {
        studentId,
        eventId,
        status: 'checked-in',
      },
      transaction,
    });

    let action, attendance;

    if (!currentAttendance) {
      // ========== CHECK IN ==========
      console.log('📥 [SCAN] Processing CHECK-IN...');
      
      // Prevent rapid re-check-in after check-out
      const recentCheckout = await Attendance.findOne({
        where: {
          studentId,
          eventId,
          status: 'checked-out',
          checkOutTime: {
            [Op.gte]: new Date(Date.now() - 60000), // Within last minute
          },
        },
        transaction,
      });

      if (recentCheckout) {
        await transaction.rollback();
        console.error('❌ [SCAN] Recent checkout detected:', {
          checkOutTime: recentCheckout.checkOutTime
        });
        return res.status(400).json({
          success: false,
          message: 'You just checked out. Please wait a minute before checking in again.',
        });
      }

      attendance = await Attendance.create(
        {
          studentId,
          eventId,
          checkInTime: new Date(),
          status: 'checked-in',
        },
        { transaction }
      );
      
      action = 'in';
      console.log('✅ [SCAN] CHECK-IN successful:', attendance.id);
      
    } else {
      // ========== CHECK OUT ==========
      console.log('📤 [SCAN] Processing CHECK-OUT...');
      
      // Prevent immediate re-checkout (must wait 30 seconds)
      const timeSinceCheckIn = Date.now() - new Date(currentAttendance.checkInTime).getTime();
      
      if (timeSinceCheckIn < 30000) {
        await transaction.rollback();
        console.error('❌ [SCAN] Too soon for checkout:', {
          checkInTime: currentAttendance.checkInTime,
          timeSinceCheckIn: `${Math.floor(timeSinceCheckIn / 1000)}s`
        });
        return res.status(400).json({
          success: false,
          message: `You just checked in ${Math.floor(timeSinceCheckIn / 1000)} seconds ago. Please wait at least 30 seconds before checking out.`,
        });
      }

      await currentAttendance.update(
        {
          checkOutTime: new Date(),
          status: 'checked-out',
        },
        { transaction }
      );
      
      attendance = currentAttendance;
      action = 'out';
      console.log('✅ [SCAN] CHECK-OUT successful:', attendance.id);
    }

    // Create scan log
    const scanLog = await ScanLog.create(
      {
        userId: volunteerId,
        eventId,
        scanType: action === 'in' ? 'check-in' : 'check-out',
        scanTime: new Date(),
        status: 'success',
      },
      { transaction }
    );

    console.log('✅ [SCAN] Scan log created:', scanLog.id);

    await transaction.commit();
    console.log('✅ [SCAN] Transaction committed successfully');

    res.status(200).json({
      success: true,
      message: `Student ${action === 'in' ? 'checked in' : 'checked out'} successfully`,
      data: {
        action,
        student: {
          id: student.id,
          name: student.name,
          rollNumber: student.rollNumber,
          department: student.department,
          programme: student.programme,
        },
        event: {
          id: event.id,
          name: event.name,
        },
        attendance: {
          id: attendance.id,
          checkInTime: attendance.checkInTime,
          checkOutTime: attendance.checkOutTime,
          status: attendance.status,
        },
        timestamp: new Date(),
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ [SCAN] Unexpected error:', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * @desc    Scan stall QR (for voting/feedback)
 * @route   POST /api/scan/stall
 * @access  Private (Student)
 */
exports.scanStall = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { qrToken, action } = req.body; // action: 'vote' or 'feedback'
    const studentId = req.user.id;

    if (!qrToken) {
      await transaction.rollback();
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
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired QR code',
      });
    }

    if (decoded.type !== 'stall') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code type. This is not a stall QR code.',
      });
    }

    const { stallId, eventId } = decoded;

    // Validate stall exists
    const stall = await Stall.findByPk(stallId, { transaction });
    if (!stall || !stall.isActive) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Stall not found or inactive',
      });
    }

    // Validate event
    const event = await Event.findByPk(eventId, { transaction });
    if (!event || !event.isActive) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Event not found or inactive',
      });
    }

    // Check if student is checked in
    const attendance = await Attendance.findOne({
      where: {
        studentId,
        eventId,
        status: 'checked-in',
      },
      transaction,
    });

    if (!attendance) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'You must be checked in to the event to interact with stalls',
      });
    }

    // Handle vote or feedback based on action
    let result;
    if (action === 'vote') {
      if (!event.allowVoting) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'Voting is not allowed for this event',
        });
      }

      // Check if already voted
      const existingVote = await Vote.findOne({
        where: { studentId, stallId, eventId },
        transaction,
      });

      if (existingVote) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'You have already voted for this stall',
        });
      }

      // Check vote limit
      const voteCount = await Vote.count({
        where: { studentId, eventId },
        transaction,
      });

      if (voteCount >= (event.maxVotesPerStudent || 3)) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: `You have reached the maximum number of votes (${event.maxVotesPerStudent || 3})`,
        });
      }

      result = await Vote.create(
        {
          studentId,
          stallId,
          eventId,
        },
        { transaction }
      );
    } else if (action === 'feedback') {
      if (!event.allowFeedback) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'Feedback is not allowed for this event',
        });
      }

      // Note: Actual feedback submission might be a separate endpoint
      // This just validates the scan
      result = { message: 'Scan successful. You can now submit feedback.' };
    } else {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "vote" or "feedback"',
      });
    }

    // Create scan log
    await ScanLog.create(
      {
        userId: studentId,
        eventId,
        stallId,
        scanType: action,
        scanTime: new Date(),
        status: 'success',
      },
      { transaction }
    );

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: `Stall scanned successfully for ${action}`,
      data: {
        stall: {
          id: stall.id,
          name: stall.name,
          category: stall.category,
        },
        action,
        result,
      },
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * @desc    Get scan logs (for admin/volunteer)
 * @route   GET /api/scan/logs
 * @access  Private (Admin, Volunteer)
 */
exports.getScanLogs = async (req, res, next) => {
  try {
    const { eventId, userId, scanType, status, limit = 50, page = 1 } = req.query;

    const where = {};
    if (eventId) where.eventId = eventId;
    if (userId) where.userId = userId;
    if (scanType) where.scanType = scanType;
    if (status) where.status = status;

    const { count, rows: logs } = await ScanLog.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'role', 'rollNumber', 'department'],
        },
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name'],
        },
        {
          model: Stall,
          as: 'stall',
          attributes: ['id', 'name', 'category'],
          required: false,
        },
      ],
      order: [['scanTime', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    // Transform data to match frontend expectations (studentId field)
    const transformedLogs = logs.map(log => {
      const logData = log.toJSON();
      // Map 'user' to 'studentId' for consistency with frontend
      if (logData.user) {
        logData.studentId = {
          name: logData.user.name,
          rollNo: logData.user.rollNumber,
          department: logData.user.department,
        };
      }
      return logData;
    });

    res.status(200).json({
      success: true,
      count: transformedLogs.length,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
      data: transformedLogs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single scan log
 * @route   GET /api/scan/logs/:id
 * @access  Private (Admin, Volunteer)
 */
exports.getScanLogById = async (req, res, next) => {
  try {
    const log = await ScanLog.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'role'],
        },
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name'],
        },
        {
          model: Stall,
          as: 'stall',
          attributes: ['id', 'name', 'category'],
          required: false,
        },
      ],
    });

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
 * @desc    Flag scan error
 * @route   PATCH /api/scan/logs/:id/flag
 * @access  Private (Admin)
 */
exports.flagScanError = async (req, res, next) => {
  try {
    const { errorMessage } = req.body;

    const log = await ScanLog.findByPk(req.params.id);

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Scan log not found',
      });
    }

    await log.update({
      status: 'failed',
      errorMessage: errorMessage || 'Flagged by admin',
    });

    res.status(200).json({
      success: true,
      message: 'Scan log flagged successfully',
      data: log,
    });
  } catch (error) {
    next(error);
  }
};
