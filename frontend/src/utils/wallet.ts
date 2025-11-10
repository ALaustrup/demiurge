import { BrowserProvider } from 'ethers';

/**
 * Check if window.ethereum is available
 */
export const isWalletAvailable = (): boolean => {
  if (typeof window === 'undefined') return false;
  return typeof (window as any).ethereum !== 'undefined';
};

/**
 * Get the wallet provider (EIP-1193 compatible)
 */
export const getWalletProvider = () => {
  if (!isWalletAvailable()) {
    throw new Error('No EVM wallet detected. Please install MetaMask or a compatible wallet.');
  }
  return (window as any).ethereum;
};

/**
 * Connect to wallet and get address and signer
 */
export const connectWallet = async (): Promise<{ address: string; signer: any }> => {
  const provider = getWalletProvider();
  
  const browserProvider = new BrowserProvider(provider);
  
  // Request account access
  await browserProvider.send('eth_requestAccounts', []);
  
  // Get signer
  const signer = await browserProvider.getSigner();
  const address = await signer.getAddress();
  
  return { address, signer };
};

/**
 * Sign a message with the wallet
 */
export const signChallenge = async (signer: any, message: string): Promise<string> => {
  try {
    const signature = await signer.signMessage(message);
    return signature;
  } catch (error: any) {
    if (error.code === 4001) {
      // User rejected the request
      throw new Error('Signature rejected. Wallet login cancelled.');
    }
    throw new Error('Failed to sign message: ' + (error.message || 'Unknown error'));
  }
};

/**
 * Format address for display (truncate)
 */
export const formatAddress = (address: string, startLength = 6, endLength = 4): string => {
  if (!address) return '';
  if (address.length <= startLength + endLength) return address;
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
};

