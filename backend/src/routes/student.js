const express = require('express');
const { body } = require('express-validator');
const studentController = require('../controllers/studentController.sequelize');
const { protect, authorize, requireCheckedIn } = require('../middleware/auth');
const { actionLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');

const router = express.Router();

// Get events (for students to see available events)
router.get(
  '/events',
  protect,
  authorize('student'),
  studentController.getEvents
);

// Get stalls (for students to see stalls in events)
router.get(
  '/stalls',
  protect,
  authorize('student'),
  studentController.getStalls
);

// Get student QR code
router.get(
  '/qrcode/:eventId',
  protect,
  authorize('student'),
  studentController.getQRCode
);

// Submit feedback
router.post(
  '/feedback',
  protect,
  authorize('student'),
  requireCheckedIn,
  actionLimiter,
  [
    body('stallId').notEmpty().withMessage('Stall ID is required'),
    body('eventId').notEmpty().withMessage('Event ID is required'),
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    body('comment').optional().trim().isLength({ max: 1000 }),
  ],
  validate,
  studentController.submitFeedback
);

// Cast vote
router.post(
  '/vote',
  protect,
  authorize('student'),
  requireCheckedIn,
  actionLimiter,
  [
    body('stallId').notEmpty().withMessage('Stall ID is required'),
    body('eventId').notEmpty().withMessage('Event ID is required'),
    body('rank')
      .isInt({ min: 1, max: 3 })
      .withMessage('Rank must be between 1 and 3'),
  ],
  validate,
  studentController.castVote
);

// Get student's votes
router.get(
  '/votes/:eventId',
  protect,
  authorize('student'),
  studentController.getMyVotes
);

// Get student's feedbacks
router.get(
  '/feedbacks/:eventId',
  protect,
  authorize('student'),
  studentController.getMyFeedbacks
);

// Get attendance history
router.get(
  '/attendance/:eventId',
  protect,
  authorize('student'),
  studentController.getAttendance
);

// Check current status
router.get(
  '/status/:eventId',
  protect,
  authorize('student'),
  studentController.getStatus
);

module.exports = router;
