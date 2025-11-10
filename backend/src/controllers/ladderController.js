const { pool } = require('../config/database');
const { getCurrentSeason, getOrCreateRankingForUser } = require('../services/ladderService');
const { getTierForRating } = require('../config/ladderConfig');

/**
 * Get current user's Heroic ranking for the current season
 */
const getMyHeroicRanking = async (req, res) => {
  try {
    const user = req.user;
    const season = await getCurrentSeason();

    if (!season) {
      return res.json({
        season: null,
        ranking: null,
      });
    }

    // Get user's hero
    const heroResult = await pool.query(
      'SELECT hero_nft_id FROM users WHERE id = $1',
      [user.id]
    );

    if (!heroResult.rows[0]?.hero_nft_id) {
      return res.json({
        season: {
          id: season.id,
          name: season.name,
          starts_at: season.starts_at,
          ends_at: season.ends_at,
        },
        ranking: null,
      });
    }

    const heroNftId = heroResult.rows[0].hero_nft_id;

    // Get or create ranking
    const ranking = await getOrCreateRankingForUser(user.id, heroNftId, season.id);

    res.json({
      season: {
        id: season.id,
        name: season.name,
        starts_at: season.starts_at,
        ends_at: season.ends_at,
      },
      ranking: {
        rating: ranking.rating,
        wins: ranking.wins,
        losses: ranking.losses,
        streak: ranking.streak,
        highest_rating: ranking.highest_rating,
        tier: getTierForRating(ranking.rating),
        hero_nft_id: ranking.hero_nft_id,
      },
    });
  } catch (error) {
    console.error('Get my heroic ranking error:', error);
    res.status(500).json({ message: 'Failed to get ranking' });
  }
};

/**
 * Get Heroic leaderboard for current season
 */
const getHeroicLeaderboard = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const season = await getCurrentSeason();

    if (!season) {
      return res.json({
        season: null,
        entries: [],
      });
    }

    const result = await pool.query(
      `SELECT hr.*, u.username
       FROM heroic_rankings hr
       JOIN users u ON u.id = hr.user_id
       WHERE hr.season_id = $1
       ORDER BY hr.rating DESC
       LIMIT $2 OFFSET $3`,
      [season.id, parseInt(limit), parseInt(offset)]
    );

    const entries = result.rows.map((row) => ({
      userId: row.user_id,
      username: row.username,
      rating: row.rating,
      wins: row.wins,
      losses: row.losses,
      streak: row.streak,
      tier: getTierForRating(row.rating),
      hero_nft_id: row.hero_nft_id,
      highest_rating: row.highest_rating,
    }));

    res.json({
      season: {
        id: season.id,
        name: season.name,
        starts_at: season.starts_at,
        ends_at: season.ends_at,
      },
      entries,
    });
  } catch (error) {
    console.error('Get heroic leaderboard error:', error);
    res.status(500).json({ message: 'Failed to get leaderboard' });
  }
};

module.exports = {
  getMyHeroicRanking,
  getHeroicLeaderboard,
};

