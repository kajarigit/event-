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
 * @route   GET /api/admin/analytics/feedback-overview
 * @access  Private (Admin)
 */
const getFeedbackAnalyticsOverview = async (req, res, next) => {
  try {
    const { eventId, department } = req.query;
    
    let whereClause = {};
    let stallWhereClause = {};
    
    if (eventId) {
      whereClause.eventId = eventId;
      stallWhereClause.eventId = eventId;
    }
    
    if (department) {
      stallWhereClause.department = department;
    }

    // Overall statistics
    const overallStats = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT s.id) as "totalStalls",
        COUNT(DISTINCT f.id) as "totalFeedbacks",
        COUNT(DISTINCT f."studentId") as "uniqueStudents",
        ROUND(AVG(f."averageRating"), 2) as "overallAverageRating",
        
        -- Category-wise averages
        ROUND(AVG(f."qualityRating"), 2) as "avgQualityRating",
        ROUND(AVG(f."serviceRating"), 2) as "avgServiceRating",
        ROUND(AVG(f."innovationRating"), 2) as "avgInnovationRating",
        ROUND(AVG(f."presentationRating"), 2) as "avgPresentationRating",
        ROUND(AVG(f."valueRating"), 2) as "avgValueRating"
        
      FROM stalls s
      LEFT JOIN feedbacks f ON f."stallId" = s.id ${eventId ? 'AND f."eventId" = :eventId' : ''}
      WHERE s."isActive" = true 
        ${eventId ? 'AND s."eventId" = :eventId' : ''}
        ${department ? 'AND s.department = :department' : ''}
    `, {
      replacements: { eventId, department },
      type: sequelize.QueryTypes.SELECT
    });

    // Top performing stalls in each category
    const topPerformers = await sequelize.query(`
      SELECT 
        'quality' as category,
        s.name as "stallName",
        s.department,
        ROUND(AVG(f."qualityRating"), 2) as "avgRating",
        COUNT(f.id) as "feedbackCount"
      FROM stalls s
      INNER JOIN feedbacks f ON f."stallId" = s.id ${eventId ? 'AND f."eventId" = :eventId' : ''}
      WHERE s."isActive" = true 
        ${eventId ? 'AND s."eventId" = :eventId' : ''}
        ${department ? 'AND s.department = :department' : ''}
      GROUP BY s.id, s.name, s.department
      HAVING COUNT(f.id) >= 3
      ORDER BY "avgRating" DESC
      LIMIT 3
      
      UNION ALL
      
      SELECT 
        'service' as category,
        s.name as "stallName",
        s.department,
        ROUND(AVG(f."serviceRating"), 2) as "avgRating",
        COUNT(f.id) as "feedbackCount"
      FROM stalls s
      INNER JOIN feedbacks f ON f."stallId" = s.id ${eventId ? 'AND f."eventId" = :eventId' : ''}
      WHERE s."isActive" = true 
        ${eventId ? 'AND s."eventId" = :eventId' : ''}
        ${department ? 'AND s.department = :department' : ''}
      GROUP BY s.id, s.name, s.department
      HAVING COUNT(f.id) >= 3
      ORDER BY "avgRating" DESC
      LIMIT 3
      
      UNION ALL
      
      SELECT 
        'innovation' as category,
        s.name as "stallName",
        s.department,
        ROUND(AVG(f."innovationRating"), 2) as "avgRating",
        COUNT(f.id) as "feedbackCount"
      FROM stalls s
      INNER JOIN feedbacks f ON f."stallId" = s.id ${eventId ? 'AND f."eventId" = :eventId' : ''}
      WHERE s."isActive" = true 
        ${eventId ? 'AND s."eventId" = :eventId' : ''}
        ${department ? 'AND s.department = :department' : ''}
      GROUP BY s.id, s.name, s.department
      HAVING COUNT(f.id) >= 3
      ORDER BY "avgRating" DESC
      LIMIT 3
      
      UNION ALL
      
      SELECT 
        'presentation' as category,
        s.name as "stallName",
        s.department,
        ROUND(AVG(f."presentationRating"), 2) as "avgRating",
        COUNT(f.id) as "feedbackCount"
      FROM stalls s
      INNER JOIN feedbacks f ON f."stallId" = s.id ${eventId ? 'AND f."eventId" = :eventId' : ''}
      WHERE s."isActive" = true 
        ${eventId ? 'AND s."eventId" = :eventId' : ''}
        ${department ? 'AND s.department = :department' : ''}
      GROUP BY s.id, s.name, s.department
      HAVING COUNT(f.id) >= 3
      ORDER BY "avgRating" DESC
      LIMIT 3
      
      UNION ALL
      
      SELECT 
        'value' as category,
        s.name as "stallName", 
        s.department,
        ROUND(AVG(f."valueRating"), 2) as "avgRating",
        COUNT(f.id) as "feedbackCount"
      FROM stalls s
      INNER JOIN feedbacks f ON f."stallId" = s.id ${eventId ? 'AND f."eventId" = :eventId' : ''}
      WHERE s."isActive" = true 
        ${eventId ? 'AND s."eventId" = :eventId' : ''}
        ${department ? 'AND s.department = :department' : ''}
      GROUP BY s.id, s.name, s.department
      HAVING COUNT(f.id) >= 3
      ORDER BY "avgRating" DESC
      LIMIT 3
    `, {
      replacements: { eventId, department },
      type: sequelize.QueryTypes.SELECT
    });

    // Group top performers by category
    const topPerformersByCategory = {};
    topPerformers.forEach(performer => {
      if (!topPerformersByCategory[performer.category]) {
        topPerformersByCategory[performer.category] = [];
      }
      topPerformersByCategory[performer.category].push({
        stallName: performer.stallName,
        department: performer.department,
        avgRating: parseFloat(performer.avgRating),
        feedbackCount: parseInt(performer.feedbackCount)
      });
    });

    const summary = overallStats[0];
    
    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalStalls: parseInt(summary.totalStalls),
          totalFeedbacks: parseInt(summary.totalFeedbacks),
          uniqueStudents: parseInt(summary.uniqueStudents),
          overallAverageRating: parseFloat(summary.overallAverageRating || 0),
          categoryAverages: {
            quality: parseFloat(summary.avgQualityRating || 0),
            service: parseFloat(summary.avgServiceRating || 0),
            innovation: parseFloat(summary.avgInnovationRating || 0),
            presentation: parseFloat(summary.avgPresentationRating || 0),
            value: parseFloat(summary.avgValueRating || 0)
          }
        },
        topPerformers: topPerformersByCategory
      }
    });
  } catch (error) {
    console.error('Error getting feedback analytics overview:', error);
    next(error);
  }
};

module.exports = {
  getDetailedFeedbackRankings,
  getStallFeedbackDetails,
  getFeedbackAnalyticsOverview
};