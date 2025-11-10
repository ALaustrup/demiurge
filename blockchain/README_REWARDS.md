# On-Chain Rewards System Deployment Guide

## Overview

This guide covers deploying and configuring the on-chain rewards system for Demiurge, including:
- DemiurgeCosmetics (ERC1155)
- DemiurgeTitles (ERC721, soulbound)
- DemiurgeSeasonPass (ERC721)

## Prerequisites

1. Hardhat configured and working
2. Network RPC URL configured
3. Deployer wallet with sufficient funds

## Deployment Steps

### 1. Deploy Reward Contracts

```bash
cd blockchain
npx hardhat run scripts/deployRewards.js --network <your-network>
```

This will deploy all three contracts and save addresses to `deployments.json`.

### 2. Update Backend Configuration

After deployment, update `backend/src/config/contracts.js` or set environment variables:

```bash
export DEMIURGE_COSMETICS_ADDRESS="0x..."
export DEMIURGE_TITLES_ADDRESS="0x..."
export DEMIURGE_SEASON_PASS_ADDRESS="0x..."
```

### 3. Configure Reward Signer

Set the private key for the wallet that will mint rewards (must be contract owner):

```bash
export DEMIURGE_REWARD_SIGNER_PK="0x..."
export DEMIURGE_RPC_URL="https://..."
```

### 4. Verify Contract Ownership

Ensure the reward signer wallet is the owner of all three contracts. If not, transfer ownership:

```solidity
// In Hardhat console or via script
await cosmetics.transferOwnership(rewardSignerAddress);
await titles.transferOwnership(rewardSignerAddress);
await seasonPass.transferOwnership(rewardSignerAddress);
```

## Usage

### Closing a Season and Granting Rewards

```bash
cd backend
node scripts/closeSeason.js <seasonId>
```

Example:
```bash
node scripts/closeSeason.js 1
```

This will:
1. Mark the season as inactive
2. Fetch the leaderboard
3. Mint cosmetics and titles to top players based on their rank

## Reward Tiers

Configured in `backend/src/config/rewardsConfig.js`:

- **Mythic** (Rank 1): Special title + cosmetics set
- **Diamond** (Ranks 2-10): Top 10 title + diamond cosmetic
- **Gold** (Ranks 11-100): Top 100 title + gold badge
- **Participant** (Rating ≥ 1200): Participation badge

## Contract Addresses

After deployment, contract addresses are saved to `blockchain/deployments.json`. Update your backend `.env` file with these addresses.

## Security Notes

- The reward signer private key should be kept secure
- Consider using a hardware wallet or secure key management system in production
- The signer wallet must remain the owner of all reward contracts
- Test reward minting on a testnet before mainnet deployment

