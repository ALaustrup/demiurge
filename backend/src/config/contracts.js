/**
 * Contract Addresses Configuration
 * 
 * These addresses should be set via environment variables in production.
 * For local development, they can be set here or loaded from deployments.json
 */

module.exports = {
  DEMIURGE_NFT_ADDRESS: process.env.DEMIURGE_NFT_ADDRESS || '0x0000000000000000000000000000000000000000',
  DEMIURGE_COSMETICS_ADDRESS: process.env.DEMIURGE_COSMETICS_ADDRESS || '0x0000000000000000000000000000000000000000',
  DEMIURGE_TITLES_ADDRESS: process.env.DEMIURGE_TITLES_ADDRESS || '0x0000000000000000000000000000000000000000',
  DEMIURGE_SEASON_PASS_ADDRESS: process.env.DEMIURGE_SEASON_PASS_ADDRESS || '0x0000000000000000000000000000000000000000',
};

