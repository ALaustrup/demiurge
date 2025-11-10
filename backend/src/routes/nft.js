const express = require('express');
const router = express.Router();
const {
  createNFT,
  getUserNFTs,
  getNFTById,
  getAllNFTs,
  levelUpNFT,
} = require('../controllers/nftController');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, createNFT);
router.get('/my', authenticateToken, getUserNFTs);
router.get('/gallery', getAllNFTs);
router.get('/:id', getNFTById);
router.post('/:id/level-up', authenticateToken, levelUpNFT);

module.exports = router;

