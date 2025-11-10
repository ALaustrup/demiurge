const express = require('express');
const router = express.Router();
const {
  sendPrivateMessage,
  sendGlobalMessage,
  getChatHistory,
} = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/auth');

router.post('/private', authenticateToken, sendPrivateMessage);
router.post('/global', authenticateToken, sendGlobalMessage);
router.get('/history', authenticateToken, getChatHistory);

module.exports = router;

