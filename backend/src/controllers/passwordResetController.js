const bcrypt = require('bcryptjs');
const { User, OTP } = require('../models/index.sequelize');
const { generateOTP, generateRandomPassword } = require('../utils/passwordGenerator');
const { sendPasswordResetOTP, sendNewPassword } = require('../utils/emailService');
const { Op } = require('sequelize');

/**
 * Forgot Password - Send OTP to email
 * POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email address',
      });
    }

    // Generate 6-digit OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate all previous OTPs for this user
    await OTP.update(
      { isUsed: true },
      {
        where: {
          userId: user.id,
          purpose: 'password_reset',
          isUsed: false,
        },
      }
    );

    // Create new OTP record
    await OTP.create({
      userId: user.id,
      otp,
      expiresAt,
      purpose: 'password_reset',
      isUsed: false,
    });

    // Send OTP via email
    const emailResult = await sendPasswordResetOTP(user.email, otp, user.name);

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again later.',
        error: emailResult.error,
      });
    }

    console.log(`📧 OTP sent to ${user.email}: ${otp} (expires in 10 minutes)`);

    res.status(200).json({
      success: true,
      message: 'OTP has been sent to your email address. Please check your inbox.',
      data: {
        email: user.email,
        expiresIn: '10 minutes',
      },
    });
  } catch (error) {
    console.error('Error in forgotPassword:', error);
    next(error);
  }
};

/**
 * Verify OTP and Reset Password
 * POST /api/auth/verify-otp
 */
exports.verifyOTPAndResetPassword = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email address',
      });
    }

    // Find valid OTP
    const otpRecord = await OTP.findOne({
      where: {
        userId: user.id,
        otp,
        purpose: 'password_reset',
        isUsed: false,
        expiresAt: {
          [Op.gt]: new Date(), // Not expired
        },
      },
      order: [['createdAt', 'DESC']],
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP. Please request a new one.',
      });
    }

    // Mark OTP as used
    await otpRecord.update({ isUsed: true });

    // Generate new random password
    const newPassword = generateRandomPassword(10);

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await user.update({ password: hashedPassword });

    // Send new password via email
    const emailResult = await sendNewPassword(user.email, newPassword, user.name);

    if (!emailResult.success) {
      console.error('Failed to send new password email:', emailResult.error);
      // Password is already reset, so we continue
    }

    console.log(`✅ Password reset successful for ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully! A new password has been sent to your email.',
      data: {
        email: user.email,
        message: 'Please check your email for the new password',
      },
    });
  } catch (error) {
    console.error('Error in verifyOTPAndResetPassword:', error);
    next(error);
  }
};

/**
 * Cleanup expired OTPs (can be run as a cron job)
 * DELETE /api/auth/cleanup-otps (Admin only)
 */
exports.cleanupExpiredOTPs = async (req, res, next) => {
  try {
    const result = await OTP.destroy({
      where: {
        expiresAt: {
          [Op.lt]: new Date(),
        },
      },
    });

    console.log(`🧹 Cleaned up ${result} expired OTPs`);

    res.status(200).json({
      success: true,
      message: `Cleaned up ${result} expired OTP records`,
      data: { deleted: result },
    });
  } catch (error) {
    console.error('Error in cleanupExpiredOTPs:', error);
    next(error);
  }
};

module.exports = {
  forgotPassword,
  verifyOTPAndResetPassword,
  cleanupExpiredOTPs,
};
