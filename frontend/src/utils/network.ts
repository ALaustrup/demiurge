import { DEMIURGE_CHAIN } from '../config/web3Config';
import { getInjectedProvider } from './web3Provider';

/**
 * Switch to Demiurge network, or add it if not present
 */
export async function switchToDemiurgeNetwork(): Promise<void> {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new Error('No injected wallet provider found.');
  }

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: DEMIURGE_CHAIN.chainIdHex }],
    });
  } catch (err: any) {
    // 4902 = chain not added
    if (err?.code === 4902 || (err?.message || '').includes('Unrecognized chain ID')) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: DEMIURGE_CHAIN.chainIdHex,
            chainName: DEMIURGE_CHAIN.name,
            rpcUrls: DEMIURGE_CHAIN.rpcUrls,
            blockExplorerUrls: DEMIURGE_CHAIN.blockExplorerUrls,
            nativeCurrency: DEMIURGE_CHAIN.nativeCurrency,
          },
        ],
      });
      return;
    }
    throw err;
  }
}

