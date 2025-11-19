const express = require('express');
const adminController = require('../controllers/adminController.sequelize');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const multer = require('multer');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
});

// All routes require admin authorization
router.use(protect, authorize('admin'));

// Events
router.get('/events', adminController.getEvents);
router.post('/events', adminController.createEvent);
router.get('/events/:id', adminController.getEvent);
router.put('/events/:id', adminController.updateEvent);
router.delete('/events/:id', adminController.deleteEvent);
router.put('/events/:id/toggle-active', adminController.toggleEventActive);
router.patch('/events/:id/start', adminController.manuallyStartEvent);
router.patch('/events/:id/end', adminController.manuallyEndEvent);

// Stalls
router.get('/stalls', adminController.getStalls);
router.post('/stalls', adminController.createStall);
router.get('/stalls/:id', adminController.getStall);
router.put('/stalls/:id', adminController.updateStall);
router.delete('/stalls/:id', adminController.deleteStall);
router.get('/stalls/:id/qrcode', adminController.getStallQRCode);
router.post('/stalls/bulk', upload.single('file'), adminController.bulkUploadStalls);
router.post('/stalls/refresh-stats', adminController.refreshAllStallStats);

// Users
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.get('/users/:id', adminController.getUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.post('/users/bulk', upload.single('file'), adminController.bulkUploadUsers);

// Analytics
router.get('/analytics/diagnostics', adminController.getAnalyticsDiagnostics);
router.get('/analytics/top-students', adminController.getTopStudentsByStayTime);
router.get('/analytics/most-reviewers', adminController.getMostReviewers);
router.get('/analytics/top-stalls', adminController.getTopStallsByVotes);
router.get('/analytics/department-stats', adminController.getDepartmentStats);
router.get('/analytics/event-overview', adminController.getEventOverview);
router.get('/analytics/export-comprehensive', adminController.exportComprehensiveAnalytics);

// Reports (CSV Export)
router.get('/reports/attendance', adminController.exportAttendanceReport);
router.get('/reports/feedbacks', adminController.exportFeedbackReport);
router.get('/reports/votes', adminController.exportVoteReport);

// Manual corrections
router.put('/attendances/:id', adminController.updateAttendance);
router.delete('/attendances/:id', adminController.deleteAttendance);

module.exports = router;
