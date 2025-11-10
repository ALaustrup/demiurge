const { getUserHero, forgeHero, getOrCreateHeroForUser, regenerateHeroForUser } = require('../services/heroService');

/**
 * Get current user's hero
 */
const getMyHero = async (req, res) => {
  try {
    const hero = await getUserHero(req.user.id);

    if (!hero) {
      return res.json({ hero: null });
    }

    res.json({ hero });
  } catch (error) {
    console.error('Get my hero error:', error);
    res.status(500).json({ message: 'Failed to get hero' });
  }
};

/**
 * Forge a new hero (idempotent - returns existing if already exists)
 */
const forgeHeroEndpoint = async (req, res) => {
  try {
    const hero = await getOrCreateHeroForUser(req.user.id);

    res.json({
      message: hero.id ? 'Hero retrieved' : 'Hero forged successfully',
      hero,
    });
  } catch (error) {
    console.error('Forge hero error:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to forge hero: ' + error.message });
  }
};

/**
 * Regenerate hero (retire old, create new)
 */
const regenerateHero = async (req, res) => {
  try {
    const result = await regenerateHeroForUser(req.user.id);

    res.json({
      message: 'Hero regenerated successfully',
      ...result,
    });
  } catch (error) {
    console.error('Regenerate hero error:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'No Heroic DNFT to regenerate') {
      return res.status(400).json({ message: error.message });
    }
    if (error.message === 'Regeneration limit reached') {
      return res.status(403).json({ message: error.message });
    }
    if (error.message.includes('Not enough Bits')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to regenerate hero: ' + error.message });
  }
};

module.exports = {
  getMyHero,
  forgeHero: forgeHeroEndpoint,
  regenerateHero,
};

