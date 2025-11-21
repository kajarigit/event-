const { Feedback, Vote, Attendance, StudentEventAttendanceSummary, Stall, Event, User, sequelize } = require('../models/index.sequelize');
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
    const { eventId, isActive, forFeedback } = req.query;
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

    // DEPARTMENT FILTER: Only apply for voting, NOT for feedback
    // For feedback, students can rate ANY stall they visit
    // For voting, students can only vote for stalls in their own department
    if (forFeedback !== 'true') {
      where.department = student.department;
      console.log(`[Student Stalls] Filtering by department: ${student.department} (for voting)`);
    } else {
      console.log(`[Student Stalls] No department filter (for feedback)`);
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

    console.log(`[Student Stalls] Showing ${stalls.length} stalls for student ${student.name}`);

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
    const { 
      stallId, 
      eventId, 
      rating, // Keep for backward compatibility
      comments,
      // New 5-category ratings
      qualityRating,
      serviceRating,
      innovationRating,
      presentationRating,
      valueRating
    } = req.body;
    const studentId = req.user.id;

    // DEBUG LOGGING
    console.log('\n[FEEDBACK DEBUG] =================================');
    console.log('[FEEDBACK DEBUG] Request body:', JSON.stringify(req.body, null, 2));
    console.log('[FEEDBACK DEBUG] Student ID:', studentId);
    console.log('[FEEDBACK DEBUG] Stall ID:', stallId);
    console.log('[FEEDBACK DEBUG] Event ID:', eventId);
    console.log('[FEEDBACK DEBUG] 5-Category Ratings:', {
      quality: qualityRating,
      service: serviceRating,
      innovation: innovationRating,
      presentation: presentationRating,
      value: valueRating
    });
    console.log('[FEEDBACK DEBUG] =================================\n');

    // Validate that all 5 ratings are provided
    if (!qualityRating || !serviceRating || !innovationRating || !presentationRating || !valueRating) {
      return res.status(400).json({
        success: false,
        message: 'All 5 rating categories (Quality, Service, Innovation, Presentation, Value) are required'
      });
    }

    // Calculate average rating
    const averageRating = (qualityRating + serviceRating + innovationRating + presentationRating + valueRating) / 5;
    
    console.log('[FEEDBACK DEBUG] Calculated average rating:', averageRating);

    // Check if stall exists
    const stall = await Stall.findByPk(stallId);
    console.log('[FEEDBACK DEBUG] Stall found:', stall ? `${stall.name} (${stall.id})` : 'NULL');
    console.log('[FEEDBACK DEBUG] Stall isActive:', stall?.isActive);
    
    if (!stall || !stall.isActive) {
      console.log('[FEEDBACK DEBUG] ❌ Returning 404 - Stall not found or inactive');
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
      rating: Math.round(averageRating), // Keep old rating for compatibility
      comments,
      qualityRating,
      serviceRating,
      innovationRating,
      presentationRating,
      valueRating,
      averageRating: parseFloat(averageRating.toFixed(2))
    });

    // Update stall statistics after feedback submission
    try {
      const feedbackStats = await Feedback.findAll({
        where: { stallId: stall.id },
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalFeedbacks'],
          [sequelize.fn('AVG', sequelize.col('averageRating')), 'overallAverageRating'], // Use new averageRating field
          [sequelize.fn('AVG', sequelize.col('qualityRating')), 'avgQualityRating'],
          [sequelize.fn('AVG', sequelize.col('serviceRating')), 'avgServiceRating'],
          [sequelize.fn('AVG', sequelize.col('innovationRating')), 'avgInnovationRating'],
          [sequelize.fn('AVG', sequelize.col('presentationRating')), 'avgPresentationRating'],
          [sequelize.fn('AVG', sequelize.col('valueRating')), 'avgValueRating'],
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

    // NEW REQUIREMENT 1: Check if student has given feedback to this stall
    const existingFeedback = await Feedback.findOne({
      where: { studentId, stallId, eventId },
    });

    if (!existingFeedback) {
      return res.status(403).json({
        success: false,
        message: 'You must give feedback to a stall before you can vote for it. Please visit the stall and submit your feedback first.',
      });
    }

    // NEW REQUIREMENT 2: Check minimum feedback requirement (3 feedbacks in own department)
    const feedbacksInOwnDept = await Feedback.count({
      where: { 
        studentId, 
        eventId 
      },
      include: [{
        model: Stall,
        as: 'stall',
        where: { 
          department: student.department,
          eventId: eventId 
        },
        required: true
      }]
    });

    if (feedbacksInOwnDept < 3) {
      return res.status(403).json({
        success: false,
        message: `You must give feedback to at least 3 stalls in your department (${student.department}) before you can vote. Current: ${feedbacksInOwnDept}/3 feedbacks completed.`,
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
    const formattedAttendances = attendances.map(att => {
      const totalDuration = att.checkOutTime 
        ? Math.floor((new Date(att.checkOutTime) - new Date(att.checkInTime)) / 1000)
        : null;
      
      const nullifiedDuration = att.nullifiedDuration || 0;
      const countableDuration = totalDuration ? Math.max(0, totalDuration - nullifiedDuration) : null;
      
      return {
        id: att.id,
        eventId: att.eventId,
        event: att.event,
        status: att.status || (att.checkOutTime ? 'checked-out' : 'checked-in'), // Use actual status from DB
        checkInTime: att.checkInTime,
        checkOutTime: att.checkOutTime,
        inTimestamp: att.checkInTime,  // For frontend compatibility
        outTimestamp: att.checkOutTime, // For frontend compatibility
        isNullified: att.isNullified,
        nullifiedReason: att.nullifiedReason,
        eventStopTime: att.eventStopTime,
        durationSeconds: totalDuration, // Original total duration
        nullifiedDurationSeconds: nullifiedDuration, // Time that was nullified
        countableDurationSeconds: countableDuration, // Actual countable time
      };
    });

    // Calculate total durations
    const totalDurationSeconds = formattedAttendances
      .filter(att => att.durationSeconds)
      .reduce((sum, att) => sum + att.durationSeconds, 0);
      
    const totalCountableDurationSeconds = formattedAttendances
      .filter(att => att.countableDurationSeconds)
      .reduce((sum, att) => sum + att.countableDurationSeconds, 0);
      
    const totalNullifiedDurationSeconds = formattedAttendances
      .filter(att => att.nullifiedDurationSeconds)
      .reduce((sum, att) => sum + att.nullifiedDurationSeconds, 0);

    res.status(200).json({
      success: true,
      count: formattedAttendances.length,
      data: {
        attendances: formattedAttendances,
        totalDurationSeconds,
        totalCountableDurationSeconds,
        totalNullifiedDurationSeconds,
        hasNullifiedTime: totalNullifiedDurationSeconds > 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get student's attendance summary with nullification warnings
 * @route   GET /api/student/attendance-summary/:eventId
 * @access  Private (Student)
 */
exports.getAttendanceSummary = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const studentId = req.user.id;

    // Get attendance summary
    const summary = await StudentEventAttendanceSummary.findOne({
      where: {
        eventId,
        studentId
      },
      include: [
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name', 'startDate', 'endDate', 'isActive', 'manuallyStarted', 'manuallyEnded']
        }
      ]
    });

    if (!summary) {
      return res.status(200).json({
        success: true,
        data: {
          hasAttendanceRecord: false,
          totalValidHours: 0,
          totalNullifiedHours: 0,
          hasImproperCheckouts: false,
          currentStatus: 'checked-out',
          warnings: [],
          event: null
        }
      });
    }

    // Get detailed nullified sessions if any
    let nullifiedSessions = [];
    if (summary.hasImproperCheckouts) {
      nullifiedSessions = await Attendance.findAll({
        where: {
          eventId,
          studentId,
          isNullified: true
        },
        attributes: ['checkInTime', 'eventStopTime', 'nullifiedDuration', 'nullifiedReason'],
        order: [['checkInTime', 'DESC']]
      });
    }

    // Get current attendance status
    const currentAttendance = await Attendance.findOne({
      where: {
        eventId,
        studentId,
        status: 'checked-in'
      },
      order: [['checkInTime', 'DESC']]
    });

    // Format duration helpers
    const formatDuration = (seconds) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    };

    // Generate warnings
    const warnings = [];
    if (summary.hasImproperCheckouts) {
      warnings.push({
        type: 'improper_checkout',
        message: `You have ${summary.nullifiedSessions} session(s) where you didn't check out properly. ${formatDuration(summary.totalNullifiedDuration)} of your time was nullified.`,
        severity: 'warning'
      });
    }

    if (currentAttendance && summary.event && !summary.event.isActive) {
      warnings.push({
        type: 'event_stopped',
        message: 'The event has been stopped but you are still checked in. Your time may be nullified if you don\'t check out properly.',
        severity: 'error'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        hasAttendanceRecord: true,
        totalValidHours: Math.floor(summary.totalValidDuration / 3600),
        totalValidMinutes: Math.floor((summary.totalValidDuration % 3600) / 60),
        totalValidFormatted: formatDuration(summary.totalValidDuration),
        totalNullifiedHours: Math.floor(summary.totalNullifiedDuration / 3600),
        totalNullifiedMinutes: Math.floor((summary.totalNullifiedDuration % 3600) / 60),
        totalNullifiedFormatted: formatDuration(summary.totalNullifiedDuration),
        totalSessions: summary.totalSessions,
        nullifiedSessions: summary.nullifiedSessions,
        hasImproperCheckouts: summary.hasImproperCheckouts,
        currentStatus: summary.currentStatus,
        lastCheckInTime: summary.lastCheckInTime,
        warnings,
        nullifiedSessionDetails: nullifiedSessions.map(session => ({
          checkInTime: session.checkInTime,
          eventStopTime: session.eventStopTime,
          nullifiedDurationFormatted: formatDuration(session.nullifiedDuration),
          reason: session.nullifiedReason
        })),
        event: summary.event
      }
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

/**
 * @desc    Get student's voting eligibility status
 * @route   GET /api/student/voting-eligibility/:eventId
 * @access  Private (Student)
 */
exports.getVotingEligibility = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const studentId = req.user.id;

    // Get student details with department
    const student = await User.findByPk(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Count feedbacks in own department
    const feedbacksInOwnDept = await Feedback.count({
      where: { 
        studentId, 
        eventId 
      },
      include: [{
        model: Stall,
        as: 'stall',
        where: { 
          department: student.department,
          eventId: eventId 
        },
        required: true
      }]
    });

    // Count total votes cast
    const voteCount = await Vote.count({
      where: { studentId, eventId },
    });

    // Get event details for max votes
    const event = await Event.findByPk(eventId);
    const maxVotes = event?.maxVotesPerStudent || 3;

    // Check if voting is unlocked
    const votingUnlocked = feedbacksInOwnDept >= 3;
    const votesRemaining = votingUnlocked ? Math.max(0, maxVotes - voteCount) : 0;

    // Get list of stalls student has given feedback to (for voting eligibility)
    const stallsWithFeedback = await Feedback.findAll({
      where: { studentId, eventId },
      include: [{
        model: Stall,
        as: 'stall',
        where: { 
          department: student.department,
          eventId: eventId 
        },
        attributes: ['id', 'name', 'department'],
        required: true
      }],
      attributes: ['stallId']
    });

    const eligibleStallIds = stallsWithFeedback.map(f => f.stallId);

    res.status(200).json({
      success: true,
      data: {
        studentDepartment: student.department,
        feedbacksInOwnDept,
        minimumRequired: 3,
        votingUnlocked,
        voteCount,
        maxVotes,
        votesRemaining,
        eligibleStallIds,
        requirements: {
          departmentMatch: true,
          minimumFeedbacks: feedbacksInOwnDept >= 3,
          feedbackBeforeVote: true
        },
        message: votingUnlocked 
          ? `Voting unlocked! You have ${votesRemaining} votes remaining.`
          : `Complete ${3 - feedbacksInOwnDept} more feedbacks in ${student.department} department to unlock voting.`
      },
    });
  } catch (error) {
    next(error);
  }
};
