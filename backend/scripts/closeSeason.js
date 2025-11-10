/**
 * Script to close a season and grant rewards
 * 
 * Usage: node backend/scripts/closeSeason.js <seasonId>
 * 
 * Example: node backend/scripts/closeSeason.js 1
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { closeSeasonAndGrantRewards } = require('../src/services/ladderService');

const seasonId = parseInt(process.argv[2]);

if (!seasonId || isNaN(seasonId)) {
  console.error('Usage: node closeSeason.js <seasonId>');
  console.error('Example: node closeSeason.js 1');
  process.exit(1);
}

async function main() {
  try {
    console.log(`Closing season ${seasonId} and granting rewards...`);
    await closeSeasonAndGrantRewards(seasonId);
    console.log('✅ Season closed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error closing season:', error);
    process.exit(1);
  }
}

main();

