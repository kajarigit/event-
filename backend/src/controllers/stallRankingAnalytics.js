const { Event, Stall, Vote, User } = require('../models/index.sequelize');
const { Op } = require('sequelize');

/**
 * @desc    Get top stalls by votes, grouped by department with rankings
 * @route   GET /api/admin/analytics/top-stalls-by-department/:eventId
 * @access  Private (Admin)
 */
exports.getTopStallsByDepartment = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { limit = 25 } = req.query;

    console.log('[Top Stalls By Department] Starting for eventId:', eventId, 'limit:', limit);

    // Step 1: Get event info
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Step 2: Get vote counts per stall for this event with department grouping
    const stallVoteCounts = await Vote.findAll({
      attributes: [
        'stallId',
        [require('sequelize').fn('COUNT', require('sequelize').col('Vote.id')), 'voteCount']
      ],
      where: { eventId: eventId },
      group: ['stallId'],
      raw: true
    });

    console.log(`[Top Stalls By Department] Found votes for ${stallVoteCounts.length} stalls`);

    if (stallVoteCounts.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          event: { id: event.id, name: event.name },
          departmentRankings: [],
          summary: {
            totalStalls: 0,
            totalVotes: 0,
            totalDepartments: 0
          }
        }
      });
    }

    // Step 3: Get stall details for all voted stalls
    const stallIds = stallVoteCounts.map(item => item.stallId);
    const stalls = await Stall.findAll({
      where: { id: stallIds },
      attributes: ['id', 'name', 'description', 'location', 'department', 'ownerName', 'ownerContact', 'ownerEmail', 'category', 'ownerId']
    });

    console.log(`[Top Stalls By Department] Found ${stalls.length} stall details`);

    // Step 4: Create stall lookup and merge with vote counts
    const stallLookup = {};
    stalls.forEach(stall => {
      stallLookup[stall.id] = {
        id: stall.id,
        name: stall.name,
        description: stall.description,
        location: stall.location,
        department: stall.department || 'Unknown',
        ownerName: stall.ownerName,
        ownerContact: stall.ownerContact,
        ownerEmail: stall.ownerEmail,
        category: stall.category,
        ownerId: stall.ownerId
      };
    });

    // Step 5: Merge vote counts with stall data
    const enrichedStalls = stallVoteCounts
      .map(item => {
        const stall = stallLookup[item.stallId];
        if (!stall) {
          console.log('[Top Stalls By Department] Stall not found for ID:', item.stallId);
          return null;
        }
        
        return {
          ...stall,
          voteCount: parseInt(item.voteCount)
        };
      })
      .filter(item => item !== null);

    // Step 6: Group by department and rank within each department
    const departmentGroups = {};
    
    enrichedStalls.forEach(stall => {
      const dept = stall.department;
      if (!departmentGroups[dept]) {
        departmentGroups[dept] = [];
      }
      departmentGroups[dept].push(stall);
    });

    // Step 7: Sort each department's stalls by vote count and assign rankings
    const departmentRankings = [];
    
    Object.keys(departmentGroups).forEach(department => {
      // Sort stalls in this department by vote count (highest first)
      const sortedStalls = departmentGroups[department].sort((a, b) => b.voteCount - a.voteCount);
      
      // Assign rankings within department
      let currentRank = 1;
      let previousVoteCount = null;
      
      sortedStalls.forEach((stall, index) => {
        if (previousVoteCount !== null && stall.voteCount < previousVoteCount) {
          currentRank = index + 1;
        }
        
        stall.departmentRank = currentRank;
        stall.overallRank = 0; // Will be set later
        previousVoteCount = stall.voteCount;
      });

      // Take top 25 or specified limit
      const topStalls = sortedStalls.slice(0, parseInt(limit));
      
      if (topStalls.length > 0) {
        departmentRankings.push({
          department: department,
          stallCount: topStalls.length,
          totalVotes: topStalls.reduce((sum, stall) => sum + stall.voteCount, 0),
          topStall: topStalls[0],
          stalls: topStalls
        });
      }
    });

    // Step 8: Sort departments by their top stall's vote count
    departmentRankings.sort((a, b) => b.topStall.voteCount - a.topStall.voteCount);

    // Step 9: Assign overall rankings across all departments
    let overallRank = 1;
    departmentRankings.forEach(deptRanking => {
      deptRanking.stalls.forEach(stall => {
        stall.overallRank = overallRank++;
      });
    });

    // Step 10: Calculate summary statistics
    const totalStalls = enrichedStalls.length;
    const totalVotes = enrichedStalls.reduce((sum, stall) => sum + stall.voteCount, 0);
    const totalDepartments = departmentRankings.length;

    console.log('[Top Stalls By Department] Successfully processed rankings');

    res.status(200).json({
      success: true,
      data: {
        event: {
          id: event.id,
          name: event.name,
          description: event.description
        },
        departmentRankings: departmentRankings,
        summary: {
          totalStalls: totalStalls,
          totalVotes: totalVotes,
          totalDepartments: totalDepartments,
          averageVotesPerStall: totalStalls > 0 ? (totalVotes / totalStalls).toFixed(2) : 0,
          topDepartment: departmentRankings[0]?.department || null,
          topStall: departmentRankings[0]?.topStall || null
        },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[Top Stalls By Department] Error:', error.message);
    console.error('[Top Stalls By Department] Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to get department-wise stall rankings',
      error: error.message
    });
  }
};

/**
 * @desc    Get voting overview across all events
 * @route   GET /api/admin/analytics/voting-overview
 * @access  Private (Admin)
 */
exports.getVotingOverview = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    console.log('[Voting Overview] Starting analytics');

    // Get vote counts by event
    const eventVoteCounts = await Vote.findAll({
      attributes: [
        'eventId',
        [require('sequelize').fn('COUNT', require('sequelize').col('Vote.id')), 'voteCount'],
        [require('sequelize').fn('COUNT', require('sequelize').fn('DISTINCT', require('sequelize').col('stallId'))), 'stallsWithVotes'],
        [require('sequelize').fn('COUNT', require('sequelize').fn('DISTINCT', require('sequelize').col('studentId'))), 'uniqueVoters']
      ],
      group: ['eventId'],
      order: [[require('sequelize').fn('COUNT', require('sequelize').col('Vote.id')), 'DESC']],
      limit: parseInt(limit),
      raw: true
    });

    // Get event details
    const eventIds = eventVoteCounts.map(item => item.eventId);
    const events = await Event.findAll({
      where: { id: eventIds },
      attributes: ['id', 'name', 'description', 'startDate', 'endDate']
    });

    const eventLookup = {};
    events.forEach(event => {
      eventLookup[event.id] = event;
    });

    // Merge data
    const enrichedEvents = eventVoteCounts.map(item => ({
      event: eventLookup[item.eventId],
      voteCount: parseInt(item.voteCount),
      stallsWithVotes: parseInt(item.stallsWithVotes),
      uniqueVoters: parseInt(item.uniqueVoters),
      averageVotesPerStall: (parseInt(item.voteCount) / parseInt(item.stallsWithVotes)).toFixed(2),
      averageVotesPerVoter: (parseInt(item.voteCount) / parseInt(item.uniqueVoters)).toFixed(2)
    }));

    res.status(200).json({
      success: true,
      data: {
        events: enrichedEvents,
        totalEvents: enrichedEvents.length
      }
    });

  } catch (error) {
    console.error('[Voting Overview] Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get voting overview',
      error: error.message
    });
  }
};

/**
 * @desc    Test voting system connectivity
 * @route   GET /api/admin/analytics/test-voting
 * @access  Private (Admin)
 */
exports.testVotingSystem = async (req, res) => {
  try {
    console.log('[Test Voting] Starting connectivity test');

    // Count records in each table
    const voteCount = await Vote.count();
    const stallCount = await Stall.count();
    const eventCount = await Event.count();

    console.log(`[Test Voting] Found ${voteCount} votes, ${stallCount} stalls, ${eventCount} events`);

    res.status(200).json({
      success: true,
      message: 'Voting system connectivity test successful',
      data: {
        votes: voteCount,
        stalls: stallCount,
        events: eventCount,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[Test Voting] Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Voting system test failed',
      error: error.message
    });
  }
};