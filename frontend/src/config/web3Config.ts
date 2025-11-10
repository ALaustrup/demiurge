/**
 * Demiurge Web3 Network Configuration
 * 
 * TODO: Update these values to match the actual Demiurge target network.
 * For now, using Polygon mainnet as an example.
 * Replace with actual chain ID, RPC URLs, and native currency when deploying.
 */
export const DEMIURGE_CHAIN = {
  chainIdHex: '0x89', // Polygon mainnet (example) - Replace with actual Demiurge chain
  chainIdDecimal: 137, // Same as above in decimal
  name: 'Demiurge Network', // User-visible name
  rpcUrls: [
    'https://polygon-rpc.com',
    'https://rpc-mainnet.maticvigil.com',
  ], // Replace with actual Demiurge RPC endpoints
  blockExplorerUrls: ['https://polygonscan.com'], // Optional - Replace with actual explorer
  nativeCurrency: {
    name: 'MATIC', // Replace with actual native currency name (e.g., "DEMI", "ETH")
    symbol: 'MATIC', // 2-6 characters
    decimals: 18,
  },
};

