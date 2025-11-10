const { ethers } = require('ethers');
// Note: Contract ABIs should be loaded from artifacts after compilation
// For now, we'll use a placeholder approach - in production, load from artifacts
const getContractABI = (contractName) => {
  // This would normally load from artifacts
  // For now, return empty array - will need to be populated after contract compilation
  return [];
};

const provider = new ethers.JsonRpcProvider(
  process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8545'
);

// Contract addresses (should be loaded from deployments.json or env)
const CONTRACT_ADDRESSES = {
  NFT: process.env.NFT_CONTRACT_ADDRESS,
  MARKETPLACE: process.env.MARKETPLACE_CONTRACT_ADDRESS,
  WARS: process.env.WARS_CONTRACT_ADDRESS,
};

/**
 * Get contract instance
 * Note: In production, load ABIs from compiled artifacts
 */
const getNFTContract = (signer) => {
  const abi = getContractABI('DemiurgeNFT');
  return new ethers.Contract(CONTRACT_ADDRESSES.NFT, abi, signer || provider);
};

const getMarketplaceContract = (signer) => {
  const abi = getContractABI('NFTMarketplace');
  return new ethers.Contract(CONTRACT_ADDRESSES.MARKETPLACE, abi, signer || provider);
};

const getWarsContract = (signer) => {
  const abi = getContractABI('NFTWars');
  return new ethers.Contract(CONTRACT_ADDRESSES.WARS, abi, signer || provider);
};

/**
 * Mint NFT
 */
const mintNFT = async (privateKey, to, tokenURI, ipfsHash, name, description, mediaType) => {
  try {
    const wallet = new ethers.Wallet(privateKey, provider);
    const nftContract = getNFTContract(wallet);
    
    const tx = await nftContract.mintNFT(
      to,
      tokenURI,
      ipfsHash,
      name,
      description,
      mediaType
    );
    
    const receipt = await tx.wait();
    const tokenId = receipt.logs[0].args.tokenId.toString();
    
    return { tokenId, txHash: receipt.hash };
  } catch (error) {
    console.error('Mint NFT error:', error);
    throw new Error('Failed to mint NFT');
  }
};

/**
 * List NFT on marketplace
 */
const listNFT = async (privateKey, tokenId, price) => {
  try {
    const wallet = new ethers.Wallet(privateKey, provider);
    const marketplaceContract = getMarketplaceContract(wallet);
    
    const tx = await marketplaceContract.listNFT(tokenId, ethers.parseEther(price.toString()));
    const receipt = await tx.wait();
    
    return { txHash: receipt.hash };
  } catch (error) {
    console.error('List NFT error:', error);
    throw new Error('Failed to list NFT');
  }
};

/**
 * Buy NFT from marketplace
 */
const buyNFT = async (privateKey, tokenId, price) => {
  try {
    const wallet = new ethers.Wallet(privateKey, provider);
    const marketplaceContract = getMarketplaceContract(wallet);
    
    const tx = await marketplaceContract.buyNFT(tokenId, {
      value: ethers.parseEther(price.toString()),
    });
    const receipt = await tx.wait();
    
    return { txHash: receipt.hash };
  } catch (error) {
    console.error('Buy NFT error:', error);
    throw new Error('Failed to buy NFT');
  }
};

/**
 * Initiate battle
 */
const initiateBattle = async (privateKey, attackerTokenId, defenderTokenId) => {
  try {
    const wallet = new ethers.Wallet(privateKey, provider);
    const warsContract = getWarsContract(wallet);
    
    const tx = await warsContract.initiateBattle(attackerTokenId, defenderTokenId);
    const receipt = await tx.wait();
    
    const battleId = receipt.logs[0].args.battleId.toString();
    return { battleId, txHash: receipt.hash };
  } catch (error) {
    console.error('Initiate battle error:', error);
    throw new Error('Failed to initiate battle');
  }
};

/**
 * Get user's NFTs
 */
const getUserNFTs = async (userAddress) => {
  try {
    const nftContract = getNFTContract();
    const tokenIds = await nftContract.getTokensByOwner(userAddress);
    
    const nfts = [];
    for (const tokenId of tokenIds) {
      const tokenURI = await nftContract.tokenURI(tokenId);
      const metadata = await nftContract.getNFTMetadata(tokenId);
      nfts.push({
        tokenId: tokenId.toString(),
        tokenURI,
        ...metadata,
      });
    }
    
    return nfts;
  } catch (error) {
    console.error('Get user NFTs error:', error);
    throw new Error('Failed to get user NFTs');
  }
};

module.exports = {
  getNFTContract,
  getMarketplaceContract,
  getWarsContract,
  mintNFT,
  listNFT,
  buyNFT,
  initiateBattle,
  getUserNFTs,
};

