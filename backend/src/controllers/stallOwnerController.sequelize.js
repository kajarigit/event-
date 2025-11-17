const { User, Stall, Vote, Feedback, Event, sequelize } = require('../models/index.sequelize');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const QRCode = require('qrcode');

/**
 * @desc    Stall owner login (using email/phone)
 * @route   POST /api/stall-owner/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password, eventId } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Find stall by owner email
    const stall = await Stall.findOne({
      where: { ownerEmail: email },
      include: [
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name', 'startDate', 'endDate', 'isActive']
        }
      ]
    });

    if (!stall) {
      return res.status(404).json({
        success: false,
        message: 'No stall found with this email',
      });
    }

    // For stall owners, we'll use a simple password check
    // In production, you'd want to hash these passwords
    // For now, using ownerContact as password (or implement proper password field)
    if (password !== stall.ownerContact) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(stall.id, 'stall_owner');
    const refreshToken = generateRefreshToken(stall.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        stall: {
          id: stall.id,
          name: stall.name,
          department: stall.department,
          ownerName: stall.ownerName,
          ownerEmail: stall.ownerEmail,
          event: stall.event
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get stall owner's stall details
 * @route   GET /api/stall-owner/my-stall
 * @access  Private (Stall Owner)
 */
exports.getMyStall = async (req, res, next) => {
  try {
    const stallId = req.user.id; // From auth middleware

    const stall = await Stall.findByPk(stallId, {
      include: [
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name', 'startDate', 'endDate', 'isActive', 'description']
        }
      ]
    });

    if (!stall) {
      return res.status(404).json({
        success: false,
        message: 'Stall not found',
      });
    }

    // Get stats
    const [voteCount, feedbackCount, avgRating] = await Promise.all([
      Vote.count({ where: { stallId: stall.id } }),
      Feedback.count({ where: { stallId: stall.id } }),
      Feedback.findOne({
        where: { stallId: stall.id },
        attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']]
      })
    ]);

    // Generate QR code data
    const qrData = JSON.stringify({
      type: 'stall',
      stallId: stall.id,
      eventId: stall.eventId,
      stallName: stall.name,
      timestamp: new Date().toISOString()
    });

    // Generate QR code image (base64)
    const qrCodeImage = await QRCode.toDataURL(qrData, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({
      success: true,
      data: {
        stall: {
          ...stall.toJSON(),
          stats: {
            totalVotes: voteCount,
            totalFeedbacks: feedbackCount,
            averageRating: parseFloat(avgRating?.dataValues?.avgRating || 0).toFixed(2)
          },
          qrCode: qrCodeImage,
          qrData
        }
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get live department leaderboard (stalls in same department)
 * @route   GET /api/stall-owner/department-leaderboard
 * @access  Private (Stall Owner)
 */
exports.getDepartmentLeaderboard = async (req, res, next) => {
  try {
    const stallId = req.user.id;

    // Get my stall to find department and event
    const myStall = await Stall.findByPk(stallId);
    if (!myStall) {
      return res.status(404).json({
        success: false,
        message: 'Stall not found',
      });
    }

    const { department, eventId } = myStall;

    // Get all stalls in same department with vote counts
    const leaderboard = await sequelize.query(`
      SELECT 
        s.id,
        s.name,
        s."ownerName",
        s.location,
        s.category,
        COUNT(DISTINCT v.id) as "voteCount",
        COUNT(DISTINCT f.id) as "feedbackCount",
        COALESCE(AVG(f.rating), 0) as "avgRating",
        ROUND(COALESCE(AVG(f.rating), 0), 1) as "roundedRating",
        CASE WHEN s.id = :stallId THEN true ELSE false END as "isMyStall"
      FROM stalls s
      LEFT JOIN votes v ON v."stallId" = s.id AND v."eventId" = :eventId
      LEFT JOIN feedbacks f ON f."stallId" = s.id AND f."eventId" = :eventId
      WHERE s."eventId" = :eventId
        AND s.department = :department
        AND s."isActive" = true
      GROUP BY s.id, s.name, s."ownerName", s.location, s.category
      ORDER BY "voteCount" DESC, "avgRating" DESC, s.name ASC
    `, {
      replacements: { eventId, department, stallId },
      type: sequelize.QueryTypes.SELECT
    });

    // Add rank and position change indicators
    const rankedLeaderboard = leaderboard.map((stall, index) => ({
      ...stall,
      rank: index + 1,
      voteCount: parseInt(stall.voteCount),
      feedbackCount: parseInt(stall.feedbackCount),
      avgRating: parseFloat(stall.avgRating),
      roundedRating: parseFloat(stall.roundedRating),
      isMyStall: stall.isMyStall
    }));

    // Find my position
    const myPosition = rankedLeaderboard.findIndex(s => s.isMyStall) + 1;
    const totalStalls = rankedLeaderboard.length;

    res.json({
      success: true,
      data: {
        leaderboard: rankedLeaderboard,
        myPosition,
        totalStalls,
        department
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get live votes for my stall
 * @route   GET /api/stall-owner/live-votes
 * @access  Private (Stall Owner)
 */
exports.getLiveVotes = async (req, res, next) => {
  try {
    const stallId = req.user.id;
    const { limit = 50 } = req.query;

    const votes = await Vote.findAll({
      where: { stallId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'rollNumber', 'department', 'year']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    const totalVotes = await Vote.count({ where: { stallId } });

    // Group votes by hour for trend analysis
    const votesByHour = await sequelize.query(`
      SELECT 
        DATE_TRUNC('hour', "createdAt") as hour,
        COUNT(*) as count
      FROM votes
      WHERE "stallId" = :stallId
      GROUP BY DATE_TRUNC('hour', "createdAt")
      ORDER BY hour DESC
      LIMIT 24
    `, {
      replacements: { stallId },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: {
        votes,
        totalVotes,
        recentVotes: votes.length,
        votesTrend: votesByHour
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get live feedbacks for my stall
 * @route   GET /api/stall-owner/live-feedbacks
 * @access  Private (Stall Owner)
 */
exports.getLiveFeedbacks = async (req, res, next) => {
  try {
    const stallId = req.user.id;
    const { limit = 50 } = req.query;

    const feedbacks = await Feedback.findAll({
      where: { stallId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'rollNumber', 'department', 'year']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    const stats = await Feedback.findOne({
      where: { stallId },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalFeedbacks'],
        [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
        [sequelize.fn('MIN', sequelize.col('rating')), 'minRating'],
        [sequelize.fn('MAX', sequelize.col('rating')), 'maxRating']
      ]
    });

    // Rating distribution
    const ratingDistribution = await sequelize.query(`
      SELECT 
        rating,
        COUNT(*) as count
      FROM feedbacks
      WHERE "stallId" = :stallId
      GROUP BY rating
      ORDER BY rating DESC
    `, {
      replacements: { stallId },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: {
        feedbacks,
        stats: {
          totalFeedbacks: parseInt(stats?.dataValues?.totalFeedbacks || 0),
          avgRating: parseFloat(stats?.dataValues?.avgRating || 0).toFixed(2),
          minRating: parseInt(stats?.dataValues?.minRating || 0),
          maxRating: parseInt(stats?.dataValues?.maxRating || 0)
        },
        ratingDistribution: ratingDistribution.map(r => ({
          rating: parseInt(r.rating),
          count: parseInt(r.count)
        }))
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get live competition stats (department-wise)
 * @route   GET /api/stall-owner/competition-stats
 * @access  Private (Stall Owner)
 */
exports.getCompetitionStats = async (req, res, next) => {
  try {
    const stallId = req.user.id;

    const myStall = await Stall.findByPk(stallId);
    if (!myStall) {
      return res.status(404).json({
        success: false,
        message: 'Stall not found',
      });
    }

    const { department, eventId } = myStall;

    // Get top 3 stalls in department
    const topStalls = await sequelize.query(`
      SELECT 
        s.id,
        s.name,
        COUNT(DISTINCT v.id) as "voteCount",
        COALESCE(AVG(f.rating), 0) as "avgRating"
      FROM stalls s
      LEFT JOIN votes v ON v."stallId" = s.id
      LEFT JOIN feedbacks f ON f."stallId" = s.id
      WHERE s."eventId" = :eventId
        AND s.department = :department
        AND s."isActive" = true
      GROUP BY s.id, s.name
      ORDER BY "voteCount" DESC
      LIMIT 3
    `, {
      replacements: { eventId, department },
      type: sequelize.QueryTypes.SELECT
    });

    // Get my rank and stats
    const allStalls = await sequelize.query(`
      SELECT 
        s.id,
        COUNT(DISTINCT v.id) as "voteCount"
      FROM stalls s
      LEFT JOIN votes v ON v."stallId" = s.id
      WHERE s."eventId" = :eventId
        AND s.department = :department
        AND s."isActive" = true
      GROUP BY s.id
      ORDER BY "voteCount" DESC
    `, {
      replacements: { eventId, department },
      type: sequelize.QueryTypes.SELECT
    });

    const myRank = allStalls.findIndex(s => s.id === stallId) + 1;
    const totalStalls = allStalls.length;
    const myVotes = parseInt(allStalls.find(s => s.id === stallId)?.voteCount || 0);
    const leadingVotes = parseInt(topStalls[0]?.voteCount || 0);
    const voteGap = leadingVotes - myVotes;

    res.json({
      success: true,
      data: {
        myRank,
        totalStalls,
        myVotes,
        leadingVotes,
        voteGap: voteGap > 0 ? voteGap : 0,
        isLeading: myRank === 1,
        topStalls: topStalls.map((s, idx) => ({
          ...s,
          rank: idx + 1,
          voteCount: parseInt(s.voteCount),
          avgRating: parseFloat(s.avgRating)
        })),
        department
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get recent activity (votes + feedbacks combined)
 * @route   GET /api/stall-owner/recent-activity
 * @access  Private (Stall Owner)
 */
exports.getRecentActivity = async (req, res, next) => {
  try {
    const stallId = req.user.id;
    const { limit = 20 } = req.query;

    // Get recent votes
    const votes = await Vote.findAll({
      where: { stallId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['name', 'rollNumber', 'department']
        }
      ],
      attributes: ['id', 'createdAt'],
      limit: parseInt(limit)
    });

    // Get recent feedbacks
    const feedbacks = await Feedback.findAll({
      where: { stallId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['name', 'rollNumber', 'department']
        }
      ],
      attributes: ['id', 'rating', 'comment', 'createdAt'],
      limit: parseInt(limit)
    });

    // Combine and sort by timestamp
    const activities = [
      ...votes.map(v => ({
        type: 'vote',
        id: v.id,
        student: v.student,
        timestamp: v.createdAt
      })),
      ...feedbacks.map(f => ({
        type: 'feedback',
        id: f.id,
        rating: f.rating,
        comment: f.comment,
        student: f.student,
        timestamp: f.createdAt
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        activities,
        totalActivities: activities.length
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
