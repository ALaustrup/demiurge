const express = require('express');
const router = express.Router();
const {
  createBattle,
  completeBattle,
  getUserBattles,
  getBattleById,
} = require('../controllers/battleController');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, createBattle);
router.post('/:battleId/complete', authenticateToken, completeBattle);
router.get('/my', authenticateToken, getUserBattles);
router.get('/:id', getBattleById);

module.exports = router;

