const { pool } = require('../config/database');
const { getVaultLimitForTier } = require('../config/storageConfig');

/**
 * Get count of NFTs owned by a user (excluding heroes and retired heroes)
 * @param {number} userId - User ID
 * @returns {Promise<number>} - Count of NFTs
 */
async function getUserNftCount(userId) {
  const result = await pool.query(
    `SELECT COUNT(*) AS count
     FROM nfts
     WHERE owner_id = $1
       AND (is_heroic = FALSE OR is_heroic IS NULL)
       AND (is_hero_retired = FALSE OR is_hero_retired IS NULL)`,
    [userId]
  );
  return parseInt(result.rows[0].count, 10);
}

/**
 * Check if user can create a new NFT
 * @param {object} user - User object with id and social_tier
 * @returns {Promise<{allowed: boolean, used: number, limit: number|null}>}
 */
async function canUserCreateNft(user) {
  const limit = getVaultLimitForTier(user.social_tier);
  if (limit === null) {
    // No cap (Diamond / unlimited)
    const used = await getUserNftCount(user.id);
    return { allowed: true, limit: null, used };
  }

  const used = await getUserNftCount(user.id);
  const allowed = used < limit;

  return { allowed, used, limit };
}

/**
 * Enforce NFT vault limit - throws error if limit reached
 * @param {object} user - User object with id and social_tier
 * @throws {Error} - Error with code 'VAULT_LIMIT_REACHED' if limit reached
 */
async function enforceUserNftLimitOrThrow(user) {
  const { allowed, used, limit } = await canUserCreateNft(user);
  if (!allowed) {
    const error = new Error('NFT vault limit reached for your tier.');
    error.code = 'VAULT_LIMIT_REACHED';
    error.meta = { used, limit };
    throw error;
  }
}

module.exports = {
  getUserNftCount,
  canUserCreateNft,
  enforceUserNftLimitOrThrow,
};

