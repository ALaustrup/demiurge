import { createBrowserProvider, getInjectedProvider } from './web3Provider';
import api from './api';
import { useAuthStore } from '@/store/authStore';

/**
 * Complete wallet login or link flow
 * 1. Connect wallet
 * 2. Request challenge from backend
 * 3. Sign challenge
 * 4. Verify signature with backend
 * 5. Update auth store
 */
export const walletLoginOrLink = async (): Promise<void> => {
  try {
    // Step 1: Connect wallet
    const injected = getInjectedProvider();
    if (!injected) {
      throw new Error('No EVM wallet detected. Please install MetaMask or a compatible wallet.');
    }

    const provider = createBrowserProvider();
    if (!provider) {
      throw new Error('No provider available.');
    }

    // Request account access
    await injected.request({ method: 'eth_requestAccounts' });
    
    // Get signer and address
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    // Step 2: Request challenge from backend
    const challengeResponse = await api.post('/auth/wallet/challenge', {
      address,
    });

    const { message } = challengeResponse.data;

    // Step 3: Sign message with wallet
    let signature: string;
    try {
      signature = await signer.signMessage(message);
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('Signature rejected. Wallet login cancelled.');
      }
      throw new Error('Failed to sign message: ' + (error.message || 'Unknown error'));
    }

    // Step 4: Verify signature with backend
    // Include existing JWT if user is logged in (for linking)
    const verifyResponse = await api.post(
      '/auth/wallet/verify',
      {
        address,
        signature,
      }
      // Token will be automatically included via axios interceptor if user is logged in
    );

    const { token, user } = verifyResponse.data;

    // Step 5: Update auth store
    useAuthStore.getState().setAuth(user, token);
  } catch (error: any) {
    // Re-throw with user-friendly messages
    if (error.message?.includes('No EVM wallet detected')) {
      throw new Error('No EVM wallet detected. Please install MetaMask or a compatible wallet.');
    }
    
    if (error.message?.includes('Signature rejected')) {
      throw new Error('Signature rejected. Wallet login cancelled.');
    }
    
    if (error.response?.status === 401) {
      throw new Error(error.response?.data?.message || 'Invalid wallet signature. Please try again.');
    }
    
    if (error.response?.status === 409) {
      throw new Error(error.response?.data?.message || 'This wallet is already linked to another account.');
    }
    
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    
    throw new Error(error.message || 'Wallet authentication failed');
  }
};

