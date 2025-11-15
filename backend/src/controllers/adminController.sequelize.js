const { Event, Stall, User, Attendance, Feedback, Vote, ScanLog, sequelize } = require('../models/index.sequelize');
const { generateStallQR } = require('../utils/jwt');
const { sendCredentialsEmail, sendBulkCredentialsEmails } = require('../services/emailService');
const Papa = require('papaparse');
const fs = require('fs').promises;
const { Op } = require('sequelize');
const { QueryTypes } = require('sequelize');

/**
 * EVENTS
 */
exports.getEvents = async (req, res, next) => {
  try {
    const { isActive, limit = 50, page = 1 } = req.query;
    const where = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const { count, rows: events } = await Event.findAndCountAll({
      where,
      order: [['startDate', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    res.status(200).json({
      success: true,
      count: events.length,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
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
    const event = await Event.findByPk(req.params.id);

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
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    await event.update(req.body);

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
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    await event.destroy();

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
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    await event.update({ isActive: !event.isActive });

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
    const { eventId, isActive, limit = 50, page = 1 } = req.query;
    const where = {};
    if (eventId) where.eventId = eventId;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const { count, rows: stalls } = await Stall.findAndCountAll({
      where,
      include: [
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name'],
        },
      ],
      order: [['name', 'ASC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    res.status(200).json({
      success: true,
      count: stalls.length,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
      data: stalls,
    });
  } catch (error) {
    next(error);
  }
};

exports.createStall = async (req, res, next) => {
  try {
    const stallData = {
      ...req.body,
    };

    // Generate QR token
    if (stallData.eventId) {
      stallData.qrToken = await generateStallQR('temp', stallData.eventId);
    }

    const stall = await Stall.create(stallData);

    // Update QR token with actual stall ID
    if (stall.eventId) {
      stall.qrToken = await generateStallQR(stall.id, stall.eventId);
      await stall.save();
    }

    res.status(201).json({
      success: true,
      message: 'Stall created successfully',
      data: stall,
    });
  } catch (error) {
    next(error);
  }
};

exports.getStall = async (req, res, next) => {
  try {
    const stall = await Stall.findByPk(req.params.id, {
      include: [
        {
          model: Event,
          as: 'event',
        },
      ],
    });

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
    const stall = await Stall.findByPk(req.params.id);

    if (!stall) {
      return res.status(404).json({
        success: false,
        message: 'Stall not found',
      });
    }

    await stall.update(req.body);

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
    const stall = await Stall.findByPk(req.params.id);

    if (!stall) {
      return res.status(404).json({
        success: false,
        message: 'Stall not found',
      });
    }

    await stall.destroy();

    res.status(200).json({
      success: true,
      message: 'Stall deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.getStallQRCode = async (req, res, next) => {
  try {
    const stall = await Stall.findByPk(req.params.id);

    if (!stall) {
      return res.status(404).json({
        success: false,
        message: 'Stall not found',
      });
    }

    // Generate or regenerate QR token
    const qrToken = await generateStallQR(stall.id, stall.eventId);
    
    await stall.update({ qrToken });

    res.status(200).json({
      success: true,
      data: {
        stallId: stall.id,
        stallName: stall.name,
        qrToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

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

    const stallsToCreate = [];
    const errors = [];

    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      try {
        if (!row.name || !row.eventId) {
          errors.push({ row: i + 1, error: 'Name and EventId are required' });
          continue;
        }

        stallsToCreate.push({
          eventId: row.eventId,
          name: row.name,
          description: row.description || null,
          location: row.location || null,
          category: row.category || null,
          ownerName: row.ownerName || null,
          ownerContact: row.ownerContact || null,
          isActive: row.isActive !== 'false',
        });
      } catch (error) {
        errors.push({ row: i + 1, error: error.message });
      }
    }

    const createdStalls = await Stall.bulkCreate(stallsToCreate, { validate: true });

    // Generate QR tokens for all stalls
    for (const stall of createdStalls) {
      stall.qrToken = await generateStallQR(stall.id, stall.eventId);
      await stall.save();
    }

    res.status(201).json({
      success: true,
      message: `${createdStalls.length} stalls created successfully`,
      data: { created: createdStalls.length, errors },
    });
  } catch (error) {
    next(error);
  } finally {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
  }
};

/**
 * USERS
 */
exports.getUsers = async (req, res, next) => {
  try {
    const { role, isActive, limit = 50, page = 1 } = req.query;
    const where = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['name', 'ASC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    res.status(200).json({
      success: true,
      count: users.length,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const userData = {
      ...req.body,
    };

    const user = await User.create(userData);

    // Send credentials email
    if (req.body.sendEmail && req.body.password) {
      await sendCredentialsEmail(user.email, user.name, req.body.password);
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
    });

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
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Don't allow password update through this endpoint
    const { password, ...updateData } = req.body;

    await user.update(updateData);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent deleting the currently logged-in user
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account',
      });
    }

    await user.destroy();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

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

    const usersToCreate = [];
    const errors = [];
    const credentialsToEmail = [];

    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      try {
        if (!row.name || !row.email || !row.password) {
          errors.push({ row: i + 1, error: 'Name, email, and password are required' });
          continue;
        }

        usersToCreate.push({
          name: row.name,
          email: row.email,
          password: row.password,
          role: row.role || 'student',
          phone: row.phone || null,
          department: row.department || null,
          year: row.year || null,
          rollNumber: row.rollNumber || row.rollNo || null,
          isActive: row.isActive !== 'false',
        });

        credentialsToEmail.push({
          email: row.email,
          name: row.name,
          password: row.password,
        });
      } catch (error) {
        errors.push({ row: i + 1, error: error.message });
      }
    }

    const createdUsers = await User.bulkCreate(usersToCreate, {
      validate: true,
      individualHooks: true, // This will trigger password hashing
    });

    // Send bulk credentials emails
    if (req.body.sendEmails) {
      await sendBulkCredentialsEmails(credentialsToEmail);
    }

    res.status(201).json({
      success: true,
      message: `${createdUsers.length} users created successfully`,
      data: { created: createdUsers.length, errors },
    });
  } catch (error) {
    next(error);
  } finally {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
  }
};

/**
 * REPORTS & ANALYTICS
 */
exports.getTopStudentsByStayTime = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { limit = 10 } = req.query;

    // Query to calculate stay time
    const results = await sequelize.query(
      `
      SELECT 
        u.id,
        u.name,
        u."rollNumber",
        u.department,
        EXTRACT(EPOCH FROM (a."checkOutTime" - a."checkInTime")) / 3600 as "stayTimeHours"
      FROM attendances a
      INNER JOIN users u ON a."studentId" = u.id
      WHERE a."eventId" = :eventId
        AND a."checkOutTime" IS NOT NULL
      ORDER BY "stayTimeHours" DESC
      LIMIT :limit
      `,
      {
        replacements: { eventId, limit: parseInt(limit) },
        type: QueryTypes.SELECT,
      }
    );

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

exports.getMostReviewers = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { limit = 10 } = req.query;

    const results = await sequelize.query(
      `
      SELECT 
        u.id,
        u.name,
        u."rollNumber",
        u.department,
        COUNT(DISTINCT f.id) as "feedbackCount",
        COUNT(DISTINCT v.id) as "voteCount",
        COUNT(DISTINCT f.id) + COUNT(DISTINCT v.id) as "totalReviews"
      FROM users u
      LEFT JOIN feedbacks f ON f."studentId" = u.id AND f."eventId" = :eventId
      LEFT JOIN votes v ON v."studentId" = u.id AND v."eventId" = :eventId
      WHERE u.role = 'student'
      GROUP BY u.id, u.name, u."rollNumber", u.department
      HAVING COUNT(DISTINCT f.id) + COUNT(DISTINCT v.id) > 0
      ORDER BY "totalReviews" DESC
      LIMIT :limit
      `,
      {
        replacements: { eventId, limit: parseInt(limit) },
        type: QueryTypes.SELECT,
      }
    );

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

exports.getTopStallsByVotes = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { limit = 10 } = req.query;

    const results = await sequelize.query(
      `
      SELECT 
        s.id,
        s.name,
        s.category,
        s."ownerName",
        COUNT(v.id) as "voteCount",
        COALESCE(AVG(f.rating), 0) as "avgRating"
      FROM stalls s
      LEFT JOIN votes v ON v."stallId" = s.id
      LEFT JOIN feedbacks f ON f."stallId" = s.id
      WHERE s."eventId" = :eventId
      GROUP BY s.id, s.name, s.category, s."ownerName"
      ORDER BY "voteCount" DESC, "avgRating" DESC
      LIMIT :limit
      `,
      {
        replacements: { eventId, limit: parseInt(limit) },
        type: QueryTypes.SELECT,
      }
    );

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

exports.getDepartmentStats = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const results = await sequelize.query(
      `
      SELECT 
        u.department,
        COUNT(DISTINCT a."studentId") as "attendanceCount",
        COUNT(DISTINCT v."studentId") as "voteCount",
        COUNT(DISTINCT f."studentId") as "feedbackCount"
      FROM users u
      LEFT JOIN attendances a ON a."studentId" = u.id AND a."eventId" = :eventId
      LEFT JOIN votes v ON v."studentId" = u.id AND v."eventId" = :eventId
      LEFT JOIN feedbacks f ON f."studentId" = u.id AND f."eventId" = :eventId
      WHERE u.role = 'student' AND u.department IS NOT NULL
      GROUP BY u.department
      ORDER BY "attendanceCount" DESC
      `,
      {
        replacements: { eventId },
        type: QueryTypes.SELECT,
      }
    );

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

exports.getEventOverview = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const [stats] = await sequelize.query(
      `
      SELECT 
        (SELECT COUNT(*) FROM stalls WHERE "eventId" = :eventId) as "totalStalls",
        (SELECT COUNT(*) FROM attendances WHERE "eventId" = :eventId) as "totalAttendees",
        (SELECT COUNT(*) FROM votes WHERE "eventId" = :eventId) as "totalVotes",
        (SELECT COUNT(*) FROM feedbacks WHERE "eventId" = :eventId) as "totalFeedbacks",
        (SELECT COUNT(*) FROM attendances WHERE "eventId" = :eventId AND status = 'checked-in') as "currentlyCheckedIn"
      `,
      {
        replacements: { eventId },
        type: QueryTypes.SELECT,
      }
    );

    res.status(200).json({
      success: true,
      data: {
        event,
        ...stats,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.exportAttendanceReport = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const attendances = await Attendance.findAll({
      where: { eventId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'rollNumber', 'department'],
        },
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name'],
        },
      ],
      order: [['checkInTime', 'DESC']],
    });

    res.status(200).json({
      success: true,
      data: attendances,
    });
  } catch (error) {
    next(error);
  }
};

exports.exportFeedbackReport = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const feedbacks = await Feedback.findAll({
      where: { eventId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'rollNumber'],
        },
        {
          model: Stall,
          as: 'stall',
          attributes: ['id', 'name', 'category'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      data: feedbacks,
    });
  } catch (error) {
    next(error);
  }
};

exports.exportVoteReport = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const votes = await Vote.findAll({
      where: { eventId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'rollNumber'],
        },
        {
          model: Stall,
          as: 'stall',
          attributes: ['id', 'name', 'category'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      data: votes,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.findByPk(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance not found',
      });
    }

    await attendance.update(req.body);

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
    const attendance = await Attendance.findByPk(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance not found',
      });
    }

    await attendance.destroy();

    res.status(200).json({
      success: true,
      message: 'Attendance deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
