const express = require('express');
const router = express.Router();
const { getMyHero, forgeHero, regenerateHero } = require('../controllers/heroController');
const { authenticateToken } = require('../middleware/auth');

router.get('/me', authenticateToken, getMyHero);
router.post('/forge', authenticateToken, forgeHero);
router.post('/regenerate', authenticateToken, regenerateHero);

module.exports = router;

