import { createBrowserProvider } from './web3Provider';

/**
 * Shorten an Ethereum address for display
 * @param addr - Full Ethereum address
 * @param length - Number of characters to show on each side (default: 4)
 * @returns Shortened address (e.g., "0x1234…5678")
 */
export function shortenAddress(addr: string, length = 4): string {
  if (!addr) return '';
  if (addr.length <= length * 2 + 2) return addr; // Already short enough
  return addr.slice(0, 2 + length) + '…' + addr.slice(-length);
}

/**
 * Resolve ENS name for an address (mainnet only)
 * @param address - Ethereum address to resolve
 * @returns ENS name or null if not found/not on mainnet
 */
export async function resolveEnsName(address: string): Promise<string | null> {
  try {
    const provider = createBrowserProvider();
    if (!provider) return null;
    // ENS typically only on mainnet; this will just return null on other chains
    const name = await provider.lookupAddress(address);
    return name || null;
  } catch {
    return null;
  }
}

