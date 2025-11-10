const { ethers } = require('ethers');

/**
 * Web3 Provider and Signer Configuration
 * Used for on-chain reward minting and contract interactions
 */

const RPC_URL = process.env.DEMIURGE_RPC_URL || process.env.RPC_URL || 'http://localhost:8545';
const PRIVATE_KEY = process.env.DEMIURGE_REWARD_SIGNER_PK || process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.warn('⚠️  WARNING: DEMIURGE_REWARD_SIGNER_PK not set. Reward minting will fail.');
}

let provider;
let signer;

try {
  provider = new ethers.JsonRpcProvider(RPC_URL);
  
  if (PRIVATE_KEY) {
    signer = new ethers.Wallet(PRIVATE_KEY, provider);
    console.log('✅ Reward signer initialized:', signer.address);
  } else {
    console.warn('⚠️  No private key provided. Signer not initialized.');
  }
} catch (error) {
  console.error('❌ Error initializing Web3 provider:', error.message);
  provider = null;
  signer = null;
}

module.exports = {
  provider,
  signer,
  RPC_URL,
};

