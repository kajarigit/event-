const mongoose = require('mongoose');
const Feedback = require('../models/Feedback');
const Vote = require('../models/Vote');
const Attendance = require('../models/Attendance');
const Stall = require('../models/Stall');
const Event = require('../models/Event');
const { generateStudentQR } = require('../utils/jwt');

/**
 * @desc    Get active events for students
 * @route   GET /api/student/events
 * @access  Private (Student)
 */
exports.getEvents = async (req, res, next) => {
  try {
    const { isActive, limit } = req.query;

    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const events = await Event.find(query)
      .sort({ startTime: -1 })
      .limit(parseInt(limit) || 50);

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

    const query = {};
    if (eventId) {
      query.eventId = eventId;
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const stalls = await Stall.find(query)
      .populate('eventId', 'name startTime endTime')
      .sort({ name: 1 });

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
    const studentId = req.user._id;

    // Check if event exists and is active
    const event = await Event.findById(eventId);
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
    const { stallId, eventId, rating, comment, isAnonymous } = req.body;
    const studentId = req.user._id;

    // Check if stall exists
    const stall = await Stall.findById(stallId);
    if (!stall || !stall.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Stall not found or inactive',
      });
    }

    // Check if event allows feedback
    const event = await Event.findById(eventId);
    if (!event || !event.allowFeedback) {
      return res.status(403).json({
        success: false,
        message: 'Feedback is not allowed for this event',
      });
    }

    // Get current attendance
    const attendance = await Attendance.getCurrentStatus(studentId, eventId);

    // Create feedback
    const feedback = await Feedback.create({
      studentId,
      stallId,
      eventId,
      rating,
      comment,
      isAnonymous: isAnonymous || false,
      attendanceId: attendance ? attendance._id : null,
    });

    // Update stall statistics
    const feedbackStats = await Feedback.aggregate([
      {
        $match: { 
          stallId: mongoose.Types.ObjectId(stallId),
          eventId: mongoose.Types.ObjectId(eventId)
        },
      },
      {
        $group: {
          _id: null,
          totalFeedbacks: { $sum: 1 },
          averageRating: { $avg: '$rating' },
        },
      },
    ]);

    console.log('[Feedback] Stats calculated:', feedbackStats);

    if (feedbackStats.length > 0) {
      stall.stats.totalFeedbacks = feedbackStats[0].totalFeedbacks;
      stall.stats.averageRating = Math.round(feedbackStats[0].averageRating * 10) / 10;
      await stall.save();
      console.log('[Feedback] Stall stats updated:', {
        totalFeedbacks: stall.stats.totalFeedbacks,
        averageRating: stall.stats.averageRating
      });
    } else {
      console.log('[Feedback] No feedback stats found - this should not happen!');
    }

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: feedback,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'You have already submitted feedback for this stall',
      });
    }
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
    const { stallId, eventId, rank } = req.body;
    const studentId = req.user._id;

    // Check if stall exists
    const stall = await Stall.findById(stallId);
    if (!stall || !stall.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Stall not found or inactive',
      });
    }

    // Check if event allows voting
    const event = await Event.findById(eventId);
    if (!event || !event.allowVoting) {
      return res.status(403).json({
        success: false,
        message: 'Voting is not allowed for this event',
      });
    }

    // Check if student has already voted for a different stall at this rank
    const existingVote = await Vote.findOne({ studentId, eventId, rank });
    if (existingVote) {
      // Check if trying to vote for same stall
      if (existingVote.stallId.toString() === stallId) {
        return res.status(409).json({
          success: false,
          message: 'You have already voted for this stall at this rank',
        });
      }

      // Update existing vote (change stall for this rank)
      const oldStallId = existingVote.stallId;
      existingVote.stallId = stallId;
      existingVote.votedAt = new Date();
      await existingVote.save();

      // Update old stall stats (decrement)
      await updateStallVoteStats(oldStallId, eventId, rank, -1);

      // Update new stall stats (increment)
      await updateStallVoteStats(stallId, eventId, rank, 1);

      return res.status(200).json({
        success: true,
        message: 'Vote updated successfully',
        data: existingVote,
      });
    }

    // Check if student has already voted for this stall at a different rank
    const duplicateStall = await Vote.findOne({ studentId, eventId, stallId });
    if (duplicateStall) {
      return res.status(409).json({
        success: false,
        message: 'You have already voted for this stall at a different rank',
      });
    }

    // Get current attendance
    const attendance = await Attendance.getCurrentStatus(studentId, eventId);

    // Create vote
    const vote = await Vote.create({
      studentId,
      stallId,
      eventId,
      rank,
      attendanceId: attendance ? attendance._id : null,
    });

    // Update stall statistics
    await updateStallVoteStats(stallId, eventId, rank, 1);

    res.status(201).json({
      success: true,
      message: 'Vote cast successfully',
      data: vote,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'You have already voted at this rank',
      });
    }
    next(error);
  }
};

/**
 * Helper function to update stall vote statistics
 */
async function updateStallVoteStats(stallId, eventId, rank, increment = 1) {
  const stall = await Stall.findById(stallId);
  if (!stall) return;

  const rankField = `rank${rank}Votes`;
  stall.stats[rankField] = (stall.stats[rankField] || 0) + increment;

  // Update total votes
  const voteCount = await Vote.countDocuments({ stallId, eventId });
  stall.stats.totalVotes = voteCount;

  await stall.save();
}

/**
 * @desc    Get student's votes for an event
 * @route   GET /api/student/votes/:eventId
 * @access  Private (Student)
 */
exports.getMyVotes = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const studentId = req.user._id;

    const votes = await Vote.getStudentVotes(studentId, eventId);

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
 * @desc    Get student's feedbacks for an event
 * @route   GET /api/student/feedbacks/:eventId
 * @access  Private (Student)
 */
exports.getMyFeedbacks = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const studentId = req.user._id;

    const feedbacks = await Feedback.find({ studentId, eventId })
      .populate('stallId', 'name department')
      .sort({ submittedAt: -1 });

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
 * @desc    Get student's attendance for an event
 * @route   GET /api/student/attendance/:eventId
 * @access  Private (Student)
 */
exports.getAttendance = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const studentId = req.user._id;

    const attendances = await Attendance.find({ studentId, eventId })
      .sort({ inTimestamp: -1 });

    const totalDuration = attendances
      .filter((a) => a.durationSeconds)
      .reduce((sum, a) => sum + a.durationSeconds, 0);

    res.status(200).json({
      success: true,
      count: attendances.length,
      totalDurationSeconds: totalDuration,
      data: attendances,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get student's current status for an event
 * @route   GET /api/student/status/:eventId
 * @access  Private (Student)
 */
exports.getStatus = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const studentId = req.user._id;

    const isCheckedIn = await Attendance.isCheckedIn(studentId, eventId);
    const votes = await Vote.getStudentVotes(studentId, eventId);
    const feedbackCount = await Feedback.countDocuments({ studentId, eventId });

    res.status(200).json({
      success: true,
      data: {
        isCheckedIn,
        votesCount: votes.length,
        votes: votes.map((v) => ({ rank: v.rank, stall: v.stallId })),
        feedbacksGiven: feedbackCount,
      },
    });
  } catch (error) {
    next(error);
  }
};
