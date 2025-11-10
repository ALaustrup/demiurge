/**
 * Reward Tier Configuration
 * 
 * Defines reward tiers based on final ranking position and rating thresholds.
 * Cosmetic IDs map to items in the DemiurgeCosmetics contract metadata.
 */

const RANK_REWARD_CONFIG = {
  mythic: {
    maxRank: 1,
    titleName: 'Season Mythic Champion',
    cosmeticsIds: [101, 102], // Special frame + aura
  },
  diamond: {
    maxRank: 10,
    titleName: 'Top 10 Demiurge',
    cosmeticsIds: [103], // Diamond frame
  },
  gold: {
    maxRank: 100,
    titleName: 'Top 100 Warlord',
    cosmeticsIds: [104], // Gold badge
  },
  participant: {
    minRating: 1200,
    titleName: null, // No title for participants
    cosmeticsIds: [105], // Participation badge
  },
};

module.exports = {
  RANK_REWARD_CONFIG,
};

