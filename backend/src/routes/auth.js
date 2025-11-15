const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController.sequelize');
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
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
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

module.exports = router;
