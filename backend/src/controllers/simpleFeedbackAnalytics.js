const { Event, User, Feedback } = require('../models/index.sequelize');

/**
 * @desc    Get students ranked by feedback count for an event (Simple version)
 * @route   GET /api/admin/analytics/feedback-simple/:eventId
 * @access  Private (Admin)
 */
exports.getSimpleFeedbackGivers = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    console.log('[Simple Feedback Givers] Starting for eventId:', eventId);

    // Step 1: Get event info
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Step 2: Get all feedbacks for this event
    const feedbacks = await Feedback.findAll({
      where: { eventId: eventId },
      attributes: ['studentId', 'id'],
      raw: true
    });

    console.log(`[Simple Feedback Givers] Found ${feedbacks.length} feedbacks`);

    if (feedbacks.length === 0) {
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
            totalFeedbacks: 0
          }
        }
      });
    }

    // Step 3: Count feedbacks per student manually
    const feedbackCounts = {};
    feedbacks.forEach(feedback => {
      if (feedbackCounts[feedback.studentId]) {
        feedbackCounts[feedback.studentId]++;
      } else {
        feedbackCounts[feedback.studentId] = 1;
      }
    });

    // Step 4: Convert to array and sort
    const sortedStudents = Object.entries(feedbackCounts)
      .map(([studentId, count]) => ({ studentId, feedbackCount: count }))
      .sort((a, b) => b.feedbackCount - a.feedbackCount)
      .slice(0, 100); // Limit to top 100

    // Step 5: Get student details
    const studentIds = sortedStudents.map(item => item.studentId);
    const students = await User.findAll({
      where: { id: studentIds },
      attributes: ['id', 'name', 'regNo', 'department', 'faculty', 'programme', 'year', 'phone']
    });

    const studentLookup = {};
    students.forEach(student => {
      studentLookup[student.id] = student;
    });

    // Step 6: Merge data
    const enrichedStudents = sortedStudents
      .map((item, index) => {
        const student = studentLookup[item.studentId];
        if (!student) return null;
        
        return {
          id: student.id,
          name: student.name,
          regNo: student.regNo,
          department: student.department,
          faculty: student.faculty,
          programme: student.programme,
          year: student.year,
          phone: student.phone,
          feedbackCount: item.feedbackCount,
          rank: index + 1
        };
      })
      .filter(item => item !== null);

    // Step 7: Apply pagination
    const totalStudents = enrichedStudents.length;
    const totalPages = Math.ceil(totalStudents / parseInt(limit));
    const currentPage = parseInt(page);
    const startIndex = (currentPage - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedStudents = enrichedStudents.slice(startIndex, endIndex);

    console.log('[Simple Feedback Givers] Successfully processed results');

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
          totalFeedbacks: feedbacks.length,
          averageFeedbacksPerStudent: totalStudents > 0 ? (feedbacks.length / totalStudents).toFixed(2) : 0,
          topFeedbackCount: enrichedStudents[0]?.feedbackCount || 0,
          showing: `${startIndex + 1}-${Math.min(endIndex, totalStudents)} of ${totalStudents}`
        },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[Simple Feedback Givers] Error:', error.message);
    console.error('[Simple Feedback Givers] Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to get feedback givers',
      error: error.message
    });
  }
};

/**
 * @desc    Test feedback table connectivity
 * @route   GET /api/admin/analytics/test-feedback
 * @access  Private (Admin)
 */
exports.testFeedbackTable = async (req, res) => {
  try {
    console.log('[Test Feedback] Starting test...');

    // Test basic table access
    const feedbackCount = await Feedback.count();
    console.log(`[Test Feedback] Found ${feedbackCount} total feedbacks`);

    // Test event count
    const eventCount = await Event.count();
    console.log(`[Test Feedback] Found ${eventCount} total events`);

    // Test user count
    const userCount = await User.count();
    console.log(`[Test Feedback] Found ${userCount} total users`);

    res.status(200).json({
      success: true,
      data: {
        message: 'Feedback table test successful',
        counts: {
          feedbacks: feedbackCount,
          events: eventCount,
          users: userCount
        }
      }
    });

  } catch (error) {
    console.error('[Test Feedback] Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Feedback table test failed',
      error: error.message
    });
  }
};