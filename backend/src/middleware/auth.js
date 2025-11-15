const jwt = require('jsonwebtoken');
const { User, Attendance } = require('../models/index.sequelize');

/**
 * Protect routes - verify JWT token
 */
const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check for token in cookies (optional)
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    console.log('🔐 Token decoded:', { userId: decoded.userId, role: decoded.role });

    // Get user from token
    req.user = await User.findByPk(decoded.userId);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    console.log('👤 User from DB:', { id: req.user.id, email: req.user.email, role: req.user.role });

    if (!req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated',
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
      error: error.message,
    });
  }
};

/**
 * Authorize specific roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Normalize roles to lowercase for comparison
    const normalizedRoles = roles.map(role => role.toLowerCase());
    const userRole = req.user.role ? req.user.role.toLowerCase() : '';

    if (!normalizedRoles.includes(userRole)) {
      console.log(`Authorization failed: User role '${req.user.role}' not in allowed roles [${roles.join(', ')}]`);
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this route. Required roles: ${roles.join(', ')}`,
      });
    }

    next();
  };
};

/**
 * Check if user is checked in to event
 */
const requireCheckedIn = async (req, res, next) => {
  try {
    const { eventId } = req.body || req.params || req.query;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required',
      });
    }
    
    const attendance = await Attendance.findOne({
      where: {
        studentId: req.user.id,
        eventId: eventId,
        status: 'checked-in'
      }
    });

    if (!attendance) {
      return res.status(403).json({
        success: false,
        message: 'You must be checked in to the event to perform this action',
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error checking attendance status',
      error: error.message,
    });
  }
};

module.exports = {
  protect,
  authorize,
  requireCheckedIn,
};
