const express = require('express');
const router = express.Router();
const {
  getMyHeroicRanking,
  getHeroicLeaderboard,
} = require('../controllers/ladderController');
const { authenticateToken } = require('../middleware/auth');

router.get('/heroic/me', authenticateToken, getMyHeroicRanking);
router.get('/heroic/leaderboard', getHeroicLeaderboard);

module.exports = router;

