'use client';

import { useEffect, useState } from 'react';
import { createBrowserProvider, getInjectedProvider, isOnDemiurgeChain } from '../utils/web3Provider';
import { switchToDemiurgeNetwork } from '../utils/network';

export function useWalletConnection() {
  const [address, setAddress] = useState<string | null>(null);
  const [chainIdHex, setChainIdHex] = useState<string | null>(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const injected = getInjectedProvider();
    if (!injected) return;

    async function init() {
      try {
        const provider = createBrowserProvider();
        if (!provider) return;

        const network = await provider.getNetwork();
        const chainId = network.chainId; // bigint in ethers v6
        const hex = '0x' + Number(chainId).toString(16);
        setChainIdHex(hex);
        setIsCorrectNetwork(isOnDemiurgeChain(hex));

        const accounts: string[] = await injected.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          setAddress(accounts[0]);
        }
      } catch (err) {
        console.error('Error initializing wallet connection', err);
      }
    }

    init();

    function handleAccountsChanged(accounts: string[]) {
      if (!accounts || accounts.length === 0) {
        setAddress(null);
        // Don't auto-logout; let user decide
      } else {
        setAddress(accounts[0]);
      }
    }

    function handleChainChanged(chainId: string) {
      // Some wallets send chainId as hex, some as decimal string
      let hex: string;
      if (typeof chainId === 'string' && chainId.startsWith('0x')) {
        hex = chainId.toLowerCase();
      } else {
        hex = '0x' + Number(chainId).toString(16);
      }
      setChainIdHex(hex);
      setIsCorrectNetwork(isOnDemiurgeChain(hex));
    }

    injected.on('accountsChanged', handleAccountsChanged);
    injected.on('chainChanged', handleChainChanged);

    return () => {
      injected.removeListener('accountsChanged', handleAccountsChanged);
      injected.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  async function connectWallet() {
    const injected = getInjectedProvider();
    if (!injected) {
      throw new Error('No Web3 wallet detected. Please install MetaMask or a compatible wallet.');
    }

    setIsConnecting(true);
    try {
      const provider = createBrowserProvider();
      if (!provider) throw new Error('No provider.');

      const accounts: string[] = await injected.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        const addr = accounts[0];
        setAddress(addr);

        // Update chain info
        const network = await provider.getNetwork();
        const chainId = network.chainId;
        const hex = '0x' + Number(chainId).toString(16);
        setChainIdHex(hex);
        setIsCorrectNetwork(isOnDemiurgeChain(hex));
      }
    } finally {
      setIsConnecting(false);
    }
  }

  async function ensureDemiurgeNetwork() {
    await switchToDemiurgeNetwork();
    // Refresh chain info after switch
    const provider = createBrowserProvider();
    if (provider) {
      const network = await provider.getNetwork();
      const chainId = network.chainId;
      const hex = '0x' + Number(chainId).toString(16);
      setChainIdHex(hex);
      setIsCorrectNetwork(isOnDemiurgeChain(hex));
    }
  }

  return {
    address,
    chainIdHex,
    isCorrectNetwork,
    isConnecting,
    connectWallet,
    ensureDemiurgeNetwork,
  };
}

