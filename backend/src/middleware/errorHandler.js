const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(err);

  // Sequelize Validation Error
  if (err.name === 'SequelizeValidationError') {
    const message = err.errors.map((e) => e.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // Sequelize Unique Constraint Error
  if (err.name === 'SequelizeUniqueConstraintError') {
    // Check if it's the stall duplicate error
    if (err.errors && err.errors[0]?.path === 'unique_stall_per_event') {
      const message = 'A stall with this name already exists in this event. Please use a different name.';
      error = { message, statusCode: 400 };
    } else {
      const field = err.errors[0]?.path || 'field';
      const message = `Duplicate value for field: ${field}`;
      error = { message, statusCode: 400 };
    }
  }

  // Sequelize Foreign Key Constraint Error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    const message = 'Invalid reference to related resource';
    error = { message, statusCode: 400 };
  }

  // Sequelize Database Error
  if (err.name === 'SequelizeDatabaseError') {
    const message = 'Database error occurred';
    error = { message, statusCode: 500 };
  }

  // Invalid UUID format (PostgreSQL equivalent of CastError)
  if (err.message && err.message.includes('invalid input syntax for type uuid')) {
    const message = 'Invalid ID format';
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
