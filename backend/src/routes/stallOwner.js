const express = require('express');
const router = express.Router();
const stallOwnerController = require('../controllers/stallOwnerController.sequelize');
const { protect } = require('../middlewares/auth');

// Public routes
router.post('/login', stallOwnerController.login);

// Protected routes (require stall owner authentication)
router.use(protect); // Apply to all routes below

router.get('/my-stall', stallOwnerController.getMyStall);
router.get('/department-leaderboard', stallOwnerController.getDepartmentLeaderboard);
router.get('/live-votes', stallOwnerController.getLiveVotes);
router.get('/live-feedbacks', stallOwnerController.getLiveFeedbacks);
router.get('/competition-stats', stallOwnerController.getCompetitionStats);
router.get('/recent-activity', stallOwnerController.getRecentActivity);

module.exports = router;
