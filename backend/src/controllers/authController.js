const bcrypt = require('bcryptjs');
const { User, Volunteer } = require('../models/index.sequelize');
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
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Check rollNo uniqueness for students
    if (rollNo) {
      const existingRollNo = await User.findOne({ where: { rollNo } });
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
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          regNo: user.regNo,
          department: user.department,
        },
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
      user = await User.findOne({ where: { email } });
      if (user) {
        userType = 'user';
        console.log('👤 Found in Users table by email:', user.email);
      }
    } else if (regNo) {
      user = await User.findOne({ where: { regNo } });
      if (user) {
        userType = 'user';
        console.log('👤 Found in Users table by regNo:', user.regNo);
      }
    }

    // If not found in Users table, try Volunteers table
    if (!user) {
      if (email) {
        user = await Volunteer.findOne({ where: { email } });
        if (user) {
          userType = 'volunteer';
          console.log('👤 Found in Volunteers table by email:', user.email);
        }
      } else if (volunteerId) {
        user = await Volunteer.findOne({ where: { volunteerId } });
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
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('🔑 Password match result:', isMatch);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Update last login (for volunteers, use lastLoginAt field)
    if (userType === 'volunteer') {
      user.lastLoginAt = new Date();
    } else {
      user.lastLogin = new Date();
    }
    await user.save();

    // Determine role for token generation
    const role = userType === 'volunteer' ? 'volunteer' : user.role;

    // Generate tokens
    const accessToken = generateAccessToken(user.id, role);
    const refreshToken = generateRefreshToken(user.id);

    console.log('✅ Login successful for:', userType === 'volunteer' ? user.volunteerId : user.email);

    // Create public profile based on user type
    let publicProfile;
    if (userType === 'volunteer') {
      publicProfile = {
        id: user.id,
        name: user.name,
        email: user.email,
        volunteerId: user.volunteerId,
        role: 'volunteer',
        department: user.department,
        isActive: user.isActive,
      };
    } else {
      publicProfile = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        regNo: user.regNo,
        department: user.department,
        isActive: user.isActive,
      };
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: publicProfile,
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
    let user = await User.findByPk(decoded.userId);
    let userRole = user?.role || 'user';
    
    // If not found in Users, try Volunteers
    if (!user) {
      user = await Volunteer.findByPk(decoded.userId);
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
    console.log('🔍 GetMe called for user:', req.user);
    let user = null;
    
    // Check if it's a volunteer first (based on role in token)
    if (req.user.role === 'volunteer') {
      console.log('🤝 Looking up volunteer with ID:', req.user.id);
      user = await Volunteer.findByPk(req.user.id);
      console.log('🤝 Volunteer from DB:', user ? {
        id: user.id,
        volunteerId: user.volunteerId,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      } : 'null');
    } else {
      console.log('👤 Looking up regular user with ID:', req.user.id);
      user = await User.findByPk(req.user.id);
      console.log('👤 User from DB:', user ? {
        id: user.id,
        regNo: user.regNo,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      } : 'null');
    }
    
    if (!user) {
      console.log('❌ User not found in database');
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    console.log('✅ GetMe - User Details:', {
      id: user.id,
      email: user.email,
      role: req.user.role,
      name: user.name,
      isActive: user.isActive
    });

    // Handle different user types for public profile
    let publicProfile;
    try {
      if (req.user.role === 'volunteer') {
        console.log('🔧 Creating volunteer public profile...');
        // Create public profile for volunteer manually
        publicProfile = {
          id: user.id,
          name: user.name,
          email: user.email,
          volunteerId: user.volunteerId,
          role: req.user.role,
          department: user.department,
          isActive: user.isActive,
          assignedEvents: user.assignedEvents || [],
          permissions: user.permissions || [],
        };
        console.log('✅ Volunteer public profile created:', publicProfile);
      } else {
        console.log('🔧 Creating regular user public profile...');
        // For regular users, use the getPublicProfile method if it exists
        if (typeof user.getPublicProfile === 'function') {
          publicProfile = user.getPublicProfile();
        } else {
          // Fallback to manual creation
          publicProfile = {
            id: user.id,
            name: user.name,
            email: user.email,
            regNo: user.regNo,
            role: req.user.role,
            department: user.department,
            isActive: user.isActive,
          };
        }
        console.log('✅ Regular user public profile created:', publicProfile);
      }
    } catch (profileError) {
      console.error('❌ Error creating public profile:', profileError);
      throw profileError;
    }

    res.status(200).json({
      success: true,
      data: publicProfile,
    });
  } catch (error) {
    console.error('❌ GetMe error:', error);
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
      user = await Volunteer.findByPk(req.user.id);
      if (user) {
        await user.update(updates);
      }
    } else {
      user = await User.findByPk(req.user.id);
      if (user) {
        await user.update(updates);
      }
    }

    // Create public profile response
    let publicProfile;
    if (req.user.role === 'volunteer') {
      publicProfile = {
        id: user.id,
        name: user.name,
        email: user.email,
        volunteerId: user.volunteerId,
        role: 'volunteer',
        department: user.department,
      };
    } else {
      publicProfile = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        regNo: user.regNo,
        department: user.department,
      };
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: publicProfile,
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
      user = await Volunteer.findByPk(req.user.id);
    } else {
      user = await User.findByPk(req.user.id);
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};
