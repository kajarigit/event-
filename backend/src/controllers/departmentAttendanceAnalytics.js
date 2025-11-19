const { User, Attendance, Event } = require('../models/index.sequelize');
const { Sequelize } = require('sequelize');
const { Op } = require('sequelize');

const departmentAttendanceAnalytics = {
  // Get department-wise attendance statistics with percentage calculation
  getDepartmentAttendanceStats: async (req, res) => {
    try {
      const { eventId } = req.params;
      
      if (!eventId) {
        return res.status(400).json({ error: 'Event ID is required' });
      }

      // Verify event exists
      const event = await Event.findByPk(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Get total students by department (excluding admins, volunteers, and non-students)
      const departmentTotals = await User.findAll({
        where: {
          role: 'student',
          department: { [Op.not]: null },
          isActive: true
        },
        attributes: [
          'department',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalStudents']
        ],
        group: ['department'],
        raw: true
      });

      // Get students who attended the event grouped by department
      const attendanceWithStudents = await Attendance.findAll({
        where: {
          eventId: eventId
        },
        include: [{
          model: User,
          as: 'student',
          where: {
            role: 'student',
            department: { [Op.not]: null },
            isActive: true
          },
          attributes: ['id', 'department']
        }],
        attributes: ['studentId'],
        raw: false
      });

      // Count unique attended students by department
      const attendedByDepartment = {};
      const uniqueStudentsByDept = new Set();
      
      attendanceWithStudents.forEach(record => {
        if (record.student) {
          const dept = record.student.department;
          const studentId = record.student.id;
          const key = `${dept}-${studentId}`;
          
          if (!uniqueStudentsByDept.has(key)) {
            uniqueStudentsByDept.add(key);
            attendedByDepartment[dept] = (attendedByDepartment[dept] || 0) + 1;
          }
        }
      });

      // Calculate attendance percentages and rankings
      const departmentStats = departmentTotals.map(dept => {
        const department = dept.department;
        const totalStudents = parseInt(dept.totalStudents);
        const attendedStudents = attendedByDepartment[department] || 0;
        const attendancePercentage = totalStudents > 0 ? (attendedStudents / totalStudents * 100) : 0;

        return {
          department,
          totalStudents,
          attendedStudents,
          attendancePercentage: Math.round(attendancePercentage * 100) / 100, // Round to 2 decimal places
          absentStudents: totalStudents - attendedStudents
        };
      });

      // Sort by attendance percentage (highest first)
      departmentStats.sort((a, b) => b.attendancePercentage - a.attendancePercentage);

      // Add ranking
      departmentStats.forEach((dept, index) => {
        dept.rank = index + 1;
      });

      const response = {
        event: {
          id: event.id,
          name: event.name,
          startDate: event.startDate,
          endDate: event.endDate
        },
        totalDepartments: departmentStats.length,
        departmentStats,
        summary: {
          totalStudentsAcrossAllDepts: departmentStats.reduce((sum, dept) => sum + dept.totalStudents, 0),
          totalAttendedAcrossAllDepts: departmentStats.reduce((sum, dept) => sum + dept.attendedStudents, 0),
          overallAttendancePercentage: departmentStats.length > 0 ? 
            Math.round((departmentStats.reduce((sum, dept) => sum + dept.attendedStudents, 0) / 
            departmentStats.reduce((sum, dept) => sum + dept.totalStudents, 0)) * 10000) / 100 : 0
        }
      };

      res.json(response);

    } catch (error) {
      console.error('Error in getDepartmentAttendanceStats:', error);
      res.status(500).json({ 
        error: 'Failed to fetch department attendance statistics',
        details: error.message 
      });
    }
  },

  // Get detailed department attendance with student lists
  getDepartmentAttendanceDetails: async (req, res) => {
    try {
      const { eventId, department } = req.params;
      
      if (!eventId || !department) {
        return res.status(400).json({ error: 'Event ID and department are required' });
      }

      // Verify event exists
      const event = await Event.findByPk(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Get all students in the department
      const allStudents = await User.findAll({
        where: {
          role: 'student',
          department: department,
          isActive: true
        },
        attributes: ['id', 'name', 'regNo', 'email', 'department'],
        order: [['name', 'ASC']]
      });

      // Get students who attended the event
      const attendanceRecords = await Attendance.findAll({
        where: {
          eventId: eventId
        },
        include: [{
          model: User,
          as: 'student',
          where: {
            role: 'student',
            department: department,
            isActive: true
          },
          attributes: ['id']
        }],
        attributes: ['studentId'],
        raw: false
      });

      const attendedStudentIds = [...new Set(attendanceRecords.map(record => record.student.id))];

      const attendedIds = new Set(attendedStudentIds);

      // Categorize students
      const attendedStudents = allStudents.filter(student => attendedIds.has(student.id));
      const absentStudents = allStudents.filter(student => !attendedIds.has(student.id));

      const totalStudents = allStudents.length;
      const attendedCount = attendedStudents.length;
      const attendancePercentage = totalStudents > 0 ? (attendedCount / totalStudents * 100) : 0;

      const response = {
        event: {
          id: event.id,
          name: event.name
        },
        department,
        statistics: {
          totalStudents,
          attendedCount,
          absentCount: absentStudents.length,
          attendancePercentage: Math.round(attendancePercentage * 100) / 100
        },
        attendedStudents: attendedStudents.map(student => ({
          id: student.id,
          name: student.name,
          regNo: student.regNo,
          email: student.email,
          status: 'Present'
        })),
        absentStudents: absentStudents.map(student => ({
          id: student.id,
          name: student.name,
          regNo: student.regNo,
          email: student.email,
          status: 'Absent'
        }))
      };

      res.json(response);

    } catch (error) {
      console.error('Error in getDepartmentAttendanceDetails:', error);
      res.status(500).json({ 
        error: 'Failed to fetch department attendance details',
        details: error.message 
      });
    }
  },

  // Get attendance analytics summary across all events
  getAllEventsAttendanceSummary: async (req, res) => {
    try {
      // Get all events with their attendance stats by department
      const events = await Event.findAll({
        order: [['createdAt', 'DESC']],
        limit: 10 // Latest 10 events
      });

      const eventsSummary = [];

      for (const event of events) {
        // Get department totals for this event's timeframe
        const departmentTotals = await User.findAll({
          where: {
            role: 'student',
            department: { [Op.not]: null },
            isActive: true
          },
          attributes: [
            'department',
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalStudents']
          ],
          group: ['department'],
          raw: true
        });

        // Get attendance for this event
        const eventAttendance = await Attendance.findAll({
          where: {
            eventId: event.id
          },
          include: [{
            model: User,
            as: 'student',
            where: {
              role: 'student',
              department: { [Op.not]: null },
              isActive: true
            },
            attributes: ['department']
          }],
          attributes: [
            [Sequelize.fn('DISTINCT', Sequelize.col('studentId')), 'studentId']
          ],
          group: ['student.department', 'studentId'],
          raw: true
        });

        const attendedByDept = {};
        eventAttendance.forEach(record => {
          const dept = record['student.department'];
          attendedByDept[dept] = (attendedByDept[dept] || 0) + 1;
        });

        const totalStudents = departmentTotals.reduce((sum, dept) => sum + parseInt(dept.totalStudents), 0);
        const totalAttended = Object.values(attendedByDept).reduce((sum, count) => sum + count, 0);
        const overallPercentage = totalStudents > 0 ? (totalAttended / totalStudents * 100) : 0;

        eventsSummary.push({
          id: event.id,
          name: event.name,
          startDate: event.startDate,
          totalStudents,
          totalAttended,
          attendancePercentage: Math.round(overallPercentage * 100) / 100,
          departmentCount: departmentTotals.length
        });
      }

      res.json({
        events: eventsSummary,
        totalEvents: eventsSummary.length
      });

    } catch (error) {
      console.error('Error in getAllEventsAttendanceSummary:', error);
      res.status(500).json({ 
        error: 'Failed to fetch events attendance summary',
        details: error.message 
      });
    }
  }
};

module.exports = departmentAttendanceAnalytics;