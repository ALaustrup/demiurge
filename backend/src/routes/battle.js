const express = require('express');
const router = express.Router();
const {
  createBattle,
  completeBattle,
  resolveBattle,
  getUserBattles,
  getBattleById,
  getMyHeroBattles,
} = require('../controllers/battleController');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, createBattle);
router.post('/:battleId/complete', authenticateToken, completeBattle); // Legacy endpoint, uses new engine
router.post('/:id/resolve', authenticateToken, resolveBattle); // New endpoint with full battle log
router.get('/my', authenticateToken, getUserBattles);
router.get('/hero/my', authenticateToken, getMyHeroBattles);
router.get('/:id', getBattleById);

module.exports = router;

