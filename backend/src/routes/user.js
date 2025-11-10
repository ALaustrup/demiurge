const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateSocialScore,
  getLeaderboard,
} = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

router.get('/leaderboard', getLeaderboard);
router.get('/:userId', getUserProfile);
router.put('/:userId/social-score', authenticateToken, updateSocialScore);

module.exports = router;

