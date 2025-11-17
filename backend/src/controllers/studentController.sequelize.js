const { Feedback, Vote, Attendance, Stall, Event, User, sequelize } = require('../models/index.sequelize');
const { generateStudentQR } = require('../utils/jwt');
const { Op } = require('sequelize');

/**
 * @desc    Get active events for students
 * @route   GET /api/student/events
 * @access  Private (Student)
 */
exports.getEvents = async (req, res, next) => {
  try {
    const { isActive, limit } = req.query;

    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const events = await Event.findAll({
      where,
      order: [['startDate', 'DESC']],
      limit: parseInt(limit) || 50,
    });

    res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get stalls for an event
 * @route   GET /api/student/stalls
 * @access  Private (Student)
 */
exports.getStalls = async (req, res, next) => {
  try {
    const { eventId, isActive } = req.query;
    const studentId = req.user.id;

    // Get student details with department for filtering
    const student = await User.findByPk(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const where = {};
    if (eventId) {
      where.eventId = eventId;
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // DEPARTMENT FILTER: Only show stalls from student's own department for voting
    where.department = student.department;

    const stalls = await Stall.findAll({
      where,
      include: [
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name', 'startDate', 'endDate'],
        },
      ],
      order: [['name', 'ASC']],
    });

    console.log(`[Student Stalls] Showing ${stalls.length} stalls from ${student.department} department for student ${student.name}`);

    res.status(200).json({
      success: true,
      count: stalls.length,
      data: stalls,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get student QR code for event
 * @route   GET /api/student/qrcode/:eventId
 * @access  Private (Student)
 */
exports.getQRCode = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const studentId = req.user.id;

    console.log('🎫 Generating QR:', { 
      studentId, 
      studentIdType: typeof studentId,
      eventId,
      eventIdType: typeof eventId
    });

    // Check if event exists and is active
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    if (!event.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Event is not active',
      });
    }

    // Generate QR code
    const qrData = await generateStudentQR(studentId, eventId);
    
    console.log('✅ QR Generated:', {
      hasToken: !!qrData.token,
      tokenLength: qrData.token?.length,
      tokenPreview: qrData.token?.substring(0, 50) + '...',
      expiresAt: qrData.expiresAt
    });

    res.status(200).json({
      success: true,
      message: 'QR code generated successfully',
      data: qrData,
    });
  } catch (error) {
    console.error('❌ QR Generation Error:', error);
    next(error);
  }
};

/**
 * @desc    Submit feedback for a stall
 * @route   POST /api/student/feedback
 * @access  Private (Student, must be checked in)
 */
exports.submitFeedback = async (req, res, next) => {
  try {
    const { stallId, eventId, rating, comments } = req.body;
    const studentId = req.user.id;

    // Check if stall exists
    const stall = await Stall.findByPk(stallId);
    if (!stall || !stall.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Stall not found or inactive',
      });
    }

    // Check if event allows feedback
    const event = await Event.findByPk(eventId);
    if (!event || !event.allowFeedback) {
      return res.status(403).json({
        success: false,
        message: 'Feedback is not allowed for this event',
      });
    }

    // Check if student is checked in
    const attendance = await Attendance.findOne({
      where: {
        studentId,
        eventId,
        status: 'checked-in',
      },
    });

    if (!attendance) {
      return res.status(403).json({
        success: false,
        message: 'You must be checked in to submit feedback',
      });
    }

    // Check if feedback already exists
    const existingFeedback = await Feedback.findOne({
      where: { studentId, stallId, eventId },
    });

    if (existingFeedback) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted feedback for this stall',
      });
    }

    // Create feedback
    const feedback = await Feedback.create({
      studentId,
      stallId,
      eventId,
      rating,
      comments,
    });

    // Update stall statistics after feedback submission
    try {
      const feedbackStats = await Feedback.findAll({
        where: { stallId: stall.id },
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalFeedbacks'],
          [sequelize.fn('AVG', sequelize.col('rating')), 'averageRating'],
        ],
        raw: true,
      });

      if (feedbackStats.length > 0 && feedbackStats[0].totalFeedbacks > 0) {
        const totalFeedbacks = parseInt(feedbackStats[0].totalFeedbacks);
        const averageRating = parseFloat(feedbackStats[0].averageRating);

        await stall.update({
          stats: {
            ...stall.stats,
            totalFeedbacks: totalFeedbacks,
            averageRating: Math.round(averageRating * 10) / 10,
          },
        });

        console.log(`[Feedback] Updated stats for ${stall.name}: ${totalFeedbacks} feedbacks, ${Math.round(averageRating * 10) / 10} avg rating`);
      }
    } catch (statsError) {
      console.error('[Feedback] Error updating stall stats:', statsError);
      // Don't fail the request if stats update fails
    }

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cast vote for a stall
 * @route   POST /api/student/vote
 * @access  Private (Student, must be checked in)
 */
exports.castVote = async (req, res, next) => {
  try {
    const { stallId, eventId } = req.body;
    const studentId = req.user.id;

    // Get student details with department
    const student = await User.findByPk(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Check if event allows voting
    const event = await Event.findByPk(eventId);
    if (!event || !event.allowVoting) {
      return res.status(403).json({
        success: false,
        message: 'Voting is not allowed for this event',
      });
    }

    // Check if student is checked in
    const attendance = await Attendance.findOne({
      where: {
        studentId,
        eventId,
        status: 'checked-in',
      },
    });

    if (!attendance) {
      return res.status(403).json({
        success: false,
        message: 'You must be checked in to vote',
      });
    }

    // Check if stall exists
    const stall = await Stall.findByPk(stallId);
    if (!stall || !stall.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Stall not found or inactive',
      });
    }

    // DEPARTMENT RESTRICTION: Student can only vote for stalls from their own department
    if (student.department && stall.department) {
      if (student.department !== stall.department) {
        return res.status(403).json({
          success: false,
          message: `You can only vote for stalls from your department (${student.department}). This stall is from ${stall.department}.`,
        });
      }
    }

    // Check if vote already exists
    const existingVote = await Vote.findOne({
      where: { studentId, stallId, eventId },
    });

    if (existingVote) {
      return res.status(400).json({
        success: false,
        message: 'You have already voted for this stall',
      });
    }

    // Check vote limit per student
    const voteCount = await Vote.count({
      where: { studentId, eventId },
    });

    if (voteCount >= (event.maxVotesPerStudent || 3)) {
      return res.status(403).json({
        success: false,
        message: `You have reached the maximum number of votes (${event.maxVotesPerStudent || 3})`,
      });
    }

    // Create vote
    const vote = await Vote.create({
      studentId,
      stallId,
      eventId,
    });

    res.status(201).json({
      success: true,
      message: 'Vote cast successfully',
      data: vote,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get student's votes
 * @route   GET /api/student/votes
 * @access  Private (Student)
 */
exports.getMyVotes = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { eventId } = req.query;

    const where = { studentId };
    if (eventId) {
      where.eventId = eventId;
    }

    const votes = await Vote.findAll({
      where,
      include: [
        {
          model: Stall,
          as: 'stall',
          attributes: ['id', 'name', 'category'],
        },
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      count: votes.length,
      data: votes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get student's feedbacks
 * @route   GET /api/student/feedbacks
 * @access  Private (Student)
 */
exports.getMyFeedbacks = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { eventId } = req.query;

    const where = { studentId };
    if (eventId) {
      where.eventId = eventId;
    }

    const feedbacks = await Feedback.findAll({
      where,
      include: [
        {
          model: Stall,
          as: 'stall',
          attributes: ['id', 'name', 'category'],
        },
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      count: feedbacks.length,
      data: feedbacks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get student's attendance
 * @route   GET /api/student/attendance
 * @access  Private (Student)
 */
exports.getAttendance = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { eventId } = req.params;

    const where = { studentId };
    if (eventId) {
      where.eventId = eventId;
    }

    const attendances = await Attendance.findAll({
      where,
      include: [
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name', 'startDate', 'endDate'],
        },
      ],
      order: [['checkInTime', 'DESC']],
    });

    // Format the response with proper status and timestamps
    const formattedAttendances = attendances.map(att => ({
      id: att.id,
      eventId: att.eventId,
      event: att.event,
      status: att.checkOutTime ? 'checked-out' : 'checked-in', // Fix: Calculate actual status
      checkInTime: att.checkInTime,
      checkOutTime: att.checkOutTime,
      inTimestamp: att.checkInTime,  // For frontend compatibility
      outTimestamp: att.checkOutTime, // For frontend compatibility
      durationSeconds: att.checkOutTime 
        ? Math.floor((new Date(att.checkOutTime) - new Date(att.checkInTime)) / 1000)
        : null,
    }));

    // Calculate total duration for completed sessions
    const totalDurationSeconds = formattedAttendances
      .filter(att => att.durationSeconds)
      .reduce((sum, att) => sum + att.durationSeconds, 0);

    res.status(200).json({
      success: true,
      count: formattedAttendances.length,
      data: {
        attendances: formattedAttendances,
        totalDurationSeconds,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getStatus = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const studentId = req.user.id;

    // Get the LATEST attendance record for this student and event
    const latestAttendance = await Attendance.findOne({
      where: {
        studentId: studentId,
        eventId,
      },
      order: [['checkInTime', 'DESC']], // Get most recent
    });

    // Student is checked in if:
    // 1. They have an attendance record AND
    // 2. The latest record has status 'checked-in' (checkOutTime is null)
    const isCheckedIn = latestAttendance && latestAttendance.checkOutTime === null;

    // Get student's votes for this event
    const votes = await Vote.findAll({
      where: {
        studentId: studentId,
        eventId,
      },
      include: [
        {
          model: Stall,
          as: 'stall',
          attributes: ['id', 'name', 'category'],
        },
      ],
    });

    // Get feedback count
    const feedbackCount = await Feedback.count({
      where: {
        studentId: studentId,
        eventId,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        isCheckedIn,
        votesCount: votes.length,
        votes: votes.map((v) => ({
          rank: v.rank,
          stall: v.stall,
        })),
        feedbacksGiven: feedbackCount,
      },
    });
  } catch (error) {
    next(error);
  }
};
