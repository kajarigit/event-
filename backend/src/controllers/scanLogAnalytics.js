const { ScanLog, User, Volunteer, Event, Stall, Attendance, Vote, Feedback, sequelize } = require('../models/index.sequelize');
const { Op } = require('sequelize');

const scanLogAnalytics = {
  // Get comprehensive scan log analytics for volunteers and admins
  getScanLogAnalytics: async (req, res) => {
    try {
      const { eventId, volunteerId, timeRange = '24h', scanType } = req.query;
      const userRole = req.user.role;
      const currentUserId = req.user.id;

      // Build where clause
      const whereClause = {};
      
      if (eventId) {
        whereClause.eventId = eventId;
      }

      if (scanType) {
        whereClause.scanType = scanType;
      }

      // Time range filter
      const timeRanges = {
        '1h': new Date(Date.now() - 60 * 60 * 1000),
        '6h': new Date(Date.now() - 6 * 60 * 60 * 1000),
        '24h': new Date(Date.now() - 24 * 60 * 60 * 1000),
        '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        '30d': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      };

      if (timeRanges[timeRange]) {
        whereClause.scanTime = { [Op.gte]: timeRanges[timeRange] };
      }

      // For volunteers, only show their own scans unless admin
      if (userRole === 'volunteer') {
        whereClause.scannedBy = currentUserId;
      } else if (volunteerId && userRole === 'admin') {
        whereClause.scannedBy = volunteerId;
      }

      // Fetch scan logs with associations
      const scanLogs = await ScanLog.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user', // Student who was scanned
            attributes: ['id', 'name', 'regNo', 'department', 'programme', 'year'],
            required: false
          },
          {
            model: Event,
            as: 'event',
            attributes: ['id', 'name', 'startDate', 'endDate'],
            required: false
          },
          {
            model: Stall,
            as: 'stall',
            attributes: ['id', 'name', 'category', 'department'],
            required: false
          }
        ],
        order: [['scanTime', 'DESC']],
        limit: 1000 // Reasonable limit
      });

      // Manually fetch scanner information based on scannedByType
      for (const log of scanLogs) {
        if (log.scannedBy) {
          try {
            if (log.scannedByType === 'volunteer') {
              const volunteer = await Volunteer.findByPk(log.scannedBy, {
                attributes: ['id', 'name', 'volunteerId', 'department']
              });
              if (volunteer) {
                log.dataValues.scanner = {
                  id: volunteer.id,
                  name: volunteer.name,
                  role: 'volunteer',
                  volunteerId: volunteer.volunteerId,
                  department: volunteer.department
                };
              }
            } else if (log.scannedByType === 'user') {
              const user = await User.findByPk(log.scannedBy, {
                attributes: ['id', 'name', 'role', 'department']
              });
              if (user) {
                log.dataValues.scanner = {
                  id: user.id,
                  name: user.name,
                  role: user.role,
                  department: user.department
                };
              }
            }
          } catch (scannerError) {
            console.warn('Error fetching scanner for scan log:', log.id, scannerError.message);
          }
        }
      }

      // Calculate analytics
      const analytics = {
        totalScans: scanLogs.length,
        scansByType: {},
        scansByStatus: {},
        scansByHour: {},
        scansByVolunteer: {},
        recentActivity: scanLogs.slice(0, 20),
        topStudentsByScans: {},
        scanTrends: []
      };

      // Process scan logs for analytics
      scanLogs.forEach(log => {
        const scanTime = new Date(log.scanTime);
        const hour = scanTime.getHours();
        const volunteerId = log.scannedBy;
        const studentId = log.userId;

        // Count by type
        analytics.scansByType[log.scanType] = (analytics.scansByType[log.scanType] || 0) + 1;

        // Count by status
        analytics.scansByStatus[log.status] = (analytics.scansByStatus[log.status] || 0) + 1;

        // Count by hour
        analytics.scansByHour[hour] = (analytics.scansByHour[hour] || 0) + 1;

        // Count by volunteer (ensure this works for all users)
        const scanner = log.scanner || log.dataValues?.scanner;
        if (scanner) {
          const volunteerName = scanner.name;
          if (!analytics.scansByVolunteer[volunteerName]) {
            analytics.scansByVolunteer[volunteerName] = { count: 0, volunteer: scanner };
          }
          analytics.scansByVolunteer[volunteerName].count++;
        }

        // Count scans per student
        if (log.user && studentId) {
          if (!analytics.topStudentsByScans[studentId]) {
            analytics.topStudentsByScans[studentId] = { count: 0, student: log.user };
          }
          analytics.topStudentsByScans[studentId].count++;
        }
      });

      // Convert objects to sorted arrays
      analytics.topVolunteers = Object.values(analytics.scansByVolunteer)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      analytics.topStudents = Object.values(analytics.topStudentsByScans)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Generate hourly trends for the last 24 hours
      const last24Hours = [];
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(Date.now() - i * 60 * 60 * 1000).getHours();
        last24Hours.push({
          hour,
          count: analytics.scansByHour[hour] || 0
        });
      }
      analytics.hourlyTrends = last24Hours;

      // Get current status - users who checked in but haven't checked out
      const currentlyCheckedIn = await ScanLog.count({
        where: {
          scanType: 'check-in',
          scanTime: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      }) - await ScanLog.count({
        where: {
          scanType: 'check-out',
          scanTime: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      });

      analytics.currentlyCheckedIn = currentlyCheckedIn;

      res.json({
        success: true,
        data: analytics,
        meta: {
          timeRange,
          eventId,
          volunteerId: userRole === 'volunteer' ? currentUserId : volunteerId,
          generatedAt: new Date()
        }
      });

    } catch (error) {
      console.error('Error in getScanLogAnalytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch scan log analytics',
        details: error.message
      });
    }
  },

  // Get detailed scan logs with pagination and filters
  getDetailedScanLogs: async (req, res) => {
    try {
      const { 
        eventId, 
        volunteerId, 
        studentId, 
        scanType, 
        status,
        page = 1, 
        limit = 50,
        sortBy = 'scanTime',
        sortOrder = 'DESC'
      } = req.query;

      const userRole = req.user.role;
      const currentUserId = req.user.id;

      // Build where clause
      const whereClause = {};
      
      if (eventId) whereClause.eventId = eventId;
      if (studentId) whereClause.userId = studentId;
      if (scanType) whereClause.scanType = scanType;
      if (status) whereClause.status = status;

      // For volunteers, only show their own scans unless admin
      if (userRole === 'volunteer') {
        whereClause.scannedBy = currentUserId;
      } else if (volunteerId && userRole === 'admin') {
        whereClause.scannedBy = volunteerId;
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows: scanLogs } = await ScanLog.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'regNo', 'department', 'programme', 'year', 'email'],
          },
          {
            model: Event,
            as: 'event',
            attributes: ['id', 'name', 'startDate', 'endDate'],
          },
          {
            model: Stall,
            as: 'stall',
            attributes: ['id', 'name', 'category', 'department'],
            required: false
          }
        ],
        order: [[sortBy, sortOrder.toUpperCase()]],
        limit: parseInt(limit),
        offset
      });

      // Manually fetch scanner information based on scannedByType
      for (const log of scanLogs) {
        if (log.scannedBy) {
          try {
            if (log.scannedByType === 'volunteer') {
              const volunteer = await Volunteer.findByPk(log.scannedBy, {
                attributes: ['id', 'name', 'volunteerId', 'department']
              });
              if (volunteer) {
                log.dataValues.scanner = {
                  id: volunteer.id,
                  name: volunteer.name,
                  role: 'volunteer',
                  volunteerId: volunteer.volunteerId,
                  department: volunteer.department
                };
              }
            } else if (log.scannedByType === 'user') {
              const user = await User.findByPk(log.scannedBy, {
                attributes: ['id', 'name', 'role', 'department']
              });
              if (user) {
                log.dataValues.scanner = {
                  id: user.id,
                  name: user.name,
                  role: user.role,
                  department: user.department
                };
              }
            }
          } catch (scannerError) {
            console.warn('Error fetching scanner for scan log:', log.id, scannerError.message);
          }
        }
      }

      res.json({
        success: true,
        data: scanLogs,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / parseInt(limit)),
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Error in getDetailedScanLogs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch detailed scan logs',
        details: error.message
      });
    }
  },

  // Get volunteer performance metrics (for admins)
  getVolunteerPerformance: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const { timeRange = '24h' } = req.query;

      // Time range filter
      const timeRanges = {
        '24h': new Date(Date.now() - 24 * 60 * 60 * 1000),
        '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        '30d': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      };

      const startTime = timeRanges[timeRange] || timeRanges['24h'];

      // Get volunteer performance data
      const volunteerStats = await ScanLog.findAll({
        where: {
          scanTime: { [Op.gte]: startTime },
          scannedBy: { [Op.not]: null },
          scannedByType: 'volunteer' // Only get volunteer scans
        },
        attributes: [
          'scannedBy',
          [sequelize.fn('COUNT', sequelize.col('ScanLog.id')), 'totalScans'],
          [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'success' THEN 1 END")), 'successfulScans'],
          [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'failed' THEN 1 END")), 'failedScans'],
          [sequelize.fn('MIN', sequelize.col('scanTime')), 'firstScan'],
          [sequelize.fn('MAX', sequelize.col('scanTime')), 'lastScan']
        ],
        group: ['scannedBy'],
        raw: true
      });

      // Get volunteer details separately
      const volunteerIds = volunteerStats.map(stat => stat.scannedBy);
      const volunteers = await Volunteer.findAll({
        where: { id: volunteerIds },
        attributes: ['id', 'name', 'volunteerId', 'department']
      });

      const volunteerLookup = {};
      volunteers.forEach(volunteer => {
        volunteerLookup[volunteer.id] = volunteer;
      });

      // Calculate additional metrics
      const performanceData = volunteerStats.map(stat => {
        const volunteer = volunteerLookup[stat.scannedBy];
        if (!volunteer) return null;

        const totalScans = parseInt(stat.totalScans);
        const successfulScans = parseInt(stat.successfulScans);
        const failedScans = parseInt(stat.failedScans);
        const successRate = totalScans > 0 ? (successfulScans / totalScans * 100) : 0;
        
        const firstScan = new Date(stat.firstScan);
        const lastScan = new Date(stat.lastScan);
        const workingTime = (lastScan - firstScan) / (1000 * 60 * 60); // hours
        const scansPerHour = workingTime > 0 ? (totalScans / workingTime) : 0;

        return {
          volunteer: {
            id: volunteer.id,
            name: volunteer.name,
            role: 'volunteer',
            volunteerId: volunteer.volunteerId,
            department: volunteer.department
          },
          metrics: {
            totalScans,
            successfulScans,
            failedScans,
            successRate: Math.round(successRate * 100) / 100,
            workingHours: Math.round(workingTime * 100) / 100,
            scansPerHour: Math.round(scansPerHour * 100) / 100,
            firstScan: stat.firstScan,
            lastScan: stat.lastScan
          }
        };
      }).filter(item => item !== null);

      // Sort by total scans
      performanceData.sort((a, b) => b.metrics.totalScans - a.metrics.totalScans);

      res.json({
        success: true,
        data: performanceData,
        meta: {
          timeRange,
          generatedAt: new Date()
        }
      });

    } catch (error) {
      console.error('Error in getVolunteerPerformance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch volunteer performance metrics',
        details: error.message
      });
    }
  },

  // Get real-time scan activity (WebSocket-ready)
  getRealTimeScanActivity: async (req, res) => {
    try {
      const { eventId } = req.query;
      const userRole = req.user.role;
      const currentUserId = req.user.id;

      const whereClause = {
        scanTime: { [Op.gte]: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
      };

      if (eventId) whereClause.eventId = eventId;
      
      // For volunteers, only show their own scans
      if (userRole === 'volunteer') {
        whereClause.scannedBy = currentUserId;
      }

      const recentScans = await ScanLog.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'regNo', 'department']
          },
          {
            model: Event,
            as: 'event',
            attributes: ['id', 'name']
          }
        ],
        order: [['scanTime', 'DESC']],
        limit: 20
      });

      // Manually fetch scanner information based on scannedByType
      for (const log of recentScans) {
        if (log.scannedBy) {
          try {
            if (log.scannedByType === 'volunteer') {
              const volunteer = await Volunteer.findByPk(log.scannedBy, {
                attributes: ['id', 'name', 'volunteerId']
              });
              if (volunteer) {
                log.dataValues.scanner = {
                  id: volunteer.id,
                  name: volunteer.name,
                  role: 'volunteer'
                };
              }
            } else if (log.scannedByType === 'user') {
              const user = await User.findByPk(log.scannedBy, {
                attributes: ['id', 'name', 'role']
              });
              if (user) {
                log.dataValues.scanner = {
                  id: user.id,
                  name: user.name,
                  role: user.role
                };
              }
            }
          } catch (scannerError) {
            console.warn('Error fetching scanner for real-time scan:', log.id, scannerError.message);
          }
        }
      }

      res.json({
        success: true,
        data: recentScans,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error in getRealTimeScanActivity:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch real-time scan activity',
        details: error.message
      });
    }
  },

  // Export scan logs to CSV
  exportScanLogs: async (req, res) => {
    try {
      const { eventId, volunteerId, timeRange = '24h' } = req.query;
      const userRole = req.user.role;
      const currentUserId = req.user.id;

      // Build where clause (similar to other methods)
      const whereClause = {};
      if (eventId) whereClause.eventId = eventId;
      
      if (userRole === 'volunteer') {
        whereClause.scannedBy = currentUserId;
      } else if (volunteerId && userRole === 'admin') {
        whereClause.scannedBy = volunteerId;
      }

      const scanLogs = await ScanLog.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['name', 'regNo', 'department', 'programme']
          },
          {
            model: Event,
            as: 'event',
            attributes: ['name']
          },
          {
            model: Stall,
            as: 'stall',
            attributes: ['name', 'category'],
            required: false
          }
        ],
        order: [['scanTime', 'DESC']]
      });

      // Manually fetch scanner information based on scannedByType
      for (const log of scanLogs) {
        if (log.scannedBy) {
          try {
            if (log.scannedByType === 'volunteer') {
              const volunteer = await Volunteer.findByPk(log.scannedBy, {
                attributes: ['name', 'volunteerId']
              });
              if (volunteer) {
                log.dataValues.scanner = {
                  name: volunteer.name,
                  role: 'volunteer'
                };
              }
            } else if (log.scannedByType === 'user') {
              const user = await User.findByPk(log.scannedBy, {
                attributes: ['name', 'role']
              });
              if (user) {
                log.dataValues.scanner = {
                  name: user.name,
                  role: user.role
                };
              }
            }
          } catch (scannerError) {
            console.warn('Error fetching scanner for export:', log.id, scannerError.message);
          }
        }
      }

      // Convert to CSV format
      const csvHeaders = [
        'Scan ID',
        'Scan Time',
        'Scan Type',
        'Status',
        'Student Name',
        'Registration No',
        'Department',
        'Programme',
        'Event Name',
        'Stall Name',
        'Stall Category',
        'Scanned By',
        'Scanner Role',
        'Gate'
      ];

      const csvRows = scanLogs.map(log => [
        log.id,
        log.scanTime.toISOString(),
        log.scanType,
        log.status,
        log.user?.name || 'N/A',
        log.user?.regNo || 'N/A',
        log.user?.department || 'N/A',
        log.user?.programme || 'N/A',
        log.event?.name || 'N/A',
        log.stall?.name || 'N/A',
        log.stall?.category || 'N/A',
        log.scanner?.name || 'N/A',
        log.scanner?.role || 'N/A',
        log.gate || 'N/A'
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="scan_logs_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);

    } catch (error) {
      console.error('Error in exportScanLogs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export scan logs',
        details: error.message
      });
    }
  }
};

module.exports = scanLogAnalytics;