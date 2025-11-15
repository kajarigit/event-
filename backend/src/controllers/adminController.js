const Event = require('../models/Event');
const Stall = require('../models/Stall');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Feedback = require('../models/Feedback');
const Vote = require('../models/Vote');
const { generateStallQR } = require('../utils/jwt');
const { sendCredentialsEmail, sendBulkCredentialsEmails } = require('../services/emailService');
const Papa = require('papaparse');
const fs = require('fs').promises;

/**
 * EVENTS
 */
exports.getEvents = async (req, res, next) => {
  try {
    const { isActive, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const events = await Event.find(filter)
      .populate('createdBy', 'name email')
      .sort({ startTime: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Event.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: events.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: events,
    });
  } catch (error) {
    next(error);
  }
};

exports.createEvent = async (req, res, next) => {
  try {
    const eventData = {
      ...req.body,
      createdBy: req.user._id,
    };

    const event = await Event.create(eventData);

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

exports.getEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate('createdBy', 'name email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.toggleEventActive = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    event.isActive = !event.isActive;
    await event.save();

    res.status(200).json({
      success: true,
      message: `Event ${event.isActive ? 'activated' : 'deactivated'} successfully`,
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * STALLS
 */
exports.getStalls = async (req, res, next) => {
  try {
    const { eventId, department, isActive, limit = 100, page = 1 } = req.query;
    const filter = {};
    if (eventId) filter.eventId = eventId;
    if (department) filter.department = department;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const stalls = await Stall.find(filter)
      .populate('eventId', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Stall.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: stalls.length,
      total,
      data: stalls,
    });
  } catch (error) {
    next(error);
  }
};

exports.createStall = async (req, res, next) => {
  try {
    const { eventId } = req.body;

    // Create stall first without QR
    const stall = await Stall.create({
      ...req.body,
      qrToken: 'temp_' + Date.now(), // Temporary token
    });

    // Now generate QR with actual stall ID
    const qrData = await generateStallQR(stall._id.toString(), eventId);
    
    // Update stall with actual QR token
    stall.qrToken = qrData.qrData; // Store the JSON string
    await stall.save();

    res.status(201).json({
      success: true,
      message: 'Stall created successfully',
      data: {
        stall,
        qrImage: qrData.qrImage,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getStall = async (req, res, next) => {
  try {
    const stall = await Stall.findById(req.params.id).populate('eventId');

    if (!stall) {
      return res.status(404).json({
        success: false,
        message: 'Stall not found',
      });
    }

    res.status(200).json({
      success: true,
      data: stall,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateStall = async (req, res, next) => {
  try {
    const stall = await Stall.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!stall) {
      return res.status(404).json({
        success: false,
        message: 'Stall not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Stall updated successfully',
      data: stall,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteStall = async (req, res, next) => {
  try {
    const stall = await Stall.findByIdAndDelete(req.params.id);

    if (!stall) {
      return res.status(404).json({
        success: false,
        message: 'Stall not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Stall deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get stall QR code
exports.getStallQRCode = async (req, res, next) => {
  try {
    const stall = await Stall.findById(req.params.id);

    if (!stall) {
      return res.status(404).json({
        success: false,
        message: 'Stall not found',
      });
    }

    // Generate QR code image from stored qrToken
    const QRCode = require('qrcode');
    const qrImage = await QRCode.toDataURL(stall.qrToken, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    res.status(200).json({
      success: true,
      data: {
        stallId: stall._id,
        stallName: stall.name,
        qrToken: stall.qrToken,
        qrImage,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * BULK UPLOAD STALLS
 */
exports.bulkUploadStalls = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is required',
      });
    }

    const csvData = await fs.readFile(req.file.path, 'utf-8');
    const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });

    const stalls = [];
    const errors = [];

    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      try {
        const qrData = await generateStallQR('temp', row.eventId);
        stalls.push({
          name: row.name,
          department: row.department,
          programme: row.programme || 'General',
          description: row.description,
          ownerName: row.ownerName,
          ownerContact: row.ownerContact,
          ownerEmail: row.ownerEmail,
          eventId: row.eventId,
          qrToken: qrData.token,
        });
      } catch (error) {
        errors.push({ row: i + 2, error: error.message });
      }
    }

    if (stalls.length > 0) {
      await Stall.insertMany(stalls);
    }

    // Clean up uploaded file
    await fs.unlink(req.file.path);

    res.status(201).json({
      success: true,
      message: `${stalls.length} stalls uploaded successfully`,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * USERS
 */
exports.getUsers = async (req, res, next) => {
  try {
    const { role, department, limit = 100, page = 1 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (department) filter.department = department;

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const { password, email, name, role } = req.body;
    const plainPassword = password; // Save password before hashing
    
    const user = await User.create(req.body);

    // Send credentials email (non-blocking - doesn't fail if email fails)
    if (email && plainPassword) {
      sendCredentialsEmail(email, name, plainPassword, role).catch((err) => {
        console.error('Email sending failed:', err.message);
      });
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully. Credentials sent to email.',
      data: user.getPublicProfile(),
    });
  } catch (error) {
    next(error);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    // Don't allow password update through this endpoint
    delete req.body.password;

    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * BULK UPLOAD USERS
 */
exports.bulkUploadUsers = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is required',
      });
    }

    const csvData = await fs.readFile(req.file.path, 'utf-8');
    const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });

    const users = [];
    const usersWithPlainPasswords = []; // For email sending
    const errors = [];

    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      try {
        const plainPassword = row.password || 'changeme123';
        const userRole = row.role || 'student';
        
        const userData = {
          name: row.name,
          email: row.email,
          password: plainPassword,
          role: userRole,
          rollNo: row.rollNo,
          programme: row.programme,
          department: row.department,
          phone: row.phone,
          assignedGate: row.assignedGate,
        };
        
        users.push(userData);
        
        // Store plain password info for email
        usersWithPlainPasswords.push({
          email: row.email,
          name: row.name,
          password: plainPassword,
          role: userRole,
        });
      } catch (error) {
        errors.push({ row: i + 2, error: error.message });
      }
    }

    if (users.length > 0) {
      await User.insertMany(users);
      
      // Send bulk emails (non-blocking)
      sendBulkCredentialsEmails(usersWithPlainPasswords).catch((err) => {
        console.error('Bulk email sending failed:', err.message);
      });
    }

    await fs.unlink(req.file.path);

    res.status(201).json({
      success: true,
      message: `${users.length} users uploaded successfully. Credentials sent to their emails.`,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ANALYTICS - Continued in next file part
 */
exports.getTopStudentsByStayTime = async (req, res, next) => {
  try {
    const { eventId, limit = 10 } = req.query;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required',
      });
    }

    const topStudents = await Attendance.aggregate([
      { $match: { eventId: require('mongoose').Types.ObjectId(eventId) } },
      {
        $group: {
          _id: '$studentId',
          totalDuration: { $sum: '$durationSeconds' },
          checkInCount: { $sum: 1 },
        },
      },
      { $sort: { totalDuration: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'student',
        },
      },
      { $unwind: '$student' },
      {
        $project: {
          _id: 0,
          studentId: '$_id',
          name: '$student.name',
          rollNo: '$student.rollNo',
          department: '$student.department',
          totalDurationSeconds: '$totalDuration',
          totalDurationHours: { $divide: ['$totalDuration', 3600] },
          checkInCount: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      count: topStudents.length,
      data: topStudents,
    });
  } catch (error) {
    next(error);
  }
};

exports.getMostReviewers = async (req, res, next) => {
  try {
    const { eventId, limit = 10 } = req.query;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required',
      });
    }

    const topReviewers = await Feedback.aggregate([
      { $match: { eventId: require('mongoose').Types.ObjectId(eventId) } },
      {
        $group: {
          _id: '$studentId',
          reviewCount: { $sum: 1 },
          averageRating: { $avg: '$rating' },
        },
      },
      { $sort: { reviewCount: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'student',
        },
      },
      { $unwind: '$student' },
      {
        $project: {
          _id: 0,
          studentId: '$_id',
          name: '$student.name',
          rollNo: '$student.rollNo',
          department: '$student.department',
          reviewCount: 1,
          averageRating: { $round: ['$averageRating', 1] },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      count: topReviewers.length,
      data: topReviewers,
    });
  } catch (error) {
    next(error);
  }
};

exports.getTopStallsByVotes = async (req, res, next) => {
  try {
    const { eventId, department, limit = 10 } = req.query;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required',
      });
    }

    const matchStage = { eventId: require('mongoose').Types.ObjectId(eventId) };

    const topStalls = await Stall.aggregate([
      { $match: matchStage },
      ...(department ? [{ $match: { department } }] : []),
      {
        $project: {
          name: 1,
          department: 1,
          'stats.totalVotes': 1,
          'stats.rank1Votes': 1,
          'stats.rank2Votes': 1,
          'stats.rank3Votes': 1,
          'stats.averageRating': 1,
          weightedScore: {
            $add: [
              { $multiply: ['$stats.rank1Votes', 3] },
              { $multiply: ['$stats.rank2Votes', 2] },
              '$stats.rank3Votes',
            ],
          },
        },
      },
      { $sort: { weightedScore: -1 } },
      { $limit: parseInt(limit) },
    ]);

    res.status(200).json({
      success: true,
      count: topStalls.length,
      data: topStalls,
    });
  } catch (error) {
    next(error);
  }
};

exports.getDepartmentStats = async (req, res, next) => {
  try {
    const { eventId } = req.query;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required',
      });
    }

    const deptStats = await Attendance.aggregate([
      { $match: { eventId: require('mongoose').Types.ObjectId(eventId) } },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student',
        },
      },
      { $unwind: '$student' },
      {
        $group: {
          _id: {
            department: '$student.department',
            programme: '$student.programme',
          },
          uniqueStudents: { $addToSet: '$studentId' },
          totalCheckIns: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          department: '$_id.department',
          programme: '$_id.programme',
          uniqueStudentCount: { $size: '$uniqueStudents' },
          totalCheckIns: 1,
        },
      },
      { $sort: { uniqueStudentCount: -1 } },
    ]);

    res.status(200).json({
      success: true,
      count: deptStats.length,
      data: deptStats,
    });
  } catch (error) {
    next(error);
  }
};

exports.getEventOverview = async (req, res, next) => {
  try {
    const { eventId } = req.query;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required',
      });
    }

    const oid = require('mongoose').Types.ObjectId(eventId);

    const [event, stats] = await Promise.all([
      Event.findById(eventId),
      Promise.all([
        Attendance.countDocuments({ eventId: oid }),
        Attendance.distinct('studentId', { eventId: oid }),
        Feedback.countDocuments({ eventId: oid }),
        Vote.countDocuments({ eventId: oid }),
        Stall.countDocuments({ eventId: oid, isActive: true }),
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        event,
        totalCheckIns: stats[0],
        uniqueStudents: stats[1].length,
        totalFeedbacks: stats[2],
        totalVotes: stats[3],
        activeStalls: stats[4],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * REPORTS
 */
exports.exportAttendanceReport = async (req, res, next) => {
  try {
    const { eventId } = req.query;
    const filter = eventId ? { eventId } : {};

    const attendances = await Attendance.find(filter)
      .populate('studentId', 'name rollNo department')
      .populate('eventId', 'name')
      .lean();

    const csv = Papa.unparse(attendances.map(a => ({
      StudentName: a.studentId?.name,
      RollNo: a.studentId?.rollNo,
      Department: a.studentId?.department,
      Event: a.eventId?.name,
      CheckIn: a.inTimestamp,
      CheckOut: a.outTimestamp || 'N/A',
      DurationMinutes: a.durationSeconds ? Math.round(a.durationSeconds / 60) : 0,
    })));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.csv');
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

exports.exportFeedbackReport = async (req, res, next) => {
  try {
    const { eventId } = req.query;
    const filter = eventId ? { eventId } : {};

    const feedbacks = await Feedback.find(filter)
      .populate('studentId', 'name rollNo')
      .populate('stallId', 'name department')
      .lean();

    const csv = Papa.unparse(feedbacks.map(f => ({
      Student: f.studentId?.name,
      RollNo: f.studentId?.rollNo,
      Stall: f.stallId?.name,
      Department: f.stallId?.department,
      Rating: f.rating,
      Comment: f.comment || '',
      SubmittedAt: f.submittedAt,
    })));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=feedback_report.csv');
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

exports.exportVoteReport = async (req, res, next) => {
  try {
    const { eventId } = req.query;
    const filter = eventId ? { eventId } : {};

    const votes = await Vote.find(filter)
      .populate('studentId', 'name rollNo')
      .populate('stallId', 'name department')
      .lean();

    const csv = Papa.unparse(votes.map(v => ({
      Student: v.studentId?.name,
      RollNo: v.studentId?.rollNo,
      Stall: v.stallId?.name,
      Department: v.stallId?.department,
      Rank: v.rank,
      VotedAt: v.votedAt,
    })));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=vote_report.csv');
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

/**
 * MANUAL CORRECTIONS
 */
exports.updateAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Attendance updated successfully',
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.findByIdAndDelete(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Attendance deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
