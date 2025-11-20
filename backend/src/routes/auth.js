const express = require('express');
const { body } = require('express-validator');
const validator = require('validator');
const authController = require('../controllers/authController.sequelize');
const passwordResetController = require('../controllers/passwordResetController');
const { authLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['student', 'volunteer', 'admin'])
    .withMessage('Invalid role'),
];

const loginValidation = [
  body().custom((value, { req }) => {
    // Either email, regNo, or volunteerId is required
    if (!req.body.email && !req.body.regNo && !req.body.volunteerId) {
      throw new Error('Either email, registration number, or volunteer ID is required');
    }
    // If email is provided, validate it
    if (req.body.email && !validator.isEmail(req.body.email)) {
      throw new Error('Valid email is required');
    }
    return true;
  }),
  body('password').notEmpty().withMessage('Password is required'),
];

const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
];

const verifyOTPValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit number'),
];

// Routes
router.post(
  '/register',
  registerValidation,
  validate,
  authController.register
);

router.post(
  '/login',
  authLimiter,
  loginValidation,
  validate,
  authController.login
);

router.post('/refresh-token', authController.refreshToken);

router.post('/logout', protect, authController.logout);

router.get('/me', protect, authController.getMe);

router.put('/update-profile', protect, authController.updateProfile);

router.put('/change-password', protect, authController.changePassword);

// Password reset routes
router.post(
  '/forgot-password',
  authLimiter,
  forgotPasswordValidation,
  validate,
  passwordResetController.forgotPassword
);

router.post(
  '/verify-otp',
  authLimiter,
  verifyOTPValidation,
  validate,
  passwordResetController.verifyOTPAndResetPassword
);

// Student verification routes
router.post(
  '/verify-student',
  protect,
  [
    body('birthDate').isISO8601().withMessage('Valid birth date is required (YYYY-MM-DD)'),
    body('permanentAddressPinCode').isLength({ min: 6, max: 10 }).withMessage('PIN code must be 6-10 digits'),
  ],
  validate,
  authController.verifyStudent
);

router.post(
  '/reset-password-after-verification',
  protect,
  [
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('confirmPassword').notEmpty().withMessage('Confirm password is required'),
  ],
  validate,
  authController.resetPasswordAfterVerification
);

module.exports = router;
