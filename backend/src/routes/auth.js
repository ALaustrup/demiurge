const express = require('express');
const router = express.Router();
const { register, login, getProfile } = require('../controllers/authController');
const { challenge, verify } = require('../controllers/walletAuthController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authenticateToken, getProfile);

// Wallet authentication routes
router.post('/wallet/challenge', challenge);
router.post('/wallet/verify', optionalAuth, verify); // Optional auth for linking

module.exports = router;

