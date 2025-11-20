const { Event, User, Feedback } = require('../models/index.sequelize');
const { Op } = require('sequelize');

/**
 * @desc    Get students ranked by feedback count for an event
 * @route   GET /api/admin/analytics/top-feedback-givers/:eventId
 * @access  Private (Admin)
 */
exports.getTopFeedbackGivers = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      includeZero = false // Option to include students with 0 feedback
    } = req.query;

    console.log('[Top Feedback Givers] Starting for eventId:', eventId, 'page:', page, 'limit:', limit);

    // Step 1: Get event info
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Step 2: Get feedback counts per student for this event
    const feedbackData = await Feedback.findAll({
      attributes: [
        'studentId',
        [require('sequelize').fn('COUNT', require('sequelize').col('Feedback.id')), 'feedbackCount']
      ],
      where: { eventId: eventId },
      group: ['studentId'],
      having: includeZero === 'true' ? {} : {
        [Op.and]: [
          require('sequelize').where(
            require('sequelize').fn('COUNT', require('sequelize').col('Feedback.id')),
            { [Op.gt]: 0 }
          )
        ]
      },
      order: [[require('sequelize').fn('COUNT', require('sequelize').col('Feedback.id')), 'DESC']],
      limit: 100, // Get top 100 feedback givers
      raw: true
    });

    console.log(`[Top Feedback Givers] Found ${feedbackData.length} students with feedback`);

    if (feedbackData.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          event: { id: event.id, name: event.name },
          students: [],
          pagination: {
            currentPage: parseInt(page),
            totalPages: 0,
            totalStudents: 0,
            studentsPerPage: parseInt(limit),
            hasNext: false,
            hasPrev: false
          },
          summary: {
            totalFeedbackGivers: 0,
            totalFeedbacks: 0,
            averageFeedbacksPerStudent: 0
          }
        }
      });
    }

    // Step 3: Get student details for the feedback givers
    const studentIds = feedbackData.map(item => item.studentId);
    const students = await User.findAll({
      where: { id: studentIds },
      attributes: ['id', 'name', 'regNo', 'department', 'faculty', 'programme', 'year', 'phone']
    });

    console.log(`[Top Feedback Givers] Found ${students.length} student details`);

    // Step 4: Create student lookup and merge with feedback counts
    const studentLookup = {};
    students.forEach(student => {
      studentLookup[student.id] = {
        id: student.id,
        name: student.name,
        regNo: student.regNo,
        department: student.department,
        faculty: student.faculty,
        programme: student.programme,
        year: student.year,
        phone: student.phone
      };
    });

    // Step 5: Merge feedback counts with student data
    const enrichedStudents = feedbackData
      .map(item => {
        const student = studentLookup[item.studentId];
        if (!student) {
          console.log('[Top Feedback Givers] Student not found for ID:', item.studentId);
          return null;
        }
        
        return {
          ...student,
          feedbackCount: parseInt(item.feedbackCount),
          rank: 0 // Will be set after sorting
        };
      })
      .filter(item => item !== null);

    // Step 6: Sort by feedback count and assign ranks
    enrichedStudents.sort((a, b) => b.feedbackCount - a.feedbackCount);
    enrichedStudents.forEach((student, index) => {
      student.rank = index + 1;
    });

    // Step 7: Apply pagination
    const totalStudents = enrichedStudents.length;
    const totalPages = Math.ceil(totalStudents / parseInt(limit));
    const currentPage = parseInt(page);
    const startIndex = (currentPage - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedStudents = enrichedStudents.slice(startIndex, endIndex);

    // Step 8: Calculate summary statistics
    const totalFeedbacks = enrichedStudents.reduce((sum, student) => sum + student.feedbackCount, 0);
    const averageFeedbacks = totalStudents > 0 ? (totalFeedbacks / totalStudents).toFixed(2) : 0;

    console.log('[Top Feedback Givers] Successfully processed and paginated results');

    res.status(200).json({
      success: true,
      data: {
        event: {
          id: event.id,
          name: event.name,
          description: event.description
        },
        students: paginatedStudents,
        pagination: {
          currentPage: currentPage,
          totalPages: totalPages,
          totalStudents: totalStudents,
          studentsPerPage: parseInt(limit),
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
          startIndex: startIndex + 1,
          endIndex: Math.min(endIndex, totalStudents)
        },
        summary: {
          totalFeedbackGivers: totalStudents,
          totalFeedbacks: totalFeedbacks,
          averageFeedbacksPerStudent: parseFloat(averageFeedbacks),
          topFeedbackCount: enrichedStudents[0]?.feedbackCount || 0,
          showing: `${startIndex + 1}-${Math.min(endIndex, totalStudents)} of ${totalStudents}`
        },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[Top Feedback Givers] Error:', error.message);
    console.error('[Top Feedback Givers] Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to get top feedback givers',
      error: error.message
    });
  }
};

/**
 * @desc    Get detailed feedback analytics for all events
 * @route   GET /api/admin/analytics/feedback-overview
 * @access  Private (Admin)
 */
exports.getFeedbackOverview = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    console.log('[Feedback Overview] Starting analytics');

    // Get feedback counts by event
    const eventFeedbackCounts = await Feedback.findAll({
      attributes: [
        'eventId',
        [require('sequelize').fn('COUNT', require('sequelize').col('Feedback.id')), 'feedbackCount'],
        [require('sequelize').fn('COUNT', require('sequelize').fn('DISTINCT', require('sequelize').col('studentId'))), 'uniqueUsers']
      ],
      group: ['eventId'],
      order: [[require('sequelize').fn('COUNT', require('sequelize').col('Feedback.id')), 'DESC']],
      limit: parseInt(limit),
      raw: true
    });

    // Get event details
    const eventIds = eventFeedbackCounts.map(item => item.eventId);
    const events = await Event.findAll({
      where: { id: eventIds },
      attributes: ['id', 'name', 'description', 'startDate', 'endDate']
    });

    const eventLookup = {};
    events.forEach(event => {
      eventLookup[event.id] = event;
    });

    // Merge data
    const enrichedEvents = eventFeedbackCounts.map(item => ({
      event: eventLookup[item.eventId],
      feedbackCount: parseInt(item.feedbackCount),
      uniqueFeedbackGivers: parseInt(item.uniqueUsers),
      averageFeedbacksPerUser: (parseInt(item.feedbackCount) / parseInt(item.uniqueUsers)).toFixed(2)
    }));

    res.status(200).json({
      success: true,
      data: {
        events: enrichedEvents,
        totalEvents: enrichedEvents.length
      }
    });

  } catch (error) {
    console.error('[Feedback Overview] Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get feedback overview',
      error: error.message
    });
  }
};