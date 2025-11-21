const jwt = require('jsonwebtoken');
const { User, Volunteer, Stall, Attendance } = require('../models/index.sequelize');

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
    
    console.log('🔐 Token decoded:', { 
      userId: decoded.userId, 
      role: decoded.role,
      scope: decoded.scope,
      isVerificationToken: decoded.isVerificationToken
    });

    // Check if this is a verification-only token
    if (decoded.isVerificationToken && decoded.scope === 'verification-only') {
      // Limited token - only allow access to verification endpoints
      const allowedPaths = [
        '/verify-student',
        '/reset-password-after-verification',
        '/me' // Allow basic user info
      ];
      
      const isAllowedPath = allowedPaths.some(path => req.path === path);
      
      console.log('🔍 VERIFICATION TOKEN DEBUG:', {
        path: req.path,
        allowedPaths,
        isAllowedPath,
        isVerificationToken: decoded.isVerificationToken,
        scope: decoded.scope
      });
      
      if (!isAllowedPath) {
        console.log('🚨 VERIFICATION TOKEN BLOCKED:', {
          path: req.path,
          allowedPaths,
          isVerificationToken: true
        });
        
        return res.status(403).json({
          success: false,
          message: 'Your account requires verification. Please complete the verification process before accessing this feature.',
          requiresVerification: true,
          redirectTo: '/student/verify'
        });
      }
      
      console.log('✅ Verification token allowed for path:', req.path);
    }

    // Get user/stall based on role
    if (decoded.role === 'stall_owner') {
      // For stall owners, look in the Stall table
      req.user = await Stall.findByPk(decoded.userId, {
        attributes: { exclude: ['ownerPassword'] }
      });
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Stall owner not found',
        });
      }

      console.log('🏪 Stall owner from DB:', { id: req.user.id, stallName: req.user.stallName, ownerName: req.user.ownerName });
      
      // Add role to the user object for consistency
      req.user.role = 'stall_owner';
      
    } else {
      // For regular users (students/admins), look in the User table
      // For volunteers, look in the Volunteer table
      let user;
      
      if (decoded.role === 'volunteer') {
        // Look in Volunteer table
        user = await Volunteer.findByPk(decoded.userId);
        
        if (!user) {
          return res.status(401).json({
            success: false,
            message: 'Volunteer not found',
          });
        }

        console.log('🤝 Volunteer from DB:', { id: user.id, volunteerId: user.volunteerId, name: user.name });

        if (!user.isActive) {
          return res.status(401).json({
            success: false,
            message: 'Volunteer account is deactivated',
          });
        }
        
        // Add role to the volunteer object for consistency
        user.role = 'volunteer';
        
      } else {
        // Look in User table (students, admins)
        user = await User.findByPk(decoded.userId);

        if (!user) {
          return res.status(401).json({
            success: false,
            message: 'User not found',
          });
        }

        console.log('👤 User from DB:', { id: user.id, email: user.email, role: user.role });

        if (!user.isActive) {
          return res.status(401).json({
            success: false,
            message: 'User account is deactivated',
          });
        }
      }
      
      req.user = user;
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
