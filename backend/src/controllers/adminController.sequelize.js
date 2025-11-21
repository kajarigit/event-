const { Event, Stall, User, Volunteer, Attendance, StudentEventAttendanceSummary, Feedback, Vote, ScanLog, sequelize } = require('../models/index.sequelize');
const { generateStallQR } = require('../utils/jwt');
const { sendCredentialsEmail, sendBulkCredentialsEmails } = require('../services/emailService');
const { generateRandomPassword } = require('../utils/passwordGenerator');
const { sendWelcomeEmail, sendStallQRCode, sendStallOwnerCredentials } = require('../utils/emailService');
const { normalizeDepartment, normalizeString, normalizeEmail } = require('../utils/normalization');
const volunteerCredentialsCache = require('../utils/volunteerCredentialsCache');
const QRCode = require('qrcode');
const Papa = require('papaparse');
const fs = require('fs').promises;
const { Op } = require('sequelize');
const { QueryTypes } = require('sequelize');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

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

    const transaction = await sequelize.transaction();
    
    try {
      // Find all students who are currently checked in
      const checkedInAttendances = await Attendance.findAll({
        where: {
          eventId: req.params.id,
          status: 'checked-in'
        },
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'name', 'email', 'regNo']
          }
        ],
        transaction
      });

      const eventStopTime = new Date();
      let autoCheckoutCount = 0;
      let totalNullifiedDuration = 0;

      // Process each checked-in student
      for (const attendance of checkedInAttendances) {
        // Calculate the duration that would be nullified
        const checkInTime = new Date(attendance.checkInTime);
        const nullifiedDurationMs = eventStopTime - checkInTime;
        const nullifiedDurationSeconds = Math.floor(nullifiedDurationMs / 1000);
        
        // Update the attendance record with auto-checkout and nullification
        await attendance.update({
          status: 'auto-checkout',
          checkOutTime: eventStopTime,
          isNullified: true,
          nullifiedDuration: nullifiedDurationSeconds,
          nullifiedReason: 'Event stopped - auto checkout due to improper checkout',
          eventStopTime: eventStopTime
        }, { transaction });

        // Update or create attendance summary
        const [summary, created] = await StudentEventAttendanceSummary.findOrCreate({
          where: {
            eventId: req.params.id,
            studentId: attendance.studentId
          },
          defaults: {
            totalValidDuration: 0,
            totalNullifiedDuration: nullifiedDurationSeconds,
            totalSessions: 1,
            nullifiedSessions: 1,
            lastCheckInTime: checkInTime,
            currentStatus: 'checked-out',
            hasImproperCheckouts: true,
            lastActivityDate: new Date().toISOString().split('T')[0]
          },
          transaction
        });

        if (!created) {
          await summary.update({
            totalNullifiedDuration: summary.totalNullifiedDuration + nullifiedDurationSeconds,
            nullifiedSessions: summary.nullifiedSessions + 1,
            currentStatus: 'checked-out',
            hasImproperCheckouts: true,
            lastActivityDate: new Date().toISOString().split('T')[0]
          }, { transaction });
        }

        autoCheckoutCount++;
        totalNullifiedDuration += nullifiedDurationSeconds;

        console.log(`🚨 Auto-checkout: ${attendance.student.name} (${attendance.student.regNo}) - Nullified ${Math.floor(nullifiedDurationSeconds/60)} minutes`);
      }

      // Update the event
      await event.update({
        manuallyEnded: true,
        isActive: false
      }, { transaction });

      await transaction.commit();

      // Log the results
      console.log(`✅ Event "${event.name}" ended manually`);
      console.log(`📊 Auto-checkout summary:`);
      console.log(`   - Students auto-checked-out: ${autoCheckoutCount}`);
      console.log(`   - Total nullified time: ${Math.floor(totalNullifiedDuration/60)} minutes`);

      res.status(200).json({
        success: true,
        message: 'Event ended manually',
        data: event,
        autoCheckoutSummary: {
          studentsAutoCheckedOut: autoCheckoutCount,
          totalNullifiedDurationMinutes: Math.floor(totalNullifiedDuration/60),
          affectedStudents: checkedInAttendances.map(att => ({
            studentId: att.studentId,
            studentName: att.student.name,
            regNo: att.student.regNo,
            nullifiedMinutes: Math.floor(att.nullifiedDuration/60)
          }))
        }
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Restart an event (clear manual end status)
 * @route   PATCH /api/admin/events/:id/restart
 * @access  Private (Admin)
 */
exports.restartEvent = async (req, res, next) => {
  try {
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Only allow restarting if event was manually ended
    if (!event.manuallyEnded) {
      return res.status(400).json({
        success: false,
        message: 'Event must be manually ended before it can be restarted',
      });
    }

    await event.update({
      manuallyEnded: false,
      manuallyStarted: true,
      isActive: true
    });

    console.log(`🔄 Event "${event.name}" has been restarted`);

    res.status(200).json({
      success: true,
      message: 'Event restarted successfully',
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get attendance summaries with nullification details
 * @route   GET /api/admin/events/:id/attendance-summary
 * @access  Private (Admin)
 */
exports.getEventAttendanceSummary = async (req, res, next) => {
  try {
    const { id: eventId } = req.params;
    const { 
      page = 1, 
      limit = 50, 
      search = '',
      showOnlyProblematic = false 
    } = req.query;

    const offset = (page - 1) * limit;
    const searchCondition = search ? {
      [Op.or]: [
        { '$student.name$': { [Op.iLike]: `%${search}%` } },
        { '$student.regNo$': { [Op.iLike]: `%${search}%` } },
        { '$student.email$': { [Op.iLike]: `%${search}%` } }
      ]
    } : {};

    const whereCondition = {
      eventId,
      ...searchCondition,
      ...(showOnlyProblematic === 'true' && { hasImproperCheckouts: true })
    };

    const summaries = await StudentEventAttendanceSummary.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'regNo', 'department']
        },
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name', 'startDate', 'endDate']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [
        ['hasImproperCheckouts', 'DESC'],
        ['totalValidDuration', 'DESC'],
        ['totalNullifiedDuration', 'DESC']
      ]
    });

    // Get detailed attendance records for problematic cases
    const summariesWithDetails = await Promise.all(
      summaries.rows.map(async (summary) => {
        const summaryData = summary.toJSON();
        
        if (summary.hasImproperCheckouts) {
          // Get nullified attendance records
          const nullifiedSessions = await Attendance.findAll({
            where: {
              eventId,
              studentId: summary.studentId,
              isNullified: true
            },
            attributes: ['checkInTime', 'eventStopTime', 'nullifiedDuration', 'nullifiedReason'],
            order: [['checkInTime', 'DESC']]
          });
          
          summaryData.nullifiedSessionDetails = nullifiedSessions;
        }
        
        // Convert seconds to readable format
        summaryData.totalValidDurationFormatted = formatDuration(summary.totalValidDuration);
        summaryData.totalNullifiedDurationFormatted = formatDuration(summary.totalNullifiedDuration);
        summaryData.totalCombinedDurationFormatted = formatDuration(
          summary.totalValidDuration + summary.totalNullifiedDuration
        );
        
        return summaryData;
      })
    );

    res.status(200).json({
      success: true,
      data: {
        summaries: summariesWithDetails,
        pagination: {
          total: summaries.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(summaries.count / limit)
        },
        statistics: {
          totalStudents: summaries.count,
          studentsWithProblems: summariesWithDetails.filter(s => s.hasImproperCheckouts).length,
          totalValidHours: Math.floor(
            summariesWithDetails.reduce((sum, s) => sum + s.totalValidDuration, 0) / 3600
          ),
          totalNullifiedHours: Math.floor(
            summariesWithDetails.reduce((sum, s) => sum + s.totalNullifiedDuration, 0) / 3600
          )
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to format duration
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

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

    // Convert stalls to admin JSON format (includes plain text passwords)
    const adminStalls = stalls.map(stall => stall.toAdminJSON());

    res.status(200).json({
      success: true,
      count: stalls.length,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
      data: adminStalls,
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
    
    // Store plain password - Sequelize hooks will hash it automatically
    stall.ownerPassword = password;
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
          ownerPassword: ownerPassword, // Store plain password - Sequelize hooks will hash it
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
        const role = row.role || 'student';
        
        // Validate that this is not a volunteer (volunteers have separate table now)
        if (role === 'volunteer') {
          errors.push({ row: i + 1, error: 'Volunteers must be uploaded using the volunteers bulk upload endpoint' });
          continue;
        }
        
        // Role-based validation
        if (!row.name) {
          errors.push({ row: i + 1, error: 'Name is required' });
          continue;
        }
        
        if (role === 'admin' || role === 'stall_owner') {
          if (!row.email) {
            errors.push({ row: i + 1, error: `Email is required for ${role}` });
            continue;
          }
        } else if (role === 'student') {
          if (!row.regNo && !row.uid) {
            errors.push({ row: i + 1, error: 'Registration number (regNo or uid) is required for students' });
            continue;
          }
        }

        // Generate passwords
        let password;
        
        if (role === 'student') {
          password = 'student123';
        } else {
          password = row.password || generateRandomPassword(10);
        }
        
        // Store credentials info
        const credentialKey = row.email || row.regNo || row.uid;
        credentialsMap.set(credentialKey, {
          email: normalizeEmail(row.email) || null,
          name: normalizeString(row.name),
          password: password,
          role: role,
          regNo: normalizeString(row.regNo || row.uid) || null,
          uid: normalizeString(row.uid) || null,
        });

        usersToCreate.push({
          name: normalizeString(row.name),
          email: normalizeEmail(row.email) || null,
          password: password, // Will be hashed by model hook
          role: role,
          phone: normalizeString(row.phone) || null,
          regNo: normalizeString(row.regNo || row.uid) || null,
          faculty: normalizeString(row.faculty) || null,
          department: normalizeDepartment(row.department), // Normalize department
          programme: normalizeString(row.programme) || null,
          year: row.year || null,
          isActive: row.isActive !== 'false',
          birthDate: row.birthDate || null,
          permanentAddressPinCode: row.permanentAddressPinCode || null,
        });
      } catch (error) {
        errors.push({ row: i + 1, error: error.message });
      }
    }

    const createdUsers = await User.bulkCreate(usersToCreate, {
      validate: true,
      individualHooks: true, // This will trigger password hashing
    });

    // Send welcome emails to created users (excluding students by default)
    const emailResults = {
      sent: 0,
      failed: 0,
      errors: [],
    };

    for (const user of createdUsers) {
      const credentials = credentialsMap.get(user.email || user.regNo);
      
      if (credentials && user.role !== 'student' && user.email) {
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
      } else if (user.role === 'student') {
        console.log(`📚 Student ${user.regNo} created with default password - no email sent`);
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
 * BULK UPLOAD VOLUNTEERS
 */
exports.bulkUploadVolunteers = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is required',
      });
    }

    const csvData = await fs.readFile(req.file.path, 'utf-8');
    const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });

    const volunteersToCreate = [];
    const errors = [];
    const credentialsMap = new Map(); // Store volunteerId -> password mapping

    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      try {
        // Validate required fields
        if (!row.name) {
          errors.push({ row: i + 1, error: 'Name is required' });
          continue;
        }
        
        if (!row.volunteerId) {
          errors.push({ row: i + 1, error: 'Volunteer ID is required for volunteers' });
          continue;
        }

        // Generate password
        const password = row.password || 'volunteer123';
        
        // Parse permissions if provided
        let permissions = {
          canScanQR: true,
          canManageAttendance: true,
          canViewReports: false
        };
        
        if (row.permissions) {
          try {
            permissions = { ...permissions, ...JSON.parse(row.permissions) };
          } catch (err) {
            console.warn(`Invalid permissions JSON for volunteer ${row.volunteerId}, using defaults`);
          }
        }
        
        // Parse assigned events if provided
        let assignedEvents = [];
        if (row.assignedEvents) {
          try {
            assignedEvents = JSON.parse(row.assignedEvents);
          } catch (err) {
            // If JSON parsing fails, try comma-separated values
            assignedEvents = row.assignedEvents.split(',').map(id => id.trim()).filter(id => id);
          }
        }
        
        // Store credentials info
        credentialsMap.set(row.volunteerId, {
          email: normalizeEmail(row.email) || null,
          name: normalizeString(row.name),
          password: password,
          volunteerId: normalizeString(row.volunteerId),
        });

        volunteersToCreate.push({
          name: normalizeString(row.name),
          email: normalizeEmail(row.email) || null,
          password: password, // Will be hashed by model hook
          phone: normalizeString(row.phone) || null,
          volunteerId: normalizeString(row.volunteerId),
          faculty: normalizeString(row.faculty) || null,
          department: normalizeDepartment(row.department) || null,
          programme: normalizeString(row.programme) || null,
          year: row.year ? parseInt(row.year) : null,
          permissions: permissions,
          assignedEvents: assignedEvents,
          shiftStart: row.shiftStart || null,
          shiftEnd: row.shiftEnd || null,
          joinDate: row.joinDate || new Date().toISOString().split('T')[0],
          notes: normalizeString(row.notes) || null,
          isActive: row.isActive !== 'false',
        });
      } catch (error) {
        errors.push({ row: i + 1, error: error.message });
      }
    }

    const createdVolunteers = await Volunteer.bulkCreate(volunteersToCreate, {
      validate: true,
      individualHooks: true, // This will trigger password hashing
    });

    // Store volunteer credentials and send emails
    const emailResults = {
      sent: 0,
      failed: 0,
      errors: [],
    };

    for (const volunteer of createdVolunteers) {
      const credentials = credentialsMap.get(volunteer.volunteerId);
      
      // Store volunteer credentials in cache for download
      if (credentials) {
        volunteerCredentialsCache.storeVolunteerCredentials(volunteer.volunteerId, {
          volunteerId: volunteer.volunteerId,
          name: volunteer.name,
          password: credentials.password,
          department: volunteer.department,
          phone: volunteer.phone,
          email: volunteer.email
        });
        console.log(`👥 Volunteer ${volunteer.volunteerId} created - credentials stored for download`);
      }

      // Send welcome email if email is provided
      if (volunteer.email && credentials) {
        try {
          await sendWelcomeEmail(volunteer, credentials.password, 'volunteer');
          emailResults.sent++;
          console.log(`✅ Welcome email sent to ${volunteer.email}`);
        } catch (emailError) {
          emailResults.failed++;
          emailResults.errors.push({
            email: volunteer.email,
            error: emailError.message,
          });
          console.error(`❌ Failed to send email to ${volunteer.email}:`, emailError.message);
        }
      } else {
        console.log(`👥 Volunteer ${volunteer.volunteerId} created without email - credentials available for download`);
      }
    }

    res.status(201).json({
      success: true,
      message: `${createdVolunteers.length} volunteers created successfully. ${emailResults.sent} welcome emails sent. Credentials available for download.`,
      data: {
        created: createdVolunteers.length,
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
 * DIAGNOSTICS - Simple data check
 */
exports.getAnalyticsDiagnostics = async (req, res, next) => {
  try {
    const { eventId = 1 } = req.query;
    
    console.log('[Diagnostics] Checking data for eventId:', eventId);
    
    // Simple counts without associations to avoid errors
    const [attendanceCount, feedbackCount, voteCount, stallCount, userCount] = await Promise.all([
      Attendance.count({ where: { eventId } }),
      Feedback.count({ where: { eventId } }),
      Vote.count({ where: { eventId } }),
      Stall.count({ where: { eventId } }),
      User.count({ where: { role: 'student' } })
    ]);

    // Get sample data
    const sampleAttendance = await Attendance.findOne({ 
      where: { eventId },
      attributes: ['id', 'studentId', 'eventId', 'checkInTime', 'checkOutTime'],
      limit: 1
    });

    res.status(200).json({
      success: true,
      data: {
        eventId,
        counts: {
          attendances: attendanceCount,
          feedbacks: feedbackCount,
          votes: voteCount,
          stalls: stallCount,
          students: userCount
        },
        sampleAttendance,
        diagnosis: attendanceCount > 0 ? 'Data exists - check associations' : 'No attendance data for this event'
      }
    });
  } catch (error) {
    console.error('[Diagnostics] Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Diagnostics failed',
      error: error.message
    });
  }
};

/**
 * REPORTS & ANALYTICS
 */
exports.getDetailedAttendanceAnalytics = async (req, res, next) => {
  try {
    const { eventId, limit = 50 } = req.query;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required',
      });
    }

    console.log('[Analytics] Fetching detailed attendance for eventId:', eventId);

    // Get all attendance records for the event
    const attendances = await Attendance.findAll({
      where: { eventId },
      include: [{
        model: User,
        as: 'student',
        where: { role: 'student' },
        attributes: ['id', 'name', 'rollNumber', 'department', 'email']
      }],
      order: [['checkInTime', 'DESC']]
    });

    console.log('[Analytics] Found attendance records:', attendances.length);

    // Group attendances by student and calculate cumulative time
    const studentAttendanceMap = {};
    
    attendances.forEach(attendance => {
      const studentId = attendance.student.id;
      
      if (!studentAttendanceMap[studentId]) {
        studentAttendanceMap[studentId] = {
          student: attendance.student,
          sessions: [],
          totalTimeMinutes: 0,
          totalSessions: 0,
          isCurrentlyCheckedIn: false
        };
      }

      // Calculate session time
      const checkInTime = new Date(attendance.checkInTime);
      const checkOutTime = attendance.checkOutTime ? new Date(attendance.checkOutTime) : new Date();
      const sessionMinutes = (checkOutTime - checkInTime) / (1000 * 60);
      
      studentAttendanceMap[studentId].sessions.push({
        id: attendance.id,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        status: attendance.checkOutTime ? 'completed' : 'active',
        sessionMinutes: Math.round(sessionMinutes * 100) / 100,
        sessionHours: Math.round((sessionMinutes / 60) * 100) / 100
      });

      studentAttendanceMap[studentId].totalTimeMinutes += sessionMinutes;
      studentAttendanceMap[studentId].totalSessions += 1;
      
      if (!attendance.checkOutTime) {
        studentAttendanceMap[studentId].isCurrentlyCheckedIn = true;
      }
    });

    // Convert to array and sort by total time
    const results = Object.values(studentAttendanceMap)
      .map(studentData => ({
        student: {
          id: studentData.student.id,
          name: studentData.student.name,
          rollNumber: studentData.student.rollNumber,
          department: studentData.student.department,
          email: studentData.student.email
        },
        attendance: {
          totalSessions: studentData.totalSessions,
          totalTimeMinutes: Math.round(studentData.totalTimeMinutes * 100) / 100,
          totalTimeHours: Math.round((studentData.totalTimeMinutes / 60) * 100) / 100,
          averageSessionMinutes: Math.round((studentData.totalTimeMinutes / studentData.totalSessions) * 100) / 100,
          isCurrentlyCheckedIn: studentData.isCurrentlyCheckedIn,
          sessions: studentData.sessions.slice(0, 10) // Limit to last 10 sessions per student
        }
      }))
      .sort((a, b) => b.attendance.totalTimeMinutes - a.attendance.totalTimeMinutes)
      .slice(0, parseInt(limit));

    console.log('[Analytics] Processed students:', results.length);

    res.status(200).json({
      success: true,
      data: results,
      summary: {
        totalStudents: results.length,
        totalAttendanceRecords: attendances.length,
        studentsCurrentlyCheckedIn: results.filter(r => r.attendance.isCurrentlyCheckedIn).length
      }
    });
  } catch (error) {
    console.error('[Analytics] Detailed attendance error:', error.message);
    console.error('[Analytics] Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch detailed attendance analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

exports.getTopStudentsByStayTime = async (req, res, next) => {
  try {
    const { eventId, limit = 10 } = req.query;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required',
      });
    }

    console.log('[Analytics] Fetching top students for eventId:', eventId);

    // Use the detailed attendance analytics and return top students
    const attendances = await Attendance.findAll({
      where: { eventId },
      include: [{
        model: User,
        as: 'student',
        where: { role: 'student' },
        attributes: ['id', 'name', 'rollNumber', 'department', 'email']
      }],
      order: [['checkInTime', 'DESC']]
    });

    if (!attendances || attendances.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'No attendance records found for this event'
      });
    }

    // Group by student and calculate total time
    const studentTimeMap = {};
    
    attendances.forEach(attendance => {
      const studentId = attendance.student.id;
      
      if (!studentTimeMap[studentId]) {
        studentTimeMap[studentId] = {
          student: attendance.student,
          totalMinutes: 0,
          sessions: 0
        };
      }

      const checkInTime = new Date(attendance.checkInTime);
      const checkOutTime = attendance.checkOutTime ? new Date(attendance.checkOutTime) : new Date();
      const minutes = (checkOutTime - checkInTime) / (1000 * 60);
      
      studentTimeMap[studentId].totalMinutes += minutes;
      studentTimeMap[studentId].sessions += 1;
    });

    // Get engagement metrics and format results
    const results = await Promise.all(
      Object.values(studentTimeMap)
        .sort((a, b) => b.totalMinutes - a.totalMinutes)
        .slice(0, parseInt(limit))
        .map(async (data) => {
          const [totalVotes, totalFeedbacks] = await Promise.all([
            Vote.count({ where: { studentId: data.student.id, eventId } }),
            Feedback.count({ where: { studentId: data.student.id, eventId } })
          ]);

          return {
            id: data.student.id,
            name: data.student.name,
            rollNumber: data.student.rollNumber,
            department: data.student.department,
            email: data.student.email,
            stayTimeHours: Math.round((data.totalMinutes / 60) * 100) / 100,
            stayTimeMinutes: Math.round(data.totalMinutes * 100) / 100,
            totalSessions: data.sessions,
            totalVotes,
            totalFeedbacks
          };
        })
    );

    console.log('[Analytics] Top students processed:', results.length);

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('[Analytics] Top students error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top students data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
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

    console.log('[Analytics] Fetching most reviewers for eventId:', eventId);

    // Simplified approach: Get feedbacks and votes separately
    const [feedbacks, votes] = await Promise.all([
      Feedback.findAll({
        where: { eventId },
        include: [{
          model: User,
          as: 'student',
          where: { role: 'student' },
          attributes: ['id', 'name', 'rollNumber', 'department']
        }],
        attributes: ['studentId']
      }),
      Vote.findAll({
        where: { eventId },
        include: [{
          model: User,
          as: 'student',
          where: { role: 'student' },
          attributes: ['id', 'name', 'rollNumber', 'department']
        }],
        attributes: ['studentId']
      })
    ]);

    console.log('[Analytics] Found feedbacks:', feedbacks.length, 'votes:', votes.length);

    // Aggregate by student
    const studentReviewMap = {};

    // Process feedbacks
    feedbacks.forEach(feedback => {
      const student = feedback.student;
      if (!studentReviewMap[student.id]) {
        studentReviewMap[student.id] = {
          student: student,
          feedbackCount: 0,
          voteCount: 0
        };
      }
      studentReviewMap[student.id].feedbackCount++;
    });

    // Process votes
    votes.forEach(vote => {
      const student = vote.student;
      if (!studentReviewMap[student.id]) {
        studentReviewMap[student.id] = {
          student: student,
          feedbackCount: 0,
          voteCount: 0
        };
      }
      studentReviewMap[student.id].voteCount++;
    });

    // Convert to results array
    const results = Object.values(studentReviewMap)
      .map(data => ({
        id: data.student.id,
        name: data.student.name,
        rollNumber: data.student.rollNumber,
        department: data.student.department,
        feedbackCount: data.feedbackCount,
        voteCount: data.voteCount,
        totalReviews: data.feedbackCount + data.voteCount
      }))
      .sort((a, b) => b.totalReviews - a.totalReviews)
      .slice(0, parseInt(limit));

    console.log('[Analytics] Most reviewers processed:', results.length, 'students');

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('[Analytics] Most reviewers error:', error.message);
    console.error('[Analytics] Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch most reviewers data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
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
    const { eventId } = req.query; // Get from query parameters

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required',
      });
    }

    const attendances = await Attendance.findAll({
      where: { eventId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'rollNumber', 'department', 'email'],
        },
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name'],
        },
      ],
      order: [['checkInTime', 'DESC']],
    });

    // Convert to CSV format
    const csvHeader = 'Student ID,Name,Roll Number,Department,Email,Event,Check In Time,Check Out Time,Duration (minutes)\n';
    const csvData = attendances.map(attendance => {
      const checkIn = new Date(attendance.checkInTime);
      const checkOut = attendance.checkOutTime ? new Date(attendance.checkOutTime) : null;
      const duration = checkOut ? Math.round((checkOut - checkIn) / (1000 * 60)) : 'N/A';
      
      return [
        attendance.student.id,
        `"${attendance.student.name}"`,
        attendance.student.rollNumber || 'N/A',
        `"${attendance.student.department || 'N/A'}"`,
        attendance.student.email || 'N/A',
        `"${attendance.event.name}"`,
        checkIn.toISOString(),
        checkOut ? checkOut.toISOString() : 'Still Active',
        duration
      ].join(',');
    }).join('\n');

    const csv = csvHeader + csvData;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance_report.csv"');
    res.send(csv);
  } catch (error) {
    console.error('[Export] Attendance report error:', error);
    next(error);
  }
};

exports.exportFeedbackReport = async (req, res, next) => {
  try {
    const { eventId } = req.query; // Get from query parameters for consistency

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required',
      });
    }

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

    // Convert to CSV format
    const csvHeader = 'Feedback ID,Student ID,Student Name,Roll Number,Stall Name,Category,Rating,Comment,Created At\n';
    const csvData = feedbacks.map(feedback => {
      return [
        feedback.id,
        feedback.student.id,
        `"${feedback.student.name}"`,
        feedback.student.rollNumber || 'N/A',
        `"${feedback.stall.name}"`,
        `"${feedback.stall.category || 'N/A'}"`,
        feedback.rating,
        `"${feedback.comment ? feedback.comment.replace(/"/g, '""') : 'N/A'}"`,
        new Date(feedback.createdAt).toISOString()
      ].join(',');
    }).join('\n');

    const csv = csvHeader + csvData;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="feedback_report.csv"');
    res.send(csv);
  } catch (error) {
    console.error('[Export] Feedback report error:', error);
    next(error);
  }
};

exports.exportVoteReport = async (req, res, next) => {
  try {
    const { eventId } = req.query; // Get from query parameters for consistency

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required',
      });
    }

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

    // Convert to CSV format
    const csvHeader = 'Vote ID,Student ID,Student Name,Roll Number,Stall Name,Category,Created At\n';
    const csvData = votes.map(vote => {
      return [
        vote.id,
        vote.student.id,
        `"${vote.student.name}"`,
        vote.student.rollNumber || 'N/A',
        `"${vote.stall.name}"`,
        `"${vote.stall.category || 'N/A'}"`,
        new Date(vote.createdAt).toISOString()
      ].join(',');
    }).join('\n');

    const csv = csvHeader + csvData;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="vote_report.csv"');
    res.send(csv);
  } catch (error) {
    console.error('[Export] Vote report error:', error);
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

/**
 * @desc    Fix stall owner passwords by hashing plain text ones
 * @route   POST /api/admin/stalls/fix-passwords
 * @access  Private (Admin only)
 */
exports.fixStallPasswords = async (req, res, next) => {
  try {
    console.log('🔐 Starting stall password fix process...');
    
    // Get all stalls with passwords
    const stalls = await Stall.findAll({
      where: {
        ownerPassword: {
          [sequelize.Op.ne]: null // Not null
        }
      },
      attributes: ['id', 'name', 'ownerEmail', 'ownerPassword']
    });

    console.log(`📊 Found ${stalls.length} stalls with passwords`);
    
    if (stalls.length === 0) {
      return res.json({
        success: true,
        message: 'No stalls found with passwords to fix',
        data: { processed: 0, fixed: 0, alreadyHashed: 0, errors: 0 }
      });
    }

    let plainTextCount = 0;
    let alreadyHashedCount = 0;
    let fixedCount = 0;
    let errorCount = 0;
    const results = [];

    console.log('🔍 Analyzing passwords...');

    for (const stall of stalls) {
      try {
        const isAlreadyHashed = stall.ownerPassword.startsWith('$2');
        
        if (isAlreadyHashed) {
          alreadyHashedCount++;
          results.push({
            stallName: stall.name,
            email: stall.ownerEmail,
            status: 'already_hashed'
          });
          console.log(`✅ ${stall.name}: Already hashed`);
        } else {
          plainTextCount++;
          const originalPassword = stall.ownerPassword;
          
          // Hash the plain text password
          const hashedPassword = await bcrypt.hash(stall.ownerPassword, 10);
          
          // Update the stall with hashed password (skip hooks to avoid double hashing)
          await sequelize.query(
            'UPDATE stalls SET "ownerPassword" = :hashedPassword WHERE id = :stallId',
            {
              replacements: { hashedPassword, stallId: stall.id },
              type: sequelize.QueryTypes.UPDATE
            }
          );
          
          fixedCount++;
          results.push({
            stallName: stall.name,
            email: stall.ownerEmail,
            originalPassword: originalPassword, // Include for reference
            status: 'fixed'
          });
          console.log(`🔧 ${stall.name}: Fixed password "${originalPassword}"`);
        }
      } catch (error) {
        errorCount++;
        results.push({
          stallName: stall.name,
          email: stall.ownerEmail,
          status: 'error',
          error: error.message
        });
        console.error(`❌ Error fixing ${stall.name}: ${error.message}`);
      }
    }

    // Summary
    const summary = {
      totalProcessed: stalls.length,
      alreadyHashed: alreadyHashedCount,
      plainTextFound: plainTextCount,
      successfullyFixed: fixedCount,
      errors: errorCount
    };

    console.log('📋 Password Fix Summary:', summary);

    res.json({
      success: true,
      message: `Password fix completed. ${fixedCount} passwords were hashed.`,
      data: {
        summary,
        results
      }
    });

  } catch (error) {
    console.error('❌ Password fix failed:', error.message);
    next(error);
  }
};

// ========================================
// Volunteer CRUD Operations
// ========================================

/**
 * @desc    Get all volunteers
 * @route   GET /api/admin/volunteers
 * @access  Private (Admin only)
 */
exports.getVolunteers = async (req, res, next) => {
  try {
    const volunteers = await Volunteer.findAll({
      where: {
        isActive: true
      },
      attributes: ['id', 'name', 'volunteerId', 'department', 'phone', 'email', 'permissions', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      message: `Found ${volunteers.length} volunteers`,
      data: {
        volunteers: volunteers,
        count: volunteers.length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching volunteers:', error.message);
    next(error);
  }
};

/**
 * @desc    Create a new volunteer
 * @route   POST /api/admin/volunteers
 * @access  Private (Admin only)
 */
exports.createVolunteer = async (req, res, next) => {
  try {
    const { name, volunteerId, department, phone, email, permissions } = req.body;

    // Validate required fields
    if (!name || !volunteerId || !department) {
      return res.status(400).json({
        success: false,
        message: 'Name, volunteerId, and department are required'
      });
    }

    // Check if volunteerId already exists
    const existingVolunteer = await Volunteer.findOne({
      where: { volunteerId }
    });

    if (existingVolunteer) {
      return res.status(400).json({
        success: false,
        message: 'Volunteer ID already exists'
      });
    }

    // Create volunteer
    const volunteer = await Volunteer.create({
      name,
      volunteerId,
      department,
      phone,
      email,
      permissions: permissions || 'basic',
      password: 'volunteer123', // Default password
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Volunteer created successfully',
      data: {
        volunteer: {
          id: volunteer.id,
          name: volunteer.name,
          volunteerId: volunteer.volunteerId,
          department: volunteer.department,
          phone: volunteer.phone,
          email: volunteer.email,
          permissions: volunteer.permissions,
          createdAt: volunteer.createdAt
        }
      }
    });

  } catch (error) {
    console.error('❌ Error creating volunteer:', error.message);
    next(error);
  }
};

/**
 * @desc    Get single volunteer by ID
 * @route   GET /api/admin/volunteers/:id
 * @access  Private (Admin only)
 */
exports.getVolunteer = async (req, res, next) => {
  try {
    const { id } = req.params;

    const volunteer = await Volunteer.findOne({
      where: { 
        id,
        isActive: true
      },
      attributes: ['id', 'name', 'volunteerId', 'department', 'phone', 'email', 'permissions', 'createdAt']
    });

    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer not found'
      });
    }

    res.json({
      success: true,
      message: 'Volunteer found',
      data: {
        volunteer
      }
    });

  } catch (error) {
    console.error('❌ Error fetching volunteer:', error.message);
    next(error);
  }
};

/**
 * @desc    Update volunteer
 * @route   PUT /api/admin/volunteers/:id
 * @access  Private (Admin only)
 */
exports.updateVolunteer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, department, phone, email, permissions } = req.body;

    const volunteer = await Volunteer.findOne({
      where: { 
        id,
        isActive: true
      }
    });

    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer not found'
      });
    }

    // Update volunteer
    await volunteer.update({
      name: name || volunteer.name,
      department: department || volunteer.department,
      phone: phone || volunteer.phone,
      email: email || volunteer.email,
      permissions: permissions || volunteer.permissions
    });

    res.json({
      success: true,
      message: 'Volunteer updated successfully',
      data: {
        volunteer: {
          id: volunteer.id,
          name: volunteer.name,
          volunteerId: volunteer.volunteerId,
          department: volunteer.department,
          phone: volunteer.phone,
          email: volunteer.email,
          permissions: volunteer.permissions,
          updatedAt: volunteer.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('❌ Error updating volunteer:', error.message);
    next(error);
  }
};

/**
 * @desc    Delete volunteer (soft delete)
 * @route   DELETE /api/admin/volunteers/:id
 * @access  Private (Admin only)
 */
exports.deleteVolunteer = async (req, res, next) => {
  try {
    const { id } = req.params;

    const volunteer = await Volunteer.findOne({
      where: { 
        id,
        isActive: true
      }
    });

    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer not found'
      });
    }

    // Soft delete
    await volunteer.update({
      isActive: false
    });

    res.json({
      success: true,
      message: 'Volunteer deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting volunteer:', error.message);
    next(error);
  }
};

/**
 * @desc    Get volunteer scan analytics
 * @route   GET /api/admin/volunteers/scan-analytics
 * @access  Private (Admin only)
 */
exports.getVolunteerScanAnalytics = async (req, res, next) => {
  try {
    const { Op } = require('sequelize');
    const { eventId, volunteerId, startDate, endDate } = req.query;

    // Build where clause for scan logs
    let scanWhere = {
      scannedByType: 'volunteer' // Only get scans performed by volunteers
    };
    if (eventId) scanWhere.eventId = eventId;
    if (startDate) {
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : new Date(start.getTime() + 24 * 60 * 60 * 1000);
      scanWhere.createdAt = { [Op.between]: [start, end] };
    }

    // Get all volunteers
    const volunteers = await Volunteer.findAll({
      where: volunteerId ? { id: volunteerId } : { isActive: true },
      attributes: ['id', 'name', 'volunteerId', 'department', 'permissions']
    });

    // Get scan logs with volunteer filter
    const scanLogs = await ScanLog.findAll({
      where: {
        ...scanWhere,
        ...(volunteerId && { scannedBy: volunteerId })
      },
      include: [
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'regNo']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Group scan logs by volunteer
    const scansByVolunteer = {};
    scanLogs.forEach(scan => {
      const scannerId = scan.scannedBy;
      if (!scansByVolunteer[scannerId]) {
        scansByVolunteer[scannerId] = [];
      }
      scansByVolunteer[scannerId].push(scan);
    });

    // Process volunteer statistics
    const volunteerStats = volunteers.map(volunteer => {
      const scans = scansByVolunteer[volunteer.id] || [];
      const scanCount = scans.length;
      
      // Get current event (most recent scan's event)
      const recentScan = scans[0]; // Already sorted by createdAt DESC
      const currentEvent = recentScan?.event?.name || null;
      
      // Calculate last scan time
      const lastScanTime = recentScan ? recentScan.createdAt : null;
      
      // Determine online status (scanned within last 30 minutes)
      const isOnline = lastScanTime && 
        new Date() - new Date(lastScanTime) < 30 * 60 * 1000;

      return {
        volunteerId: volunteer.volunteerId,
        volunteerName: volunteer.name,
        department: volunteer.department,
        permissions: volunteer.permissions,
        scanCount,
        currentEvent,
        lastScanTime,
        isOnline,
        scans: scans.slice(0, 10).map(scan => ({
          id: scan.id,
          studentName: scan.user?.name,
          studentRegNo: scan.user?.regNo,
          eventName: scan.event?.name,
          timestamp: scan.createdAt
        }))
      };
    });

    // Calculate summary statistics
    const activeVolunteers = volunteerStats.filter(v => 
      v.lastScanTime && new Date() - new Date(v.lastScanTime) < 24 * 60 * 60 * 1000
    ).length;
    
    const totalScans = volunteerStats.reduce((sum, v) => sum + v.scanCount, 0);
    
    const eventsCovered = new Set(
      scanLogs.filter(scan => scan.event?.name).map(scan => scan.event.name)
    ).size;
    
    const averageScansPerVolunteer = volunteers.length > 0 
      ? Math.round(totalScans / volunteers.length) 
      : 0;

    // Get recent activity with volunteer names
    const recentActivity = await ScanLog.findAll({
      where: scanWhere,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['name', 'regNo']
        },
        {
          model: Event,
          as: 'event',
          attributes: ['name']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    // Get volunteer names for recent activity
    const volunteerIds = [...new Set(recentActivity.map(scan => scan.scannedBy).filter(Boolean))];
    const volunteerMap = {};
    if (volunteerIds.length > 0) {
      const activityVolunteers = await Volunteer.findAll({
        where: { id: { [Op.in]: volunteerIds } },
        attributes: ['id', 'name', 'volunteerId']
      });
      activityVolunteers.forEach(v => {
        volunteerMap[v.id] = { name: v.name, volunteerId: v.volunteerId };
      });
    }

    const formattedRecentActivity = recentActivity.map(scan => ({
      volunteerName: volunteerMap[scan.scannedBy]?.name || 'Unknown Volunteer',
      volunteerId: volunteerMap[scan.scannedBy]?.volunteerId || 'Unknown',
      studentName: scan.user?.name,
      studentRegNo: scan.user?.regNo,
      eventName: scan.event?.name,
      timestamp: scan.createdAt,
      type: 'student'
    }));

    res.json({
      success: true,
      message: 'Volunteer scan analytics retrieved successfully',
      data: {
        summary: {
          activeVolunteers,
          totalScans,
          eventsCovered,
          averageScansPerVolunteer
        },
        volunteerStats: volunteerStats.sort((a, b) => b.scanCount - a.scanCount),
        recentActivity: formattedRecentActivity
      }
    });

  } catch (error) {
    console.error('❌ Error fetching volunteer scan analytics:', error.message);
    next(error);
  }
};

/**
 * @desc    Download volunteer credentials list
 * @route   GET /api/admin/volunteers/download-credentials
 * @access  Private (Admin only)
 */
exports.downloadVolunteerCredentials = async (req, res, next) => {
  try {
    const bcrypt = require('bcryptjs');
    
    // Get cached volunteer credentials (recently created ones with passwords)
    const cachedCredentials = volunteerCredentialsCache.getAllVolunteerCredentials();
    
    // Also get all existing volunteers from database with their hashed passwords
    const existingVolunteers = await Volunteer.findAll({
      where: { 
        isActive: true
      },
      attributes: ['id', 'name', 'volunteerId', 'department', 'phone', 'password', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    // Combine cached credentials with existing volunteers
    const volunteerList = [];
    
    // Add recently created volunteers with passwords from cache
    cachedCredentials.forEach(cached => {
      volunteerList.push({
        name: cached.name,
        volunteerId: cached.volunteerId,
        password: cached.password,
        department: cached.department || 'N/A',
        phone: cached.phone || 'N/A',
        uid: cached.uid || 'N/A',
        source: 'Recently Created (with password)'
      });
    });
    
    // Add existing volunteers and test their passwords
    for (const volunteer of existingVolunteers) {
      // Only add if not already in cached list
      if (!cachedCredentials.find(c => c.volunteerId === volunteer.volunteerId)) {
        let workingPassword = 'Unknown password';
        
        // Test common volunteer passwords
        const testPasswords = ['volunteer123', 'Volunteer@123'];
        
        for (const testPass of testPasswords) {
          try {
            const isMatch = await bcrypt.compare(testPass, volunteer.password);
            if (isMatch) {
              workingPassword = testPass;
              break;
            }
          } catch (error) {
            // Continue to next password
          }
        }
        
        volunteerList.push({
          name: volunteer.name,
          volunteerId: volunteer.volunteerId,
          password: workingPassword,
          department: volunteer.department || 'N/A',
          phone: volunteer.phone || 'N/A',
          uid: 'N/A',
          source: workingPassword === 'Unknown password' ? 'Existing Volunteer (password unknown)' : 'Existing Volunteer (password verified)'
        });
      }
    }

    if (volunteerList.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No volunteers found'
      });
    }

    // Create CSV content
    const csvHeaders = ['Name', 'Volunteer ID', 'Password', 'UID', 'Department', 'Phone', 'Source'];
    const csvRows = volunteerList.map(vol => [
      vol.name,
      vol.volunteerId,
      vol.password,
      vol.uid,
      vol.department,
      vol.phone,
      vol.source
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="volunteer-credentials-${new Date().toISOString().split('T')[0]}.csv"`);

    res.status(200).send(csvContent);

  } catch (error) {
    console.error('❌ Error downloading volunteer credentials:', error.message);
    next(error);
  }
};

/**
 * @desc    Get volunteer credentials for admin viewing
 * @route   GET /api/admin/volunteers/credentials
 * @access  Private (Admin only)
 */
exports.getVolunteerCredentials = async (req, res, next) => {
  try {
    const volunteers = await Volunteer.findAll({
      where: { 
        isActive: true
      },
      attributes: ['id', 'name', 'volunteerId', 'department', 'phone', 'email', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      message: `Found ${volunteers.length} volunteers`,
      data: {
        volunteers: volunteers.map(vol => ({
          ...vol.toJSON(),
          passwordNote: 'Passwords are securely hashed - use password reset if needed'
        })),
        totalCount: volunteers.length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching volunteer credentials:', error.message);
    next(error);
  }
};
