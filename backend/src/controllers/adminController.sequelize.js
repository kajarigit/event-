const { Event, Stall, User, Attendance, Feedback, Vote, ScanLog, sequelize } = require('../models/index.sequelize');
const { generateStallQR } = require('../utils/jwt');
const { sendCredentialsEmail, sendBulkCredentialsEmails } = require('../services/emailService');
const { generateRandomPassword } = require('../utils/passwordGenerator');
const { sendWelcomeEmail, sendStallQRCode, sendStallOwnerCredentials } = require('../utils/emailService');
const { normalizeDepartment, normalizeString, normalizeEmail } = require('../utils/normalization');
const QRCode = require('qrcode');
const Papa = require('papaparse');
const fs = require('fs').promises;
const { Op } = require('sequelize');
const { QueryTypes } = require('sequelize');
const crypto = require('crypto');

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

    // Generate a secure random password for stall owner dashboard
    const password = crypto.randomBytes(4).toString('hex'); // 8 character random password

    // Store password in stall (you may want to add a password field to Stall model)
    // For now, we'll use ownerContact as password field or add a new field
    stall.ownerPassword = password; // Store hashed in production
    await stall.save();

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

    // Send credentials and QR code email if ownerEmail is provided
    if (stall.ownerEmail && qrData) {
      try {
        // Get event details
        const event = await Event.findByPk(stall.eventId);
        
        // Generate QR code as data URL using qrData (not token)
        const qrCodeDataURL = await QRCode.toDataURL(qrData, {
          width: 400,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        // Send comprehensive email with credentials and QR code
        await sendStallOwnerCredentials(stall, qrCodeDataURL, event, password);
        console.log(`✅ Stall owner credentials and QR sent to ${stall.ownerEmail}`);
      } catch (emailError) {
        console.error(`❌ Failed to send stall credentials email:`, emailError.message);
        // Continue even if email fails
      }
    }

    res.status(201).json({
      success: true,
      message: stall.ownerEmail 
        ? 'Stall created successfully. Login credentials and QR code have been sent to the owner\'s email.' 
        : 'Stall created successfully.',
      data: {
        ...stall.toJSON(),
        // Include password in response for admin (remove in production or use different endpoint)
        temporaryPassword: password,
        dashboardLoginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/stall-owner/login`,
        loginInstructions: {
          username: stall.id,
          password: password,
          note: 'These credentials have been sent to the owner\'s email'
        }
      },
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
    // - token: JWT for database storage (for verification)
    // - qrData: JSON string that goes INTO the QR code (what scanner reads)
    // - qrImage: base64 PNG image (for display only)
    
    const jwtToken = qrResult.token;  // JWT for database
    const qrDataString = qrResult.qrData; // JSON string for QR code
    const qrImage = qrResult.qrImage; // Base64 PNG image
    
    // Save JWT to database for later verification
    await stall.update({ qrToken: jwtToken });

    res.status(200).json({
      success: true,
      data: {
        stallId: stall.id,
        stallName: stall.name,
        qrCode: qrImage,      // Base64 PNG image (if frontend wants to display it directly)
        qrToken: qrDataString, // JSON string to encode in QR (what frontend should use!)
        qrImage: qrImage,      // Also include as qrImage for clarity
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
    const stallPasswords = new Map(); // Store stall ID -> password mapping

    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      try {
        if (!row.name || !row.eventId) {
          errors.push({ row: i + 1, error: 'Name and EventId are required' });
          continue;
        }

        // Generate password for stall owner dashboard access
        const ownerPassword = row.ownerPassword || crypto.randomBytes(4).toString('hex'); // 8 character random password

        const stallData = {
          eventId: row.eventId,
          name: normalizeString(row.name),
          description: normalizeString(row.description) || null,
          location: normalizeString(row.location) || null,
          category: normalizeString(row.category) || null,
          ownerName: normalizeString(row.ownerName) || null,
          ownerContact: normalizeString(row.ownerContact) || null,
          ownerEmail: normalizeEmail(row.ownerEmail) || null,
          ownerPassword: ownerPassword, // Store password for stall owner login
          department: normalizeDepartment(row.department), // Normalize department
          participants: row.participants ? JSON.parse(row.participants) : [],
          isActive: row.isActive !== 'false',
        };

        stallsToCreate.push(stallData);
        
        // Store password for later email sending (using name as temporary key)
        stallPasswords.set(stallData.name, ownerPassword);
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

          // Get password for this stall
          const password = stallPasswords.get(stall.name) || stall.ownerPassword;
          
          // Send comprehensive email with credentials and QR code
          await sendStallOwnerCredentials(stall, qrCodeDataURL, event, password);
          emailResults.sent++;
          console.log(`✅ Stall owner credentials and QR sent to ${stall.ownerEmail}`);
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

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required',
      });
    }

    // Query to calculate stay time with engagement metrics
    const results = await sequelize.query(
      `
      SELECT 
        u.id,
        u.name,
        u."rollNumber",
        u.department,
        u.email,
        u.phone,
        a."checkInTime",
        a."checkOutTime",
        EXTRACT(EPOCH FROM (a."checkOutTime" - a."checkInTime")) / 3600 as "stayTimeHours",
        EXTRACT(EPOCH FROM (a."checkOutTime" - a."checkInTime")) / 60 as "stayTimeMinutes",
        (SELECT COUNT(*) FROM votes WHERE "studentId" = u.id AND "eventId" = :eventId) as "totalVotes",
        (SELECT COUNT(*) FROM feedbacks WHERE "studentId" = u.id AND "eventId" = :eventId) as "totalFeedbacks"
      FROM attendances a
      INNER JOIN users u ON a."studentId" = u.id
      WHERE a."eventId" = :eventId
        AND a."checkOutTime" IS NOT NULL
        AND u.role = 'student'
      ORDER BY "stayTimeMinutes" DESC
      LIMIT :limit
      `,
      {
        replacements: { eventId, limit: parseInt(limit) },
        type: QueryTypes.SELECT,
      }
    );

    console.log('[Analytics] Top students by stay time:', results.length, 'students');

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('[Analytics] Top students error:', error);
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
    const { eventId, limit = 10, department } = req.query;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required',
      });
    }

    // Build department filter
    const deptFilter = department ? 'AND s.department = :department' : '';

    const results = await sequelize.query(
      `
      SELECT 
        s.id,
        s.name,
        s.department,
        s.category,
        s."ownerName",
        s."ownerContact",
        COUNT(DISTINCT v.id) as "voteCount",
        COUNT(DISTINCT f.id) as "feedbackCount",
        COALESCE(AVG(f.rating), 0) as "avgRating",
        ROUND(COALESCE(AVG(f.rating), 0), 1) as "roundedRating"
      FROM stalls s
      LEFT JOIN votes v ON v."stallId" = s.id AND v."eventId" = :eventId
      LEFT JOIN feedbacks f ON f."stallId" = s.id AND f."eventId" = :eventId
      WHERE s."eventId" = :eventId ${deptFilter}
      GROUP BY s.id, s.name, s.department, s.category, s."ownerName", s."ownerContact"
      ORDER BY "voteCount" DESC, "avgRating" DESC, "feedbackCount" DESC
      LIMIT :limit
      `,
      {
        replacements: { eventId, department, limit: parseInt(limit) },
        type: QueryTypes.SELECT,
      }
    );

    console.log('[Analytics] Top stalls by votes:', results.length, department ? `for ${department}` : 'all departments');

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('[Analytics] Top stalls error:', error);
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

    // Get comprehensive department-wise statistics with attendance percentage
    const results = await sequelize.query(
      `
      SELECT 
        u.department,
        COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END) as "totalStudents",
        COUNT(DISTINCT a."studentId") as "attendedStudents",
        ROUND(
          (COUNT(DISTINCT a."studentId")::decimal / 
          NULLIF(COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END), 0) * 100), 
          2
        ) as "attendancePercentage",
        COUNT(DISTINCT v."studentId") as "studentsWhoVoted",
        COUNT(DISTINCT f."studentId") as "studentsWhoFeedback",
        COUNT(DISTINCT v.id) as "totalVotes",
        COUNT(DISTINCT f.id) as "totalFeedbacks"
      FROM users u
      LEFT JOIN attendances a ON a."studentId" = u.id AND a."eventId" = :eventId
      LEFT JOIN votes v ON v."studentId" = u.id AND v."eventId" = :eventId
      LEFT JOIN feedbacks f ON f."studentId" = u.id AND f."eventId" = :eventId
      WHERE u.role = 'student' AND u.department IS NOT NULL
      GROUP BY u.department
      ORDER BY "attendancePercentage" DESC, "totalStudents" DESC
      `,
      {
        replacements: { eventId },
        type: QueryTypes.SELECT,
      }
    );

    console.log('[Analytics] Department stats calculated:', results.length, 'departments');

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('[Analytics] Department stats error:', error);
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

/**
 * @desc    Export comprehensive analytics as Excel file with multiple sheets
 * @route   GET /api/admin/analytics/export-comprehensive
 * @access  Private (Admin)
 */
exports.exportComprehensiveAnalytics = async (req, res, next) => {
  try {
    const { eventId } = req.query;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required for analytics export',
      });
    }

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();

    // Get event details
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    console.log('[Analytics Export] Generating comprehensive report for:', event.name);

    // ===== SHEET 1: Top 10 Stalls by Department (Voting Prizes) =====
    const topStallsSheet = workbook.addWorksheet('Top 10 Stalls by Department');
    topStallsSheet.columns = [
      { header: 'Rank', key: 'rank', width: 8 },
      { header: 'Department', key: 'department', width: 40 },
      { header: 'Stall Name', key: 'name', width: 35 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Owner Name', key: 'ownerName', width: 25 },
      { header: 'Contact', key: 'ownerContact', width: 15 },
      { header: 'Total Votes', key: 'voteCount', width: 12 },
      { header: 'Total Feedbacks', key: 'feedbackCount', width: 15 },
      { header: 'Avg Rating', key: 'avgRating', width: 12 },
      { header: 'Prize Category', key: 'prize', width: 20 },
    ];

    const departments = await sequelize.query(
      `SELECT DISTINCT department FROM stalls WHERE "eventId" = :eventId AND department IS NOT NULL ORDER BY department`,
      { replacements: { eventId }, type: QueryTypes.SELECT }
    );

    for (const dept of departments) {
      const topStalls = await sequelize.query(
        `
        SELECT 
          s.name,
          s.department,
          s.category,
          s."ownerName",
          s."ownerContact",
          COUNT(DISTINCT v.id) as "voteCount",
          COUNT(DISTINCT f.id) as "feedbackCount",
          COALESCE(ROUND(AVG(f.rating), 1), 0) as "avgRating"
        FROM stalls s
        LEFT JOIN votes v ON v."stallId" = s.id AND v."eventId" = :eventId
        LEFT JOIN feedbacks f ON f."stallId" = s.id AND f."eventId" = :eventId
        WHERE s."eventId" = :eventId AND s.department = :department
        GROUP BY s.id, s.name, s.department, s.category, s."ownerName", s."ownerContact"
        ORDER BY "voteCount" DESC, "avgRating" DESC
        LIMIT 10
        `,
        { replacements: { eventId, department: dept.department }, type: QueryTypes.SELECT }
      );

      topStalls.forEach((stall, index) => {
        const rank = index + 1;
        let prize = '';
        if (rank === 1) prize = '🥇 1st Prize';
        else if (rank === 2) prize = '🥈 2nd Prize';
        else if (rank === 3) prize = '🥉 3rd Prize';
        else if (rank <= 10) prize = `Top ${rank}`;

        topStallsSheet.addRow({
          rank,
          department: stall.department,
          name: stall.name,
          category: stall.category,
          ownerName: stall.ownerName,
          ownerContact: stall.ownerContact,
          voteCount: parseInt(stall.voteCount),
          feedbackCount: parseInt(stall.feedbackCount),
          avgRating: parseFloat(stall.avgRating),
          prize,
        });
      });

      // Add empty row between departments
      topStallsSheet.addRow({});
    }

    // Style header
    topStallsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    topStallsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    topStallsSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // ===== SHEET 2: Top 50 Students by Engagement Time (Engagement Prizes) =====
    const topStudentsSheet = workbook.addWorksheet('Top 50 Students by Engagement');
    topStudentsSheet.columns = [
      { header: 'Rank', key: 'rank', width: 8 },
      { header: 'Student Name', key: 'name', width: 30 },
      { header: 'Roll Number', key: 'rollNumber', width: 15 },
      { header: 'Department', key: 'department', width: 40 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Check-In Time', key: 'checkInTime', width: 20 },
      { header: 'Check-Out Time', key: 'checkOutTime', width: 20 },
      { header: 'Stay (Hours)', key: 'stayTimeHours', width: 15 },
      { header: 'Stay (Minutes)', key: 'stayTimeMinutes', width: 15 },
      { header: 'Votes Given', key: 'totalVotes', width: 12 },
      { header: 'Feedbacks Given', key: 'totalFeedbacks', width: 15 },
      { header: 'Engagement Score', key: 'engagementScore', width: 18 },
      { header: 'Prize Category', key: 'prize', width: 20 },
    ];

    const topStudents = await sequelize.query(
      `
      SELECT 
        u.id,
        u.name,
        u."rollNumber",
        u.department,
        u.email,
        u.phone,
        a."checkInTime",
        a."checkOutTime",
        EXTRACT(EPOCH FROM (a."checkOutTime" - a."checkInTime")) / 3600 as "stayTimeHours",
        EXTRACT(EPOCH FROM (a."checkOutTime" - a."checkInTime")) / 60 as "stayTimeMinutes",
        (SELECT COUNT(*) FROM votes WHERE "studentId" = u.id AND "eventId" = :eventId) as "totalVotes",
        (SELECT COUNT(*) FROM feedbacks WHERE "studentId" = u.id AND "eventId" = :eventId) as "totalFeedbacks"
      FROM attendances a
      INNER JOIN users u ON a."studentId" = u.id
      WHERE a."eventId" = :eventId
        AND a."checkOutTime" IS NOT NULL
        AND u.role = 'student'
      ORDER BY "stayTimeMinutes" DESC
      LIMIT 50
      `,
      { replacements: { eventId }, type: QueryTypes.SELECT }
    );

    topStudents.forEach((student, index) => {
      const rank = index + 1;
      const engagementScore = Math.round(
        parseFloat(student.stayTimeHours) * 10 +
        parseInt(student.totalVotes) * 5 +
        parseInt(student.totalFeedbacks) * 3
      );

      let prize = '';
      if (rank === 1) prize = '🥇 1st Prize';
      else if (rank === 2) prize = '🥈 2nd Prize';
      else if (rank === 3) prize = '🥉 3rd Prize';
      else if (rank <= 10) prize = `Top ${rank}`;

      topStudentsSheet.addRow({
        rank,
        name: student.name,
        rollNumber: student.rollNumber,
        department: student.department,
        email: student.email,
        phone: student.phone,
        checkInTime: new Date(student.checkInTime).toLocaleString(),
        checkOutTime: new Date(student.checkOutTime).toLocaleString(),
        stayTimeHours: parseFloat(student.stayTimeHours).toFixed(2),
        stayTimeMinutes: Math.round(parseFloat(student.stayTimeMinutes)),
        totalVotes: parseInt(student.totalVotes),
        totalFeedbacks: parseInt(student.totalFeedbacks),
        engagementScore,
        prize,
      });
    });

    topStudentsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    topStudentsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' }
    };
    topStudentsSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // ===== SHEET 3: Department-wise Attendance Statistics (Prize Distribution Proof) =====
    const deptStatsSheet = workbook.addWorksheet('Department Attendance Stats');
    deptStatsSheet.columns = [
      { header: 'Department', key: 'department', width: 45 },
      { header: 'Total Students', key: 'totalStudents', width: 15 },
      { header: 'Students Attended', key: 'attendedStudents', width: 18 },
      { header: 'Attendance %', key: 'attendancePercentage', width: 15 },
      { header: 'Students Voted', key: 'studentsWhoVoted', width: 18 },
      { header: 'Students Feedback', key: 'studentsWhoFeedback', width: 20 },
      { header: 'Total Votes', key: 'totalVotes', width: 12 },
      { header: 'Total Feedbacks', key: 'totalFeedbacks', width: 15 },
      { header: 'Engagement Rank', key: 'rank', width: 15 },
    ];

    const deptStats = await sequelize.query(
      `
      SELECT 
        u.department,
        COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END) as "totalStudents",
        COUNT(DISTINCT a."studentId") as "attendedStudents",
        ROUND(
          (COUNT(DISTINCT a."studentId")::decimal / 
          NULLIF(COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END), 0) * 100), 
          2
        ) as "attendancePercentage",
        COUNT(DISTINCT v."studentId") as "studentsWhoVoted",
        COUNT(DISTINCT f."studentId") as "studentsWhoFeedback",
        COUNT(DISTINCT v.id) as "totalVotes",
        COUNT(DISTINCT f.id) as "totalFeedbacks"
      FROM users u
      LEFT JOIN attendances a ON a."studentId" = u.id AND a."eventId" = :eventId
      LEFT JOIN votes v ON v."studentId" = u.id AND v."eventId" = :eventId
      LEFT JOIN feedbacks f ON f."studentId" = u.id AND f."eventId" = :eventId
      WHERE u.role = 'student' AND u.department IS NOT NULL
      GROUP BY u.department
      ORDER BY "attendancePercentage" DESC, "totalStudents" DESC
      `,
      { replacements: { eventId }, type: QueryTypes.SELECT }
    );

    deptStats.forEach((dept, index) => {
      deptStatsSheet.addRow({
        department: dept.department,
        totalStudents: parseInt(dept.totalStudents),
        attendedStudents: parseInt(dept.attendedStudents),
        attendancePercentage: parseFloat(dept.attendancePercentage).toFixed(2) + '%',
        studentsWhoVoted: parseInt(dept.studentsWhoVoted),
        studentsWhoFeedback: parseInt(dept.studentsWhoFeedback),
        totalVotes: parseInt(dept.totalVotes),
        totalFeedbacks: parseInt(dept.totalFeedbacks),
        rank: index + 1,
      });
    });

    deptStatsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    deptStatsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFC000' }
    };
    deptStatsSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // ===== SHEET 4: All Votes Detail (Complete Proof) =====
    const votesSheet = workbook.addWorksheet('All Votes Detail');
    votesSheet.columns = [
      { header: '#', key: 'sno', width: 8 },
      { header: 'Vote ID', key: 'id', width: 40 },
      { header: 'Student Name', key: 'studentName', width: 30 },
      { header: 'Roll Number', key: 'rollNumber', width: 15 },
      { header: 'Student Dept', key: 'studentDept', width: 40 },
      { header: 'Stall Name', key: 'stallName', width: 35 },
      { header: 'Stall Dept', key: 'stallDepartment', width: 40 },
      { header: 'Voted At', key: 'createdAt', width: 20 },
    ];

    const votes = await Vote.findAll({
      where: { eventId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['name', 'rollNumber', 'department'],
        },
        {
          model: Stall,
          as: 'stall',
          attributes: ['name', 'department'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    votes.forEach((vote, index) => {
      votesSheet.addRow({
        sno: index + 1,
        id: vote.id,
        studentName: vote.student?.name || 'Unknown',
        rollNumber: vote.student?.rollNumber || 'N/A',
        studentDept: vote.student?.department || 'N/A',
        stallName: vote.stall?.name || 'Unknown',
        stallDepartment: vote.stall?.department || 'N/A',
        createdAt: new Date(vote.createdAt).toLocaleString(),
      });
    });

    votesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    votesSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFED7D31' }
    };
    votesSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // ===== SHEET 5: All Feedbacks Detail (Complete Proof) =====
    const feedbacksSheet = workbook.addWorksheet('All Feedbacks Detail');
    feedbacksSheet.columns = [
      { header: '#', key: 'sno', width: 8 },
      { header: 'Feedback ID', key: 'id', width: 40 },
      { header: 'Student Name', key: 'studentName', width: 30 },
      { header: 'Roll Number', key: 'rollNumber', width: 15 },
      { header: 'Student Dept', key: 'studentDept', width: 40 },
      { header: 'Stall Name', key: 'stallName', width: 35 },
      { header: 'Stall Dept', key: 'stallDept', width: 40 },
      { header: 'Rating (1-5)', key: 'rating', width: 12 },
      { header: 'Comment', key: 'comment', width: 60 },
      { header: 'Submitted At', key: 'createdAt', width: 20 },
    ];

    const feedbacks = await Feedback.findAll({
      where: { eventId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['name', 'rollNumber', 'department'],
        },
        {
          model: Stall,
          as: 'stall',
          attributes: ['name', 'department'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    feedbacks.forEach((feedback, index) => {
      feedbacksSheet.addRow({
        sno: index + 1,
        id: feedback.id,
        studentName: feedback.student?.name || 'Unknown',
        rollNumber: feedback.student?.rollNumber || 'N/A',
        studentDept: feedback.student?.department || 'N/A',
        stallName: feedback.stall?.name || 'Unknown',
        stallDept: feedback.stall?.department || 'N/A',
        rating: feedback.rating,
        comment: feedback.comments || 'No comment',
        createdAt: new Date(feedback.createdAt).toLocaleString(),
      });
    });

    feedbacksSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    feedbacksSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF5B9BD5' }
    };
    feedbacksSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // ===== SHEET 6: All Attendances Detail (Complete Proof) =====
    const attendancesSheet = workbook.addWorksheet('All Attendances Detail');
    attendancesSheet.columns = [
      { header: '#', key: 'sno', width: 8 },
      { header: 'Student Name', key: 'studentName', width: 30 },
      { header: 'Roll Number', key: 'rollNumber', width: 15 },
      { header: 'Department', key: 'department', width: 40 },
      { header: 'Check-In', key: 'checkInTime', width: 20 },
      { header: 'Check-Out', key: 'checkOutTime', width: 20 },
      { header: 'Duration (Minutes)', key: 'duration', width: 18 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    const attendances = await Attendance.findAll({
      where: { eventId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['name', 'rollNumber', 'department'],
        },
      ],
      order: [['checkInTime', 'DESC']],
    });

    attendances.forEach((attendance, index) => {
      let duration = 0;
      if (attendance.checkOutTime && attendance.checkInTime) {
        duration = Math.round((new Date(attendance.checkOutTime) - new Date(attendance.checkInTime)) / 60000);
      }

      attendancesSheet.addRow({
        sno: index + 1,
        studentName: attendance.student?.name || 'Unknown',
        rollNumber: attendance.student?.rollNumber || 'N/A',
        department: attendance.student?.department || 'N/A',
        checkInTime: new Date(attendance.checkInTime).toLocaleString(),
        checkOutTime: attendance.checkOutTime ? new Date(attendance.checkOutTime).toLocaleString() : 'Still Checked In',
        duration: duration > 0 ? duration : 'N/A',
        status: attendance.status,
      });
    });

    attendancesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    attendancesSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF9E480E' }
    };
    attendancesSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // ===== SHEET 7: Event Summary =====
    const summarySheet = workbook.addWorksheet('Event Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 40 },
      { header: 'Value', key: 'value', width: 20 },
    ];

    const [summary] = await sequelize.query(
      `
      SELECT 
        (SELECT COUNT(*) FROM stalls WHERE "eventId" = :eventId) as "totalStalls",
        (SELECT COUNT(DISTINCT "studentId") FROM attendances WHERE "eventId" = :eventId) as "totalAttendees",
        (SELECT COUNT(*) FROM votes WHERE "eventId" = :eventId) as "totalVotes",
        (SELECT COUNT(*) FROM feedbacks WHERE "eventId" = :eventId) as "totalFeedbacks",
        (SELECT COUNT(*) FROM attendances WHERE "eventId" = :eventId AND status = 'checked-in') as "currentlyCheckedIn"
      `,
      { replacements: { eventId }, type: QueryTypes.SELECT }
    );

    const summaryData = [
      { metric: 'Event Name', value: event.name },
      { metric: 'Event Date', value: new Date(event.startDate).toLocaleDateString() },
      { metric: 'Total Stalls', value: summary.totalStalls },
      { metric: 'Total Students Attended', value: summary.totalAttendees },
      { metric: 'Total Votes Cast', value: summary.totalVotes },
      { metric: 'Total Feedbacks Submitted', value: summary.totalFeedbacks },
      { metric: 'Currently Checked In', value: summary.currentlyCheckedIn },
      { metric: 'Report Generated On', value: new Date().toLocaleString() },
    ];

    summaryData.forEach(item => {
      summarySheet.addRow(item);
    });

    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF203764' }
    };
    summarySheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Make summary values bold
    for (let i = 2; i <= summarySheet.rowCount; i++) {
      summarySheet.getRow(i).getCell('metric').font = { bold: true };
    }

    // Set response headers for Excel download
    const filename = `Event_Analytics_${event.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

    console.log('[Analytics Export] ✅ Comprehensive Excel report generated:', filename);
    console.log('[Analytics Export] Sheets:', workbook.worksheets.map(ws => ws.name).join(', '));
  } catch (error) {
    console.error('[Analytics Export] Error generating report:', error);
    next(error);
  }
};
