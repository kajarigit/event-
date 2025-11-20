const { User, Volunteer, Stall } = require('../models/index.sequelize');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/jwt');

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, rollNumber, year, department, phone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Check rollNumber uniqueness for students
    if (rollNumber) {
      const existingRollNumber = await User.findOne({ where: { rollNumber } });
      if (existingRollNumber) {
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
      rollNumber,
      year,
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
        user: user.toJSON(),
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
    const { email, regNo, volunteerId, password, loginType } = req.body;

    // Enforce specific login rules by user type:
    // Students: UID (regNo) only
    // Volunteers: volunteerID only (now in separate volunteers table)
    // Stall Owners: email only (handled in separate controller)
    // Admin: email only
    
    let user;
    let expectedRole;
    
    if (regNo && !email && !volunteerId) {
      // Student login with UID
      user = await User.findOne({ where: { regNo } });
      expectedRole = 'student';
    } else if (volunteerId && !email && !regNo) {
      // Volunteer login with volunteer ID (check volunteers table)
      user = await Volunteer.findOne({ where: { volunteerId } });
      expectedRole = 'volunteer';
    } else if (email && !regNo && !volunteerId) {
      // Admin login with email (stall owners use separate endpoint)
      user = await User.findOne({ where: { email } });
      expectedRole = 'admin';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid login method. Use: UID for students, volunteer ID for volunteers, or email for admin.',
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // For volunteers, the role is implicit (no role field in volunteers table)
    // For users, validate user role matches expected login method
    if (expectedRole === 'volunteer') {
      // Volunteer found in volunteers table - role is implicitly volunteer
    } else if (user.role !== expectedRole) {
      return res.status(401).json({
        success: false,
        message: `Invalid login method for ${user.role}. Please use the correct login page.`,
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated',
      });
    }

    // Verify password
    console.log('🔐 Attempting password verification for user:', user.id);
    console.log('👤 User instance:', { 
      id: user.id, 
      name: user.name, 
      regNo: user.regNo, 
      hasPassword: !!user.password,
      hasDataValues: !!user.dataValues,
      dataValuesPassword: user.dataValues ? !!user.dataValues.password : false,
      passwordLength: user.password ? user.password.length : 0
    });
    console.log('🔍 Entered password:', password ? `${password.substring(0, 3)}***` : 'empty');
    
    if (!user.password && !user.dataValues?.password) {
      console.error('❌ User has no password stored in database!');
      return res.status(500).json({
        success: false,
        message: 'User account is not properly configured',
      });
    }
    
    let isMatch;
    try {
      isMatch = await user.matchPassword(password);
      console.log('🔑 Password match result:', isMatch);
    } catch (matchError) {
      console.error('❌ matchPassword error:', matchError.message);
      throw matchError;
    }
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Generate tokens (set role to 'volunteer' for volunteer table users)
    const userRole = expectedRole === 'volunteer' ? 'volunteer' : user.role;
    const accessToken = generateAccessToken(user.id, userRole);
    const refreshToken = generateRefreshToken(user.id);

    // Check if student needs to complete verification flow
    const needsVerification = userRole === 'student' && user.isFirstLogin && !user.isVerified;

    res.status(200).json({
      success: true,
      message: needsVerification ? 'First time login - verification required' : 'Login successful',
      data: {
        user: { ...user.toJSON(), role: userRole }, // Add role to response for volunteers
        accessToken,
        refreshToken,
        needsVerification,
        redirectTo: needsVerification ? '/student/verify' : '/dashboard'
      },
    });
  } catch (error) {
    console.error('❌ Login error:', error.message);
    console.error('Stack:', error.stack);
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

    // Get user from either users or volunteers table
    let user = await User.findByPk(decoded.userId);
    let userRole = user?.role;
    
    if (!user) {
      // Try volunteers table
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
      success: false,
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
    
    // Check user type based on role in token and look up in appropriate table
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
    } else if (req.user.role === 'stall_owner') {
      console.log('🏪 Looking up stall owner with ID:', req.user.id);
      user = await Stall.findByPk(req.user.id, {
        include: [
          {
            model: require('../models/index.sequelize').Event,
            as: 'event',
            attributes: ['id', 'name', 'startDate', 'endDate', 'isActive']
          }
        ]
      });
      console.log('🏪 Stall from DB:', user ? {
        id: user.id,
        name: user.name,
        ownerName: user.ownerName,
        ownerEmail: user.ownerEmail,
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
      email: user.email || user.ownerEmail,
      role: req.user.role,
      name: user.name || user.ownerName,
      isActive: user.isActive
    });

    // Handle different user types for public profile
    let publicProfile;
    try {
      if (req.user.role === 'volunteer') {
        console.log('🔧 Creating volunteer public profile...');
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
          phone: user.phone,
          faculty: user.faculty,
          programme: user.programme,
          year: user.year
        };
        console.log('✅ Volunteer public profile created');
      } else if (req.user.role === 'stall_owner') {
        console.log('🔧 Creating stall owner public profile...');
        publicProfile = {
          id: user.id,
          name: user.name,
          ownerName: user.ownerName,
          ownerEmail: user.ownerEmail,
          ownerContact: user.ownerContact,
          role: req.user.role,
          department: user.department,
          location: user.location,
          category: user.category,
          description: user.description,
          isActive: user.isActive,
          event: user.event,
          participants: user.participants || []
        };
        console.log('✅ Stall owner public profile created');
      } else {
        console.log('🔧 Creating regular user public profile...');
        // For regular users, use toJSON method
        publicProfile = user.toJSON();
        console.log('✅ Regular user public profile created');
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
    const allowedFields = ['name', 'phone', 'department', 'year'];
    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByPk(req.user.id);
    await user.update(updates);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user.toJSON(),
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

    // Get user with password
    const user = await User.findByPk(req.user.id);

    // Verify current password
    const isMatch = await user.matchPassword(currentPassword);
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

/**
 * @desc    Verify student details (birthdate and pin code)
 * @route   POST /api/auth/verify-student
 * @access  Private (Student)
 */
exports.verifyStudent = async (req, res, next) => {
  try {
    const { birthDate, permanentAddressPinCode } = req.body;
    const userId = req.user.id;

    if (!birthDate || !permanentAddressPinCode) {
      return res.status(400).json({
        success: false,
        message: 'Birth date and permanent address PIN code are required',
      });
    }

    // Get user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user is a student
    if (user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can use this verification',
      });
    }

    // For demo purposes, we'll store the verification data
    // In real scenario, you'd validate against existing records
    await user.update({
      birthDate,
      permanentAddressPinCode,
      isVerified: true
    });

    res.status(200).json({
      success: true,
      message: 'Verification successful. Please set your new password.',
      data: {
        userId: user.id,
        canResetPassword: true
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password after verification
 * @route   POST /api/auth/reset-password-after-verification
 * @access  Private (Student)
 */
exports.resetPasswordAfterVerification = async (req, res, next) => {
  try {
    const { password, confirmPassword } = req.body;
    const userId = req.user.id;

    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password and confirm password are required',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Get user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Please complete verification first',
      });
    }

    // Update password and mark as not first login
    await user.update({
      password,
      isFirstLogin: false
    });

    res.status(200).json({
      success: true,
      message: 'Password updated successfully. You can now login with your new password.',
    });
  } catch (error) {
    next(error);
  }
};
