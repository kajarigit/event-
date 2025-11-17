const { Event, Stall, User, Attendance, Feedback, Vote, ScanLog, sequelize } = require('../models/index.sequelize');
const { generateStallQR } = require('../utils/jwt');
const { sendCredentialsEmail, sendBulkCredentialsEmails } = require('../services/emailService');
const { generateRandomPassword } = require('../utils/passwordGenerator');
const { sendWelcomeEmail, sendStallQRCode } = require('../utils/emailService');
const { normalizeDepartment, normalizeString, normalizeEmail } = require('../utils/normalization');
const QRCode = require('qrcode');
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

/**
 * @desc    Manually start an event (override schedule)
 * @route   PATCH /api/admin/events/:id/start
 * @access  Private (Admin)
 */
exports.manuallyStartEvent = async (req, res, next) => {
  try {
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    await event.update({
      manuallyStarted: true,
      isActive: true,
      manuallyEnded: false  // Clear manual end if restarting
    });

    res.status(200).json({
      success: true,
      message: 'Event started manually',
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Manually end an event (override schedule)
 * @route   PATCH /api/admin/events/:id/end
 * @access  Private (Admin)
 */
exports.manuallyEndEvent = async (req, res, next) => {
  try {
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    await event.update({
      manuallyEnded: true,
      isActive: false
    });

    res.status(200).json({
      success: true,
      message: 'Event ended manually',
      data: event,
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
    const { eventId, isActive, department, limit = 50, page = 1 } = req.query;
    const where = {};
    if (eventId) where.eventId = eventId;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (department) where.department = department;

    // Try to fetch stalls with event association, fallback to simple query if association fails
    let stalls, count;
    try {
      const result = await Stall.findAndCountAll({
        where,
        include: [
          {
            model: Event,
            as: 'event',
            attributes: ['id', 'name'],
            required: false,
          },
        ],
        order: [['name', 'ASC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
      });
      stalls = result.rows;
      count = result.count;
    } catch (includeError) {
      // Fallback to simple query without associations
      console.warn('Association error, falling back to simple query:', includeError.message);
      const result = await Stall.findAndCountAll({
        where,
        order: [['name', 'ASC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
      });
      stalls = result.rows;
      count = result.count;
    }

    res.status(200).json({
      success: true,
      count: stalls.length,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
      data: stalls,
    });
  } catch (error) {
    console.error('Error fetching stalls:', error);
    next(error);
  }
};

exports.createStall = async (req, res, next) => {
  try {
    // Extract only valid stall fields from request body
    const {
      eventId,
      name,
      description,
      location,
      category,
      ownerName,
      ownerContact,
      ownerEmail,
      department,
      participants,
      isActive
    } = req.body;

    // Validate required fields
    if (!eventId || !name) {
      return res.status(400).json({
        success: false,
        message: 'Event ID and stall name are required',
      });
    }

    // Check for duplicate stall (same name in same event)
    const existingStall = await Stall.findOne({
      where: {
        eventId,
        name: name.trim(),
      },
    });

    if (existingStall) {
      return res.status(400).json({
        success: false,
        message: `A stall named "${name}" already exists in this event. Please use a different name.`,
      });
    }

    const stallData = {
      eventId,
      name: name.trim(),
      description: description || null,
      location: location || null,
      category: category || null,
      ownerName: ownerName || null,
      ownerContact: ownerContact || null,
      ownerEmail: ownerEmail || null,
      department: department || null,
      participants: participants || [],
      isActive: isActive !== undefined ? isActive : true,
    };

    const stall = await Stall.create(stallData);

    // Generate QR token with actual stall ID
    let qrData = null;
    if (stall.eventId) {
      const qrResult = await generateStallQR(stall.id, stall.eventId);
      // generateStallQR returns { token, qrData, qrImage }
      // qrData is JSON string with {stallId, eventId, type, token}
      // token is JWT - save this to database
      stall.qrToken = qrResult.token;
      qrData = qrResult.qrData; // Use this for QR code generation
      await stall.save();
    }

    // Send QR code email if ownerEmail is provided
    if (stall.ownerEmail && qrData) {
      try {
        // Get event details
        const event = await Event.findByPk(stall.eventId);
        
        // Generate QR code as data URL using qrData (not token)
        const qrCodeDataURL = await QRCode.toDataURL(qrData, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        // Send email with QR code
        await sendStallQRCode(stall, qrCodeDataURL, event);
        console.log(`✅ Stall QR email sent to ${stall.ownerEmail}`);
      } catch (emailError) {
        console.error(`❌ Failed to send stall QR email:`, emailError.message);
        // Continue even if email fails
      }
    }

    res.status(201).json({
      success: true,
      message: stall.ownerEmail 
        ? 'Stall created successfully. QR code has been sent to the owner\'s email.' 
        : 'Stall created successfully.',
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
    const qrResult = await generateStallQR(stall.id, stall.eventId);
    // generateStallQR returns { token, qrData, qrImage }
    // qrData is the JSON string that should be in the QR code
    // token is the JWT that we save to database for verification
    const qrToken = qrResult.token;
    const qrData = qrResult.qrData; // This is what goes in the QR code
    
    await stall.update({ qrToken });

    res.status(200).json({
      success: true,
      data: {
        stallId: stall.id,
        stallName: stall.name,
        qrToken: qrData, // Return qrData (JSON string) for QR code display
        token: qrToken,  // Also return JWT token if needed
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
          name: normalizeString(row.name),
          description: normalizeString(row.description) || null,
          location: normalizeString(row.location) || null,
          category: normalizeString(row.category) || null,
          ownerName: normalizeString(row.ownerName) || null,
          ownerContact: normalizeString(row.ownerContact) || null,
          ownerEmail: normalizeEmail(row.ownerEmail) || null,
          department: normalizeDepartment(row.department), // Normalize department
          participants: row.participants ? JSON.parse(row.participants) : [],
          isActive: row.isActive !== 'false',
        });
      } catch (error) {
        errors.push({ row: i + 1, error: error.message });
      }
    }

    const createdStalls = await Stall.bulkCreate(stallsToCreate, { validate: true });

    // Track email results
    const emailResults = {
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    // Generate QR tokens and send emails for all stalls
    for (const stall of createdStalls) {
      // Generate QR token
      const qrResult = await generateStallQR(stall.id, stall.eventId);
      // generateStallQR returns { token, qrData, qrImage }
      // qrData is JSON string - save token to database
      stall.qrToken = qrResult.token;
      await stall.save();

      // Send QR email if ownerEmail is provided
      if (stall.ownerEmail) {
        try {
          // Get event details
          const event = await Event.findByPk(stall.eventId);
          
          // Generate QR code as data URL using qrData (not token)
          const qrCodeDataURL = await QRCode.toDataURL(qrResult.qrData, {
            width: 300,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });

          // Send email
          await sendStallQRCode(stall, qrCodeDataURL, event);
          emailResults.sent++;
          console.log(`✅ Stall QR email sent to ${stall.ownerEmail}`);
        } catch (emailError) {
          emailResults.failed++;
          emailResults.errors.push({
            stallName: stall.name,
            email: stall.ownerEmail,
            error: emailError.message,
          });
          console.error(`❌ Failed to send email for stall ${stall.name}:`, emailError.message);
        }
      } else {
        emailResults.skipped++;
      }
    }

    res.status(201).json({
      success: true,
      message: `${createdStalls.length} stalls created successfully. ${emailResults.sent} QR code emails sent.`,
      data: {
        created: createdStalls.length,
        emailsSent: emailResults.sent,
        emailsFailed: emailResults.failed,
        emailsSkipped: emailResults.skipped,
        uploadErrors: errors,
        emailErrors: emailResults.errors,
      },
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

    // Store plain password before hashing
    const plainPassword = req.body.password;

    const user = await User.create(userData);

    // Send welcome email with credentials
    try {
      await sendWelcomeEmail(user, plainPassword, user.role);
      console.log(`✅ Welcome email sent to ${user.email}`);
    } catch (emailError) {
      console.error(`❌ Failed to send welcome email to ${user.email}:`, emailError.message);
      // Continue even if email fails
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully. Welcome email has been sent.',
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
    const credentialsMap = new Map(); // Store email -> password mapping

    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      try {
        if (!row.name || !row.email) {
          errors.push({ row: i + 1, error: 'Name and email are required' });
          continue;
        }

        // Generate random password if not provided in CSV
        const password = row.password || generateRandomPassword(10);
        
        // Store plain password for email
        credentialsMap.set(row.email, {
          email: normalizeEmail(row.email),
          name: normalizeString(row.name),
          password: password,
          role: row.role || 'student',
          regNo: normalizeString(row.regNo) || null,
        });

        usersToCreate.push({
          name: normalizeString(row.name),
          email: normalizeEmail(row.email),
          password: password, // Will be hashed by model hook
          role: row.role || 'student',
          phone: normalizeString(row.phone) || null,
          regNo: normalizeString(row.regNo) || null,
          faculty: normalizeString(row.faculty) || null,
          department: normalizeDepartment(row.department), // Normalize department
          programme: normalizeString(row.programme) || null,
          year: row.year || null,
          isActive: row.isActive !== 'false',
        });
      } catch (error) {
        errors.push({ row: i + 1, error: error.message });
      }
    }

    const createdUsers = await User.bulkCreate(usersToCreate, {
      validate: true,
      individualHooks: true, // This will trigger password hashing
    });

    // Send welcome emails to all created users
    const emailResults = {
      sent: 0,
      failed: 0,
      errors: [],
    };

    for (const user of createdUsers) {
      const credentials = credentialsMap.get(user.email);
      if (credentials) {
        try {
          await sendWelcomeEmail(user, credentials.password, user.role);
          emailResults.sent++;
          console.log(`✅ Welcome email sent to ${user.email}`);
        } catch (emailError) {
          emailResults.failed++;
          emailResults.errors.push({
            email: user.email,
            error: emailError.message,
          });
          console.error(`❌ Failed to send email to ${user.email}:`, emailError.message);
        }
      }
    }

    res.status(201).json({
      success: true,
      message: `${createdUsers.length} users created successfully. ${emailResults.sent} welcome emails sent.`,
      data: {
        created: createdUsers.length,
        emailsSent: emailResults.sent,
        emailsFailed: emailResults.failed,
        uploadErrors: errors,
        emailErrors: emailResults.errors,
      },
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
    const { eventId, limit = 10 } = req.query;

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
    const { eventId, limit = 10 } = req.query;

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
    const { eventId, limit = 10 } = req.query;

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
    const { eventId } = req.query;

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
    const { eventId } = req.query;

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

/**
 * @desc    Refresh all stall statistics
 * @route   POST /api/admin/stalls/refresh-stats
 * @access  Private (Admin)
 */
exports.refreshAllStallStats = async (req, res, next) => {
  try {
    const { sequelize } = require('../config/database');
    
    console.log('[Admin] Refreshing all stall stats...');
    
    // Get all stalls
    const stalls = await Stall.findAll();
    console.log(`[Admin] Found ${stalls.length} stalls to update`);
    
    let updatedCount = 0;
    
    // Update each stall's stats
    for (const stall of stalls) {
      // Calculate feedback stats using Sequelize aggregation
      const feedbackStats = await Feedback.findAll({
        where: { stallId: stall.id },
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalFeedbacks'],
          [sequelize.fn('AVG', sequelize.col('rating')), 'averageRating'],
        ],
        raw: true,
      });
      
      if (feedbackStats.length > 0 && feedbackStats[0].totalFeedbacks > 0) {
        const totalFeedbacks = parseInt(feedbackStats[0].totalFeedbacks);
        const averageRating = parseFloat(feedbackStats[0].averageRating);
        
        // Update stall stats
        await stall.update({
          stats: {
            ...stall.stats,
            totalFeedbacks: totalFeedbacks,
            averageRating: Math.round(averageRating * 10) / 10,
          },
        });
        
        updatedCount++;
        console.log(`[Admin] Updated ${stall.name}: ${totalFeedbacks} feedbacks, ${Math.round(averageRating * 10) / 10} avg rating`);
      } else {
        // Reset to 0 if no feedbacks
        if (stall.stats?.totalFeedbacks !== 0 || stall.stats?.averageRating !== 0) {
          await stall.update({
            stats: {
              ...stall.stats,
              totalFeedbacks: 0,
              averageRating: 0,
            },
          });
          console.log(`[Admin] Reset ${stall.name}: 0 feedbacks`);
        }
      }
    }
    
    console.log(`[Admin] Stats refresh complete. Updated ${updatedCount} stalls.`);
    
    res.status(200).json({
      success: true,
      message: `Successfully refreshed stats for ${updatedCount} stalls`,
      data: {
        totalStalls: stalls.length,
        updatedStalls: updatedCount,
      },
    });
  } catch (error) {
    console.error('[Admin] Error refreshing stall stats:', error);
    next(error);
  }
};
