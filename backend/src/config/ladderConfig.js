const DEFAULT_RATING = 1000;
const K_FACTOR = 32;

// Derived tiers from rating
const RANK_TIERS = [
  { name: 'Bronze', min: 0, max: 1199 },
  { name: 'Silver', min: 1200, max: 1399 },
  { name: 'Gold', min: 1400, max: 1599 },
  { name: 'Platinum', min: 1600, max: 1799 },
  { name: 'Diamond', min: 1800, max: 1999 },
  { name: 'Mythic', min: 2000, max: 9999 },
];

/**
 * Get tier name for a given rating
 * @param {number} rating - Elo rating
 * @returns {string} - Tier name
 */
function getTierForRating(rating) {
  for (const tier of RANK_TIERS) {
    if (rating >= tier.min && rating <= tier.max) {
      return tier.name;
    }
  }
  return 'Unranked';
}

module.exports = {
  DEFAULT_RATING,
  K_FACTOR,
  RANK_TIERS,
  getTierForRating,
};

