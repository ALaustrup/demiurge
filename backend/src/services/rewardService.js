const { pool } = require('../config/database');
const { signer } = require('../config/web3');
const contracts = require('../config/contracts');
const { RANK_REWARD_CONFIG } = require('../config/rewardsConfig');
const { getTierForRating } = require('../config/ladderConfig');
const { ethers } = require('ethers');

// Contract ABIs (simplified - in production, use full ABIs)
const cosmeticsAbi = [
  'function mintReward(address to, uint256 id, uint256 amount) external',
  'function mintBatchReward(address to, uint256[] calldata ids, uint256[] calldata amounts) external',
];

const titlesAbi = [
  'function mintTitle(address to) external returns (uint256)',
  'function mintTitleWithMetadata(address to, uint256 seasonId, string memory titleName) external returns (uint256)',
];

const seasonPassAbi = [
  'function hasPass(address account, uint256 seasonId) external view returns (bool)',
];

let cosmeticsContract;
let titlesContract;
let seasonPassContract;

// Initialize contract instances
function initializeContracts() {
  if (!signer) {
    console.warn('⚠️  Signer not available. Reward minting will fail.');
    return;
  }

  try {
    if (contracts.DEMIURGE_COSMETICS_ADDRESS && contracts.DEMIURGE_COSMETICS_ADDRESS !== '0x0000000000000000000000000000000000000000') {
      cosmeticsContract = new ethers.Contract(contracts.DEMIURGE_COSMETICS_ADDRESS, cosmeticsAbi, signer);
    }
    if (contracts.DEMIURGE_TITLES_ADDRESS && contracts.DEMIURGE_TITLES_ADDRESS !== '0x0000000000000000000000000000000000000000') {
      titlesContract = new ethers.Contract(contracts.DEMIURGE_TITLES_ADDRESS, titlesAbi, signer);
    }
    if (contracts.DEMIURGE_SEASON_PASS_ADDRESS && contracts.DEMIURGE_SEASON_PASS_ADDRESS !== '0x0000000000000000000000000000000000000000') {
      seasonPassContract = new ethers.Contract(contracts.DEMIURGE_SEASON_PASS_ADDRESS, seasonPassAbi, signer);
    }
  } catch (error) {
    console.error('Error initializing contracts:', error);
  }
}

// Initialize on module load
initializeContracts();

/**
 * Get heroic leaderboard for a season
 */
async function getHeroicLeaderboardForSeason(seasonId, limit = 1000) {
  const result = await pool.query(
    `SELECT hr.*, u.wallet_address, u.username
     FROM heroic_rankings hr
     JOIN users u ON u.id = hr.user_id
     WHERE hr.season_id = $1
     ORDER BY hr.rating DESC
     LIMIT $2`,
    [seasonId, limit]
  );
  return result.rows;
}

/**
 * Check if user has a season pass for the given season
 */
async function checkSeasonPass(wallet, seasonId) {
  if (!seasonPassContract || !wallet) {
    return false;
  }
  try {
    return await seasonPassContract.hasPass(wallet, seasonId);
  } catch (error) {
    console.error('Error checking season pass:', error);
    return false;
  }
}

/**
 * Grant season-end rewards to ranked players
 */
async function grantSeasonEndRewards(seasonId) {
  if (!signer) {
    throw new Error('Reward signer not configured. Cannot mint rewards.');
  }

  if (!cosmeticsContract || !titlesContract) {
    throw new Error('Reward contracts not configured. Please set contract addresses.');
  }

  const leaderboard = await getHeroicLeaderboardForSeason(seasonId, 1000);
  if (leaderboard.length === 0) {
    console.log(`No players in season ${seasonId} to reward.`);
    return;
  }

  console.log(`Granting rewards for season ${seasonId} to ${leaderboard.length} players...`);

  let rewardedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < leaderboard.length; i++) {
    const row = leaderboard[i];
    const rank = i + 1;
    const wallet = row.wallet_address;

    if (!wallet) {
      console.warn(`Skipping user ${row.user_id} (${row.username}): no wallet address`);
      continue;
    }

    let rewardTier = null;

    // Determine reward tier based on rank
    if (rank <= RANK_REWARD_CONFIG.mythic.maxRank) {
      rewardTier = 'mythic';
    } else if (rank <= RANK_REWARD_CONFIG.diamond.maxRank) {
      rewardTier = 'diamond';
    } else if (rank <= RANK_REWARD_CONFIG.gold.maxRank) {
      rewardTier = 'gold';
    } else if (row.rating >= RANK_REWARD_CONFIG.participant.minRating) {
      rewardTier = 'participant';
    }

    if (!rewardTier) {
      continue; // No reward for this player
    }

    const config = RANK_REWARD_CONFIG[rewardTier];

    try {
      // 1) Mint cosmetics
      if (config.cosmeticsIds && config.cosmeticsIds.length > 0) {
        if (config.cosmeticsIds.length === 1) {
          // Single mint
          const tx = await cosmeticsContract.mintReward(wallet, config.cosmeticsIds[0], 1);
          await tx.wait();
          console.log(`✓ Minted cosmetic ${config.cosmeticsIds[0]} to ${wallet} (rank ${rank}, ${rewardTier})`);
        } else {
          // Batch mint
          const amounts = config.cosmeticsIds.map(() => 1);
          const tx = await cosmeticsContract.mintBatchReward(wallet, config.cosmeticsIds, amounts);
          await tx.wait();
          console.log(`✓ Minted cosmetics [${config.cosmeticsIds.join(', ')}] to ${wallet} (rank ${rank}, ${rewardTier})`);
        }
      }

      // 2) Mint title (for non-participant tiers)
      if (config.titleName) {
        const tx2 = await titlesContract.mintTitleWithMetadata(wallet, seasonId, config.titleName);
        const receipt = await tx2.wait();
        // Extract tokenId from Transfer event (ERC721 standard)
        let tokenId = 'unknown';
        try {
          const transferEvent = receipt.logs.find(log => {
            try {
              const parsed = titlesContract.interface.parseLog(log);
              return parsed && parsed.name === 'Transfer';
            } catch {
              return false;
            }
          });
          if (transferEvent) {
            const parsed = titlesContract.interface.parseLog(transferEvent);
            tokenId = parsed.args[2]?.toString() || 'unknown';
          }
        } catch (err) {
          // Fallback: tokenId will be 'unknown'
        }
        console.log(`✓ Minted title "${config.titleName}" (tokenId: ${tokenId}) to ${wallet} (rank ${rank})`);
      }

      // 3) TODO: Season Pass bonus
      // Check if user has a season pass and grant extra rewards
      const hasPass = await checkSeasonPass(wallet, seasonId);
      if (hasPass) {
        // Example: Grant bonus cosmetic for pass holders
        // const bonusIds = [201];
        // const bonusAmounts = [1];
        // const tx3 = await cosmeticsContract.mintBatchReward(wallet, bonusIds, bonusAmounts);
        // await tx3.wait();
        console.log(`  → User ${wallet} has season pass (bonus rewards TODO)`);
      }

      rewardedCount++;
    } catch (error) {
      errorCount++;
      console.error(`✗ Error granting rewards to ${wallet} (rank ${rank}):`, error.message);
      // Continue with next player instead of failing completely
    }
  }

  console.log(`\n=== Season ${seasonId} Rewards Summary ===`);
  console.log(`Total players: ${leaderboard.length}`);
  console.log(`Rewarded: ${rewardedCount}`);
  console.log(`Errors: ${errorCount}`);
}

module.exports = {
  grantSeasonEndRewards,
  checkSeasonPass,
  getHeroicLeaderboardForSeason,
};

