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

    const where = {};
    if (eventId) {
      where.eventId = eventId;
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

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

    res.status(200).json({
      success: true,
      message: 'QR code generated successfully',
      data: qrData,
    });
  } catch (error) {
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
    const { eventId } = req.query;

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

    res.status(200).json({
      success: true,
      count: attendances.length,
      data: attendances,
    });
  } catch (error) {
    next(error);
  }
};

exports.getStatus = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const studentId = req.user.id;

    // Check if student is currently checked in
    const attendance = await Attendance.findOne({
      where: {
        studentId: studentId,
        eventId,
        checkOutTime: null, // Still checked in
      },
    });

    const isCheckedIn = !!attendance;

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
