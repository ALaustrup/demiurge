const { pool } = require('../config/database');

/**
 * Get user profile
 */
const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT id, username, wallet_address, bits, social_score, social_tier, created_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's NFT count
    const nftCountResult = await pool.query(
      'SELECT COUNT(*) FROM nfts WHERE owner_id = $1',
      [userId]
    );

    // Get user's battle stats
    const battleStatsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_battles,
        COUNT(CASE WHEN winner_id = $1 THEN 1 END) as wins
       FROM battles
       WHERE attacker_id = $1 OR defender_id = $1`,
      [userId]
    );

    const user = result.rows[0];
    const battleStats = battleStatsResult.rows[0];

    res.json({
      id: user.id,
      username: user.username,
      walletAddress: user.wallet_address,
      bits: user.bits,
      socialScore: user.social_score,
      socialTier: user.social_tier,
      createdAt: user.created_at,
      stats: {
        nftCount: parseInt(nftCountResult.rows[0].count),
        totalBattles: parseInt(battleStats.total_battles),
        wins: parseInt(battleStats.wins),
        losses: parseInt(battleStats.total_battles) - parseInt(battleStats.wins),
      },
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Failed to get user profile' });
  }
};

/**
 * Update social score and tier
 */
const updateSocialScore = async (req, res) => {
  try {
    const { userId } = req.params;
    const { bits } = req.body;

    if (userId != req.user.id) {
      return res.status(403).json({ message: 'Cannot update other user\'s score' });
    }

    // Calculate social score based on bits
    const socialScore = Math.floor(bits / 10);

    // Determine tier based on social score
    let socialTier = 'bronze';
    if (socialScore >= 1000) {
      socialTier = 'diamond';
    } else if (socialScore >= 500) {
      socialTier = 'platinum';
    } else if (socialScore >= 250) {
      socialTier = 'gold';
    } else if (socialScore >= 100) {
      socialTier = 'silver';
    }

    await pool.query(
      'UPDATE users SET social_score = $1, social_tier = $2 WHERE id = $3',
      [socialScore, socialTier, userId]
    );

    res.json({
      message: 'Social score updated',
      socialScore,
      socialTier,
    });
  } catch (error) {
    console.error('Update social score error:', error);
    res.status(500).json({ message: 'Failed to update social score' });
  }
};

/**
 * Get leaderboard
 */
const getLeaderboard = async (req, res) => {
  try {
    const { type = 'social_score', limit = 100 } = req.query;

    let orderBy = 'social_score DESC';
    if (type === 'bits') {
      orderBy = 'bits DESC';
    } else if (type === 'nfts') {
      // This would require a more complex query
      orderBy = 'social_score DESC';
    }

    const result = await pool.query(
      `SELECT id, username, wallet_address, bits, social_score, social_tier
       FROM users
       ORDER BY ${orderBy}
       LIMIT $1`,
      [limit]
    );

    res.json({
      leaderboard: result.rows,
      type,
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ message: 'Failed to get leaderboard' });
  }
};

module.exports = {
  getUserProfile,
  updateSocialScore,
  getLeaderboard,
};

