/**
 * NFT Vault Limits by Social Tier
 * null = effectively unlimited
 */
const NFT_VAULT_LIMITS = {
  bronze: 100,
  silver: 250,
  gold: 500,
  platinum: 1000,
  diamond: null, // null = effectively unlimited
};

/**
 * Get vault limit for a given social tier
 * @param {string} socialTier - User's social tier (bronze, silver, gold, platinum, diamond)
 * @returns {number|null} - The vault limit, or null if unlimited
 */
function getVaultLimitForTier(socialTier) {
  const tier = (socialTier || 'bronze').toLowerCase();
  const limit = NFT_VAULT_LIMITS[tier];
  return typeof limit === 'number' ? limit : null;
}

module.exports = {
  NFT_VAULT_LIMITS,
  getVaultLimitForTier,
};

