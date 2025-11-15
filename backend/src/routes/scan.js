const express = require('express');
const { body } = require('express-validator');
const scanController = require('../controllers/scanController.sequelize');
const { protect, authorize, requireCheckedIn } = require('../middleware/auth');
const { scanLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');

const router = express.Router();

// Volunteer scanning endpoints
router.post(
  '/student',
  protect,
  authorize('volunteer', 'admin'),
  scanLimiter,
  [
    body('qrToken').notEmpty().withMessage('QR token is required'),
  ],
  validate,
  scanController.scanStudent
);

router.post(
  '/stall',
  protect,
  authorize('student'),
  requireCheckedIn,
  scanLimiter,
  [
    body('token').notEmpty().withMessage('Stall QR token is required'),
    body('eventId').notEmpty().withMessage('Event ID is required'),
  ],
  validate,
  scanController.scanStall
);

// Get scan logs (for volunteers and admins)
router.get(
  '/logs',
  protect,
  authorize('volunteer', 'admin'),
  scanController.getScanLogs
);

router.get(
  '/logs/:id',
  protect,
  authorize('volunteer', 'admin'),
  scanController.getScanLogById
);

// Flag erroneous scan
router.put(
  '/logs/:id/flag',
  protect,
  authorize('volunteer', 'admin'),
  scanController.flagScanError
);

module.exports = router;
