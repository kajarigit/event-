const User = require('../models/User');
const Volunteer = require('../models/Volunteer');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/jwt');

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, rollNo, programme, department, phone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Check rollNo uniqueness for students
    if (rollNo) {
      const existingRollNo = await User.findOne({ rollNo });
      if (existingRollNo) {
        return res.status(400).json({
          success: false,
          message: 'Roll number already exists',
        });
      }
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'student',
      rollNo,
      programme,
      department,
      phone,
    });

    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.getPublicProfile(),
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password, regNo, volunteerId } = req.body;

    let user = null;
    let userType = null;
    
    console.log('🔐 Login attempt with:', {
      email: email || 'not provided',
      regNo: regNo || 'not provided', 
      volunteerId: volunteerId || 'not provided'
    });

    // Try to find user in Users table first
    if (email) {
      user = await User.findOne({ email }).select('+password');
      if (user) {
        userType = 'user';
        console.log('👤 Found in Users table by email:', user.email);
      }
    } else if (regNo) {
      user = await User.findOne({ regNo }).select('+password');
      if (user) {
        userType = 'user';
        console.log('👤 Found in Users table by regNo:', user.regNo);
      }
    }

    // If not found in Users table, try Volunteers table
    if (!user) {
      if (email) {
        user = await Volunteer.findOne({ email }).select('+password');
        if (user) {
          userType = 'volunteer';
          console.log('👤 Found in Volunteers table by email:', user.email);
        }
      } else if (volunteerId) {
        user = await Volunteer.findOne({ volunteerId }).select('+password');
        if (user) {
          userType = 'volunteer';
          console.log('👤 Found in Volunteers table by volunteerId:', user.volunteerId);
        }
      }
    }

    // If still no user found
    if (!user) {
      console.log('❌ User not found in either table');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('❌ User account is inactive');
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated',
      });
    }

    console.log('🔐 Attempting password verification for user:', user.id);
    console.log('👤 User instance:', {
      id: user.id,
      name: user.name,
      [userType === 'volunteer' ? 'volunteerId' : 'regNo']: userType === 'volunteer' ? user.volunteerId : user.regNo,
      hasPassword: !!user.password,
      hasDataValues: !!user.dataValues,
      dataValuesPassword: !!(user.dataValues && user.dataValues.password),
      passwordLength: user.password ? user.password.length : 0
    });

    // Verify password
    console.log('🔍 Entered password:', password?.substring(0, 3) + '***');
    const isMatch = await user.comparePassword(password);
    console.log('🔑 Password match result:', isMatch);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Determine role for token generation
    const role = userType === 'volunteer' ? 'volunteer' : user.role;

    // Generate tokens
    const accessToken = generateAccessToken(user.id, role);
    const refreshToken = generateRefreshToken(user.id);

    console.log('✅ Login successful for:', userType === 'volunteer' ? user.volunteerId : user.email);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.getPublicProfile(),
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('🔥 Login error:', error);
    next(error);
  }
};

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken, true);

    // Get user from appropriate table
    let user = await User.findById(decoded.userId);
    let userRole = user?.role || 'user';
    
    // If not found in Users, try Volunteers
    if (!user) {
      user = await Volunteer.findById(decoded.userId);
      userRole = 'volunteer';
    }
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user.id, userRole);

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
    });
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res, next) => {
  try {
    let user = null;
    
    // Check if it's a volunteer first (based on role in token)
    if (req.user.role === 'volunteer') {
      user = await Volunteer.findById(req.user.id);
    } else {
      user = await User.findById(req.user.id);
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    console.log('GetMe - User Details:', {
      id: user.id,
      email: user.email,
      role: req.user.role,
      name: user.name,
      isActive: user.isActive
    });

    res.status(200).json({
      success: true,
      data: user.getPublicProfile(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/update-profile
 * @access  Private
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const allowedFields = ['name', 'phone', 'department', 'programme'];
    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    let user = null;
    
    // Update appropriate table based on user role
    if (req.user.role === 'volunteer') {
      user = await Volunteer.findByIdAndUpdate(
        req.user.id,
        updates,
        { new: true, runValidators: true }
      );
    } else {
      user = await User.findByIdAndUpdate(
        req.user.id,
        updates,
        { new: true, runValidators: true }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user.getPublicProfile(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
      });
    }

    // Get user with password from appropriate table
    let user = null;
    if (req.user.role === 'volunteer') {
      user = await Volunteer.findById(req.user.id).select('+password');
    } else {
      user = await User.findById(req.user.id).select('+password');
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};
