const { pool } = require('../config/database');
const { DEFAULT_RATING, K_FACTOR, getTierForRating } = require('../config/ladderConfig');

/**
 * Get current active season
 */
async function getCurrentSeason() {
  const result = await pool.query(
    `SELECT * FROM seasons WHERE is_active = TRUE ORDER BY starts_at DESC LIMIT 1`
  );
  return result.rows[0] || null;
}

/**
 * Get or create heroic ranking for a user in a season
 */
async function getOrCreateRankingForUser(userId, heroNftId, seasonId) {
  const existing = await pool.query(
    `SELECT * FROM heroic_rankings
     WHERE user_id = $1 AND season_id = $2`,
    [userId, seasonId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const insert = await pool.query(
    `INSERT INTO heroic_rankings
       (user_id, hero_nft_id, season_id, rating, highest_rating)
     VALUES ($1, $2, $3, $4, $4)
     RETURNING *`,
    [userId, heroNftId, seasonId, DEFAULT_RATING]
  );

  return insert.rows[0];
}

/**
 * Compute Elo rating change
 * @param {number} ratingA - Current rating of player A
 * @param {number} ratingB - Current rating of player B
 * @param {number} scoreA - Score for player A (1 = win, 0 = loss, 0.5 = draw)
 * @param {number} kFactor - K-factor for Elo calculation
 * @returns {{newRatingA: number, expectedA: number}}
 */
function computeEloChange(ratingA, ratingB, scoreA, kFactor = K_FACTOR) {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const newRatingA = Math.round(ratingA + kFactor * (scoreA - expectedA));
  return { newRatingA, expectedA };
}

/**
 * Apply ranked result after a battle
 * Only processes battles that are heroic AND ranked
 */
async function applyRankedResult({ battle, attackerUserId, defenderUserId, winnerUserId }) {
  const season = await getCurrentSeason();
  if (!season) {
    // No active season; do nothing
    return;
  }

  // Only heroic & ranked
  if (battle.battle_type !== 'heroic' || battle.is_ranked !== true) {
    return;
  }

  // Load heroes (attacker and defender heroes)
  const attackerHeroRes = await pool.query(
    `SELECT hero_nft_id FROM users WHERE id = $1`,
    [attackerUserId]
  );
  const defenderHeroRes = await pool.query(
    `SELECT hero_nft_id FROM users WHERE id = $1`,
    [defenderUserId]
  );

  const attackerHeroId = attackerHeroRes.rows[0]?.hero_nft_id;
  const defenderHeroId = defenderHeroRes.rows[0]?.hero_nft_id;

  if (!attackerHeroId || !defenderHeroId) {
    return; // cannot rank without heroes
  }

  const attackerRanking = await getOrCreateRankingForUser(attackerUserId, attackerHeroId, season.id);
  const defenderRanking = await getOrCreateRankingForUser(defenderUserId, defenderHeroId, season.id);

  const ratingA = attackerRanking.rating;
  const ratingB = defenderRanking.rating;

  // scoreA: 1 if attacker wins, 0 if loses, 0.5 if draw (we don't have draws now)
  const attackerWon = winnerUserId === attackerUserId;
  const scoreA = attackerWon ? 1 : 0;
  const scoreB = 1 - scoreA;

  const { newRatingA } = computeEloChange(ratingA, ratingB, scoreA);
  const { newRatingA: newRatingB } = computeEloChange(ratingB, ratingA, scoreB);

  // Compute streak updates
  const now = new Date();
  const attackerWins = attackerRanking.wins;
  const attackerLosses = attackerRanking.losses;
  const defenderWins = defenderRanking.wins;
  const defenderLosses = defenderRanking.losses;

  const attackerNew = {
    rating: newRatingA,
    wins: attackerWins + (attackerWon ? 1 : 0),
    losses: attackerLosses + (attackerWon ? 0 : 1),
    streak: attackerWon
      ? Math.max(1, (attackerRanking.streak || 0) + 1)
      : Math.min(-1, (attackerRanking.streak || 0) - 1),
    highest_rating: Math.max(attackerRanking.highest_rating, newRatingA),
    last_match_at: now,
  };

  const defenderWon = !attackerWon;
  const defenderNew = {
    rating: newRatingB,
    wins: defenderWins + (defenderWon ? 1 : 0),
    losses: defenderLosses + (defenderWon ? 0 : 1),
    streak: defenderWon
      ? Math.max(1, (defenderRanking.streak || 0) + 1)
      : Math.min(-1, (defenderRanking.streak || 0) - 1),
    highest_rating: Math.max(defenderRanking.highest_rating, newRatingB),
    last_match_at: now,
  };

  await pool.query(
    `UPDATE heroic_rankings
        SET rating = $1,
            wins = $2,
            losses = $3,
            streak = $4,
            highest_rating = $5,
            last_match_at = $6
      WHERE id = $7`,
    [
      attackerNew.rating,
      attackerNew.wins,
      attackerNew.losses,
      attackerNew.streak,
      attackerNew.highest_rating,
      attackerNew.last_match_at,
      attackerRanking.id,
    ]
  );

  await pool.query(
    `UPDATE heroic_rankings
        SET rating = $1,
            wins = $2,
            losses = $3,
            streak = $4,
            highest_rating = $5,
            last_match_at = $6
      WHERE id = $7`,
    [
      defenderNew.rating,
      defenderNew.wins,
      defenderNew.losses,
      defenderNew.streak,
      defenderNew.highest_rating,
      defenderNew.last_match_at,
      defenderRanking.id,
    ]
  );
}

/**
 * Close a season and grant rewards
 * Marks season as inactive and mints on-chain rewards
 */
async function closeSeasonAndGrantRewards(seasonId) {
  const { pool } = require('../config/database');
  const rewardService = require('./rewardService');

  // Mark season as inactive
  await pool.query(
    `UPDATE seasons SET is_active = FALSE WHERE id = $1`,
    [seasonId]
  );

  console.log(`Season ${seasonId} marked as inactive. Granting rewards...`);

  // Grant on-chain rewards
  await rewardService.grantSeasonEndRewards(seasonId);

  console.log(`Season ${seasonId} closed and rewards granted.`);
}

module.exports = {
  getCurrentSeason,
  getOrCreateRankingForUser,
  applyRankedResult,
  closeSeasonAndGrantRewards,
};

