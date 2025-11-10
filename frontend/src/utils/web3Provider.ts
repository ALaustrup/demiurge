import { BrowserProvider } from 'ethers';
import { DEMIURGE_CHAIN } from '../config/web3Config';

declare global {
  interface Window {
    ethereum?: any;
  }
}

/**
 * Safely get the injected Ethereum provider (SSR-safe)
 */
export function getInjectedProvider(): any | null {
  if (typeof window === 'undefined') return null;
  const { ethereum } = window;
  if (!ethereum) return null;
  return ethereum;
}

/**
 * Create a BrowserProvider instance from the injected provider
 */
export function createBrowserProvider(): BrowserProvider | null {
  const injected = getInjectedProvider();
  if (!injected) return null;
  return new BrowserProvider(injected);
}

/**
 * Convert decimal chain ID to hex string
 */
export function getChainIdHex(chainIdDecimal: number): string {
  return '0x' + chainIdDecimal.toString(16);
}

/**
 * Check if the current chain ID matches Demiurge network
 */
export function isOnDemiurgeChain(chainIdHex: string | number | bigint | null | undefined): boolean {
  if (chainIdHex == null) return false;
  let hex: string;
  if (typeof chainIdHex === 'string') {
    hex = chainIdHex.toLowerCase();
  } else {
    hex = '0x' + Number(chainIdHex).toString(16);
  }
  return hex === DEMIURGE_CHAIN.chainIdHex.toLowerCase();
}

/**
 * Check if a Web3 wallet is available
 */
export function isWalletAvailable(): boolean {
  return getInjectedProvider() !== null;
}

