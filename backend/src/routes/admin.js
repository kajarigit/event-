const express = require('express');
const adminController = require('../controllers/adminController.sequelize');
const attendanceAnalytics = require('../controllers/attendanceAnalytics');
const ultraSimpleAttendance = require('../controllers/ultraSimpleAttendance');
const feedbackAnalytics = require('../controllers/feedbackAnalytics');
const simpleFeedbackAnalytics = require('../controllers/simpleFeedbackAnalytics');
const detailedFeedbackAnalytics = require('../controllers/detailedFeedbackAnalytics');
const migrationController = require('../controllers/migrationController');
const stallRankingAnalytics = require('../controllers/stallRankingAnalytics');
const departmentAttendanceAnalytics = require('../controllers/departmentAttendanceAnalytics');
const scanLogAnalytics = require('../controllers/scanLogAnalytics');
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
router.post('/stalls/fix-passwords', adminController.fixStallPasswords); // Temporary endpoint

// Users
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.get('/users/:id', adminController.getUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.post('/users/bulk', upload.single('file'), adminController.bulkUploadUsers);

// Volunteers 
router.get('/volunteers', adminController.getVolunteers);
router.post('/volunteers', adminController.createVolunteer);
router.get('/volunteers/credentials', adminController.getVolunteerCredentials);
router.get('/volunteers/download-credentials', adminController.downloadVolunteerCredentials);
router.get('/volunteers/scan-analytics', adminController.getVolunteerScanAnalytics);
router.post('/volunteers/bulk', upload.single('file'), adminController.bulkUploadVolunteers);
router.get('/volunteers/:id', adminController.getVolunteer);
router.put('/volunteers/:id', adminController.updateVolunteer);
router.delete('/volunteers/:id', adminController.deleteVolunteer);

const basicAttendance = require('../controllers/basicAttendance');

// Ultra Simple Attendance Records (No complex associations)
router.get('/attendance/test', ultraSimpleAttendance.testAttendanceEndpoint);
router.get('/attendance/event/:eventId', ultraSimpleAttendance.getEventAttendanceRecords);

// Basic Attendance - Step by step debugging
router.get('/attendance/raw/:eventId', basicAttendance.getRawEventAttendance);
router.get('/attendance/processed/:eventId', basicAttendance.getProcessedEventAttendance);

// Analytics - New Comprehensive System
router.get('/analytics/test-comprehensive', attendanceAnalytics.testComprehensiveAnalytics);
router.get('/analytics/attendance-comprehensive', attendanceAnalytics.getComprehensiveAttendance);
router.get('/analytics/student-history/:studentId', attendanceAnalytics.getStudentAttendanceHistory);
router.get('/analytics/department-attendance', attendanceAnalytics.getDepartmentAttendanceStats);

// Feedback Analytics
router.get('/analytics/top-feedback-givers/:eventId', feedbackAnalytics.getTopFeedbackGivers);
router.get('/analytics/feedback-overview', feedbackAnalytics.getFeedbackOverview);

// Simple Feedback Analytics (for testing)
router.get('/analytics/test-feedback', simpleFeedbackAnalytics.testFeedbackTable);
router.get('/analytics/feedback-simple/:eventId', simpleFeedbackAnalytics.getSimpleFeedbackGivers);

// Detailed 5-Category Feedback Analytics 
router.get('/analytics/detailed-feedback-rankings', detailedFeedbackAnalytics.getDetailedFeedbackRankings);
router.get('/analytics/stall-feedback-details/:stallId', detailedFeedbackAnalytics.getStallFeedbackDetails);
router.get('/analytics/feedback-analytics-overview', detailedFeedbackAnalytics.getFeedbackAnalyticsOverview);

// Stall Ranking Analytics (Department-wise voting rankings)
router.get('/analytics/test-voting', stallRankingAnalytics.testVotingSystem);
router.get('/analytics/top-stalls-by-department/:eventId', stallRankingAnalytics.getTopStallsByDepartment);
router.get('/analytics/voting-overview', stallRankingAnalytics.getVotingOverview);

// Department Attendance Analytics (Department-wise attendance percentage rankings)
router.get('/analytics/department-attendance-stats/:eventId', departmentAttendanceAnalytics.getDepartmentAttendanceStats);
router.get('/analytics/department-attendance-details/:eventId/:department', departmentAttendanceAnalytics.getDepartmentAttendanceDetails);
router.get('/analytics/all-events-attendance-summary', departmentAttendanceAnalytics.getAllEventsAttendanceSummary);

// Scan Log Analytics (Volunteer activity tracking and scan monitoring)
router.get('/analytics/scan-logs', scanLogAnalytics.getScanLogAnalytics);
router.get('/analytics/scan-logs-detailed', scanLogAnalytics.getDetailedScanLogs);
router.get('/analytics/volunteer-performance', scanLogAnalytics.getVolunteerPerformance);
router.get('/analytics/real-time-scans', scanLogAnalytics.getRealTimeScanActivity);
router.get('/analytics/export-scan-logs', scanLogAnalytics.exportScanLogs);

// Analytics - Legacy (keeping for backward compatibility)
router.get('/analytics/diagnostics', adminController.getAnalyticsDiagnostics);
router.get('/analytics/detailed-attendance', adminController.getDetailedAttendanceAnalytics);
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

// Database Migrations
router.post('/migrate/feedback-ratings', protect, authorize('admin'), migrationController.runFeedbackRatingMigration);

module.exports = router;
