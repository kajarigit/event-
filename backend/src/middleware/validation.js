const Joi = require('joi');
const logger = require('../config/logger');

/**
 * Validation middleware factory
 * @param {Object} schema - Joi schema object with optional keys: body, query, params
 * @returns {Function} Express middleware
 */
const validate = (schema) => {
  return (req, res, next) => {
    const validationOptions = {
      abortEarly: false, // Return all errors
      allowUnknown: true, // Allow unknown keys that will be ignored
      stripUnknown: true, // Remove unknown keys
    };

    const toValidate = {};
    if (schema.body) toValidate.body = req.body;
    if (schema.query) toValidate.query = req.query;
    if (schema.params) toValidate.params = req.params;

    const schemaToValidate = Joi.object(schema);
    const { error, value } = schemaToValidate.validate(toValidate, validationOptions);

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.logSecurity('VALIDATION_FAILED', 'low', {
        ip: req.ip,
        userId: req.user?.id,
        path: req.path,
        errors,
      });

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors,
      });
    }

    // Replace request data with validated and sanitized data
    if (value.body) req.body = value.body;
    if (value.query) req.query = value.query;
    if (value.params) req.params = value.params;

    next();
  };
};

// Common validation schemas
const schemas = {
  // User schemas
  createUser: {
    body: Joi.object({
      name: Joi.string().min(2).max(100).required().trim(),
      email: Joi.string().email().required().lowercase().trim(),
      password: Joi.string().min(6).max(128).required(),
      role: Joi.string().valid('admin', 'volunteer', 'student').required(),
      phone: Joi.string().pattern(/^[0-9]{10}$/).optional().allow('', null),
      regNo: Joi.string().max(50).optional().allow('', null).trim(),
      faculty: Joi.string().max(100).optional().allow('', null).trim(),
      department: Joi.string().max(100).optional().allow('', null).trim(),
      programme: Joi.string().max(100).optional().allow('', null).trim(),
      year: Joi.number().integer().min(1).max(10).optional().allow(null),
      assignedGate: Joi.string().max(50).optional().allow('', null).trim(),
    }),
  },

  updateUser: {
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
    body: Joi.object({
      name: Joi.string().min(2).max(100).optional().trim(),
      email: Joi.string().email().optional().lowercase().trim(),
      password: Joi.string().min(6).max(128).optional(),
      role: Joi.string().valid('admin', 'volunteer', 'student').optional(),
      phone: Joi.string().pattern(/^[0-9]{10}$/).optional().allow('', null),
      regNo: Joi.string().max(50).optional().allow('', null).trim(),
      faculty: Joi.string().max(100).optional().allow('', null).trim(),
      department: Joi.string().max(100).optional().allow('', null).trim(),
      programme: Joi.string().max(100).optional().allow('', null).trim(),
      year: Joi.number().integer().min(1).max(10).optional().allow(null),
      assignedGate: Joi.string().max(50).optional().allow('', null).trim(),
    }).min(1), // At least one field must be provided
  },

  // Authentication schemas
  login: {
    body: Joi.object({
      email: Joi.string().email().required().lowercase().trim(),
      password: Joi.string().required(),
    }),
  },

  register: {
    body: Joi.object({
      name: Joi.string().min(2).max(100).required().trim(),
      email: Joi.string().email().required().lowercase().trim(),
      password: Joi.string().min(6).max(128).required(),
      phone: Joi.string().pattern(/^[0-9]{10}$/).optional().allow('', null),
    }),
  },

  forgotPassword: {
    body: Joi.object({
      email: Joi.string().email().required().lowercase().trim(),
    }),
  },

  resetPassword: {
    body: Joi.object({
      email: Joi.string().email().required().lowercase().trim(),
      otp: Joi.string().length(6).required(),
      newPassword: Joi.string().min(6).max(128).required(),
    }),
  },

  // Event schemas
  createEvent: {
    body: Joi.object({
      name: Joi.string().min(2).max(200).required().trim(),
      description: Joi.string().max(2000).optional().allow('', null).trim(),
      date: Joi.date().iso().required(),
      location: Joi.string().max(200).optional().allow('', null).trim(),
      maxCapacity: Joi.number().integer().min(1).optional().allow(null),
      requiresQR: Joi.boolean().optional(),
      isActive: Joi.boolean().optional(),
    }),
  },

  updateEvent: {
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
    body: Joi.object({
      name: Joi.string().min(2).max(200).optional().trim(),
      description: Joi.string().max(2000).optional().allow('', null).trim(),
      date: Joi.date().iso().optional(),
      location: Joi.string().max(200).optional().allow('', null).trim(),
      maxCapacity: Joi.number().integer().min(1).optional().allow(null),
      requiresQR: Joi.boolean().optional(),
      isActive: Joi.boolean().optional(),
    }).min(1),
  },

  // Stall schemas
  createStall: {
    body: Joi.object({
      eventId: Joi.string().uuid().required(),
      name: Joi.string().min(2).max(200).required().trim(),
      description: Joi.string().max(2000).optional().allow('', null).trim(),
      location: Joi.string().max(200).optional().allow('', null).trim(),
      category: Joi.string().max(100).optional().allow('', null).trim(),
      ownerName: Joi.string().max(100).optional().allow('', null).trim(),
      ownerContact: Joi.string().max(15).optional().allow('', null).trim(),
      ownerEmail: Joi.string().email().optional().allow('', null).lowercase().trim(),
      department: Joi.string().max(100).optional().allow('', null).trim(),
      participants: Joi.string().optional().allow('', null), // JSON string
    }),
  },

  updateStall: {
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
    body: Joi.object({
      name: Joi.string().min(2).max(200).optional().trim(),
      description: Joi.string().max(2000).optional().allow('', null).trim(),
      location: Joi.string().max(200).optional().allow('', null).trim(),
      category: Joi.string().max(100).optional().allow('', null).trim(),
      ownerName: Joi.string().max(100).optional().allow('', null).trim(),
      ownerContact: Joi.string().max(15).optional().allow('', null).trim(),
      ownerEmail: Joi.string().email().optional().allow('', null).lowercase().trim(),
      department: Joi.string().max(100).optional().allow('', null).trim(),
      participants: Joi.string().optional().allow('', null),
    }).min(1),
  },

  // QR scanning schema
  scanQR: {
    body: Joi.object({
      token: Joi.string().required(),
      eventId: Joi.string().uuid().required(),
      scannedBy: Joi.string().uuid().optional(), // Volunteer ID
      gate: Joi.string().max(50).optional().allow('', null).trim(),
    }),
  },

  // Generic UUID param
  uuidParam: {
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
  },

  // Pagination query
  pagination: {
    query: Joi.object({
      page: Joi.number().integer().min(1).optional().default(1),
      limit: Joi.number().integer().min(1).max(100).optional().default(10),
      search: Joi.string().max(100).optional().allow('', null).trim(),
      sortBy: Joi.string().max(50).optional().trim(),
      sortOrder: Joi.string().valid('ASC', 'DESC').optional().uppercase(),
    }),
  },

  // Bulk upload schemas
  bulkUpload: {
    body: Joi.object({
      type: Joi.string().valid('students', 'volunteers', 'stalls').required(),
    }),
  },
};

/**
 * Validate UUID parameter
 */
const validateUUID = validate(schemas.uuidParam);

/**
 * Validate pagination query parameters
 */
const validatePagination = validate(schemas.pagination);

/**
 * Custom validator for file uploads
 */
const validateFileUpload = (allowedTypes = [], maxSize = 5 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.file && !req.files) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const file = req.file || (req.files && req.files[0]);

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      logger.logSecurity('INVALID_FILE_TYPE', 'medium', {
        ip: req.ip,
        userId: req.user?.id,
        filename: file.originalname,
        mimetype: file.mimetype,
        allowedTypes,
      });

      return res.status(400).json({
        success: false,
        message: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
      });
    }

    // Check file size
    if (file.size > maxSize) {
      logger.logSecurity('FILE_SIZE_EXCEEDED', 'low', {
        ip: req.ip,
        userId: req.user?.id,
        filename: file.originalname,
        size: file.size,
        maxSize,
      });

      return res.status(400).json({
        success: false,
        message: `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`,
      });
    }

    next();
  };
};

module.exports = {
  validate,
  schemas,
  validateUUID,
  validatePagination,
  validateFileUpload,
};
