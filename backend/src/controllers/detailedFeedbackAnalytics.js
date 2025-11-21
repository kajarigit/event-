const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const Feedback = require('../models/Feedback.sequelize');
const Stall = require('../models/Stall.sequelize');
const User = require('../models/User.sequelize');

/**
 * @desc    Get detailed feedback rankings with 5-category breakdown
 * @route   GET /api/admin/analytics/detailed-feedback-rankings
 * @access  Private (Admin)
 */
const getDetailedFeedbackRankings = async (req, res, next) => {
  try {
    const { 
      eventId, 
      department, 
      limit = 50, 
      sortBy = 'averageRating', 
      order = 'DESC',
      page = 1 
    } = req.query;
    
    const pageLimit = parseInt(limit);
    const offset = (parseInt(page) - 1) * pageLimit;
    
    // Build where clause
    let whereClause = {};
    let stallWhereClause = {};
    
    if (eventId) {
      whereClause.eventId = eventId;
      stallWhereClause.eventId = eventId;
    }
    
    if (department) {
      stallWhereClause.department = department;
    }

    // Get stalls with comprehensive feedback analytics
    const stallsWithFeedbacks = await sequelize.query(`
      SELECT 
        s.id,
        s.name,
        s.department,
        s.category,
        s."ownerName",
        s."ownerContact",
        s."eventId",
        
        -- Overall metrics
        COUNT(DISTINCT f.id) as "totalFeedbacks",
        
        -- Average ratings for each category
        COALESCE(ROUND(AVG(f."averageRating"), 2), 0) as "overallAverageRating",
        COALESCE(ROUND(AVG(f."qualityRating"), 2), 0) as "avgQualityRating",
        COALESCE(ROUND(AVG(f."serviceRating"), 2), 0) as "avgServiceRating", 
        COALESCE(ROUND(AVG(f."innovationRating"), 2), 0) as "avgInnovationRating",
        COALESCE(ROUND(AVG(f."presentationRating"), 2), 0) as "avgPresentationRating",
        COALESCE(ROUND(AVG(f."valueRating"), 2), 0) as "avgValueRating",
        
        -- Rating distribution
        COUNT(CASE WHEN f."averageRating" >= 4.5 THEN 1 END) as "excellentRatings",
        COUNT(CASE WHEN f."averageRating" >= 3.5 AND f."averageRating" < 4.5 THEN 1 END) as "goodRatings",
        COUNT(CASE WHEN f."averageRating" >= 2.5 AND f."averageRating" < 3.5 THEN 1 END) as "averageRatings",
        COUNT(CASE WHEN f."averageRating" < 2.5 THEN 1 END) as "poorRatings",
        
        -- Category-wise excellence counts (ratings 5/5)
        COUNT(CASE WHEN f."qualityRating" = 5 THEN 1 END) as "qualityExcellence",
        COUNT(CASE WHEN f."serviceRating" = 5 THEN 1 END) as "serviceExcellence",
        COUNT(CASE WHEN f."innovationRating" = 5 THEN 1 END) as "innovationExcellence",
        COUNT(CASE WHEN f."presentationRating" = 5 THEN 1 END) as "presentationExcellence",
        COUNT(CASE WHEN f."valueRating" = 5 THEN 1 END) as "valueExcellence",
        
        -- Rating ranges
        MIN(f."averageRating") as "minRating",
        MAX(f."averageRating") as "maxRating"
        
      FROM stalls s
      LEFT JOIN feedbacks f ON f."stallId" = s.id ${eventId ? 'AND f."eventId" = :eventId' : ''}
      WHERE s."isActive" = true 
        ${eventId ? 'AND s."eventId" = :eventId' : ''}
        ${department ? 'AND s.department = :department' : ''}
      GROUP BY s.id, s.name, s.department, s.category, s."ownerName", s."ownerContact", s."eventId"
      ORDER BY ${sortBy === 'totalFeedbacks' ? '"totalFeedbacks"' : '"overallAverageRating"'} ${order}, "totalFeedbacks" DESC
      LIMIT :limit OFFSET :offset
    `, {
      replacements: { 
        eventId, 
        department, 
        limit: pageLimit, 
        offset 
      },
      type: sequelize.QueryTypes.SELECT
    });

    // Get total count for pagination
    const totalCountResult = await sequelize.query(`
      SELECT COUNT(DISTINCT s.id) as total
      FROM stalls s
      LEFT JOIN feedbacks f ON f."stallId" = s.id ${eventId ? 'AND f."eventId" = :eventId' : ''}
      WHERE s."isActive" = true 
        ${eventId ? 'AND s."eventId" = :eventId' : ''}
        ${department ? 'AND s.department = :department' : ''}
    `, {
      replacements: { eventId, department },
      type: sequelize.QueryTypes.SELECT
    });
    
    const totalStalls = parseInt(totalCountResult[0].total);

    // Format the results and add rankings
    const rankings = stallsWithFeedbacks.map((stall, index) => ({
      ...stall,
      rank: offset + index + 1,
      totalFeedbacks: parseInt(stall.totalFeedbacks),
      overallAverageRating: parseFloat(stall.overallAverageRating),
      avgQualityRating: parseFloat(stall.avgQualityRating),
      avgServiceRating: parseFloat(stall.avgServiceRating),
      avgInnovationRating: parseFloat(stall.avgInnovationRating),
      avgPresentationRating: parseFloat(stall.avgPresentationRating),
      avgValueRating: parseFloat(stall.avgValueRating),
      excellentRatings: parseInt(stall.excellentRatings),
      goodRatings: parseInt(stall.goodRatings),
      averageRatings: parseInt(stall.averageRatings),
      poorRatings: parseInt(stall.poorRatings),
      qualityExcellence: parseInt(stall.qualityExcellence),
      serviceExcellence: parseInt(stall.serviceExcellence),
      innovationExcellence: parseInt(stall.innovationExcellence),
      presentationExcellence: parseInt(stall.presentationExcellence),
      valueExcellence: parseInt(stall.valueExcellence),
      minRating: parseFloat(stall.minRating || 0),
      maxRating: parseFloat(stall.maxRating || 0),
    }));

    res.status(200).json({
      success: true,
      data: {
        rankings,
        pagination: {
          page: parseInt(page),
          limit: pageLimit,
          total: totalStalls,
          totalPages: Math.ceil(totalStalls / pageLimit),
          hasNext: offset + pageLimit < totalStalls,
          hasPrev: parseInt(page) > 1
        },
        summary: {
          totalStalls,
          totalWithFeedbacks: rankings.filter(r => r.totalFeedbacks > 0).length,
          averageOverallRating: rankings.length > 0 
            ? (rankings.reduce((sum, r) => sum + r.overallAverageRating, 0) / rankings.length).toFixed(2)
            : 0
        }
      }
    });
  } catch (error) {
    console.error('Error getting detailed feedback rankings:', error);
    next(error);
  }
};

/**
 * @desc    Get individual stall feedback details with student information
 * @route   GET /api/admin/analytics/stall-feedback-details/:stallId
 * @access  Private (Admin)
 */
const getStallFeedbackDetails = async (req, res, next) => {
  try {
    const { stallId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const pageLimit = parseInt(limit);
    const offset = (parseInt(page) - 1) * pageLimit;

    // Get stall information
    const stall = await Stall.findByPk(stallId, {
      attributes: ['id', 'name', 'department', 'category', 'ownerName']
    });

    if (!stall) {
      return res.status(404).json({
        success: false,
        message: 'Stall not found'
      });
    }

    // Get detailed feedbacks with student information
    const feedbacks = await Feedback.findAndCountAll({
      where: { stallId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'rollNumber', 'department', 'year']
        }
      ],
      attributes: [
        'id',
        'qualityRating',
        'serviceRating', 
        'innovationRating',
        'presentationRating',
        'valueRating',
        'averageRating',
        'rating', // Keep for backward compatibility
        'comments',
        'createdAt'
      ],
      order: [['createdAt', 'DESC']],
      limit: pageLimit,
      offset
    });

    // Calculate comprehensive statistics
    const stats = await sequelize.query(`
      SELECT 
        COUNT(*) as "totalFeedbacks",
        ROUND(AVG("averageRating"), 2) as "overallAverage",
        ROUND(AVG("qualityRating"), 2) as "avgQuality",
        ROUND(AVG("serviceRating"), 2) as "avgService",
        ROUND(AVG("innovationRating"), 2) as "avgInnovation",
        ROUND(AVG("presentationRating"), 2) as "avgPresentation",
        ROUND(AVG("valueRating"), 2) as "avgValue",
        
        -- Rating distributions
        COUNT(CASE WHEN "averageRating" >= 4.5 THEN 1 END) as "excellent",
        COUNT(CASE WHEN "averageRating" >= 3.5 AND "averageRating" < 4.5 THEN 1 END) as "good",
        COUNT(CASE WHEN "averageRating" >= 2.5 AND "averageRating" < 3.5 THEN 1 END) as "average",
        COUNT(CASE WHEN "averageRating" < 2.5 THEN 1 END) as "poor",
        
        MIN("averageRating") as "minRating",
        MAX("averageRating") as "maxRating"
        
      FROM feedbacks 
      WHERE "stallId" = :stallId
    `, {
      replacements: { stallId },
      type: sequelize.QueryTypes.SELECT
    });

    const statisticsData = stats[0];

    res.status(200).json({
      success: true,
      data: {
        stall,
        feedbacks: feedbacks.rows,
        pagination: {
          page: parseInt(page),
          limit: pageLimit,
          total: feedbacks.count,
          totalPages: Math.ceil(feedbacks.count / pageLimit),
          hasNext: offset + pageLimit < feedbacks.count,
          hasPrev: parseInt(page) > 1
        },
        statistics: {
          totalFeedbacks: parseInt(statisticsData.totalFeedbacks),
          overallAverage: parseFloat(statisticsData.overallAverage || 0),
          categoryAverages: {
            quality: parseFloat(statisticsData.avgQuality || 0),
            service: parseFloat(statisticsData.avgService || 0),
            innovation: parseFloat(statisticsData.avgInnovation || 0),
            presentation: parseFloat(statisticsData.avgPresentation || 0),
            value: parseFloat(statisticsData.avgValue || 0)
          },
          ratingDistribution: {
            excellent: parseInt(statisticsData.excellent),
            good: parseInt(statisticsData.good),
            average: parseInt(statisticsData.average),
            poor: parseInt(statisticsData.poor)
          },
          ratingRange: {
            min: parseFloat(statisticsData.minRating || 0),
            max: parseFloat(statisticsData.maxRating || 0)
          }
        }
      }
    });
  } catch (error) {
    console.error('Error getting stall feedback details:', error);
    next(error);
  }
};

/**
 * @desc    Get feedback analytics overview
 * @route   GET /api/admin/analytics/feedback-analytics-overview
 * @access  Private (Admin)
 */
const getFeedbackAnalyticsOverview = async (req, res, next) => {
  try {
    const { eventId, department } = req.query;
    
    // Build where clauses
    let whereClause = {};
    let stallWhereClause = {};
    
    if (eventId) {
      whereClause.eventId = eventId;
      stallWhereClause.eventId = eventId;
    }
    
    if (department) {
      stallWhereClause.department = department;
    }

    // Get basic statistics using Sequelize models
    const stallsCount = await Stall.count({
      where: { ...stallWhereClause, isActive: true }
    });

    const feedbacksCount = await Feedback.count({
      where: whereClause,
      include: [{
        model: Stall,
        as: 'stall',
        where: stallWhereClause,
        required: true
      }]
    });

    const uniqueStudentsCount = await Feedback.count({
      where: whereClause,
      include: [{
        model: Stall,
        as: 'stall',
        where: stallWhereClause,
        required: true
      }],
      distinct: true,
      col: 'studentId'
    });

    // Get average ratings using raw query to avoid GROUP BY issues
    const avgRatingsResult = await sequelize.query(`
      SELECT 
        ROUND(AVG(f."averageRating"), 2) as "overallAverageRating",
        ROUND(AVG(f."qualityRating"), 2) as "avgQualityRating",
        ROUND(AVG(f."serviceRating"), 2) as "avgServiceRating", 
        ROUND(AVG(f."innovationRating"), 2) as "avgInnovationRating",
        ROUND(AVG(f."presentationRating"), 2) as "avgPresentationRating",
        ROUND(AVG(f."valueRating"), 2) as "avgValueRating"
      FROM feedbacks f
      INNER JOIN stalls s ON f."stallId" = s.id
      WHERE s."isActive" = true
        ${eventId ? 'AND f."eventId" = :eventId AND s."eventId" = :eventId' : ''}
        ${department ? 'AND s.department = :department' : ''}
    `, {
      replacements: { eventId, department },
      type: sequelize.QueryTypes.SELECT
    });

    const ratings = avgRatingsResult[0] || {};

    // Get top performing stalls for each category using raw SQL
    const getTopStalls = async (ratingField) => {
      const results = await sequelize.query(`
        SELECT 
          s.name as "stallName",
          s.department,
          ROUND(AVG(f."${ratingField}"), 2) as "avgRating",
          COUNT(f.id) as "feedbackCount"
        FROM stalls s
        INNER JOIN feedbacks f ON f."stallId" = s.id
        WHERE s."isActive" = true
          ${eventId ? 'AND f."eventId" = :eventId AND s."eventId" = :eventId' : ''}
          ${department ? 'AND s.department = :department' : ''}
        GROUP BY s.id, s.name, s.department
        HAVING COUNT(f.id) >= 3
        ORDER BY AVG(f."${ratingField}") DESC
        LIMIT 3
      `, {
        replacements: { eventId, department },
        type: sequelize.QueryTypes.SELECT
      });
      
      return results;
    };

    const topQuality = await getTopStalls('qualityRating');
    const topService = await getTopStalls('serviceRating');
    const topInnovation = await getTopStalls('innovationRating');
    const topPresentation = await getTopStalls('presentationRating');
    const topValue = await getTopStalls('valueRating');

    // Get rating distribution using raw SQL
    const ratingDistribution = await sequelize.query(`
      SELECT 
        FLOOR(f."averageRating") as "ratingRange",
        COUNT(f.id) as "count"
      FROM feedbacks f
      INNER JOIN stalls s ON f."stallId" = s.id
      WHERE s."isActive" = true
        ${eventId ? 'AND f."eventId" = :eventId AND s."eventId" = :eventId' : ''}
        ${department ? 'AND s.department = :department' : ''}
      GROUP BY FLOOR(f."averageRating")
      ORDER BY FLOOR(f."averageRating") ASC
    `, {
      replacements: { eventId, department },
      type: sequelize.QueryTypes.SELECT
    });

    // Format response
    const overallStats = {
      totalStalls: stallsCount,
      totalFeedbacks: feedbacksCount,
      uniqueStudents: uniqueStudentsCount,
      overallAverageRating: parseFloat(ratings.overallAverageRating || 0).toFixed(2),
      avgQualityRating: parseFloat(ratings.avgQualityRating || 0).toFixed(2),
      avgServiceRating: parseFloat(ratings.avgServiceRating || 0).toFixed(2),
      avgInnovationRating: parseFloat(ratings.avgInnovationRating || 0).toFixed(2),
      avgPresentationRating: parseFloat(ratings.avgPresentationRating || 0).toFixed(2),
      avgValueRating: parseFloat(ratings.avgValueRating || 0).toFixed(2)
    };

    const topPerformers = [
      ...topQuality.map(item => ({ ...item, category: 'quality' })),
      ...topService.map(item => ({ ...item, category: 'service' })),
      ...topInnovation.map(item => ({ ...item, category: 'innovation' })),
      ...topPresentation.map(item => ({ ...item, category: 'presentation' })),
      ...topValue.map(item => ({ ...item, category: 'value' }))
    ];

    res.status(200).json({
      success: true,
      data: {
        overallStats: overallStats,
        topPerformers: topPerformers,
        ratingDistribution: ratingDistribution
      }
    });
  } catch (error) {
    console.error('Error in getFeedbackAnalyticsOverview:', error);
    next(error);
  }
};

module.exports = {
  getDetailedFeedbackRankings,
  getStallFeedbackDetails,
  getFeedbackAnalyticsOverview
};