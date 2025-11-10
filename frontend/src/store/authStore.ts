import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { walletLoginOrLink } from '@/utils/walletAuthClient';

interface User {
  id: number;
  username: string;
  email: string | null;
  walletAddress: string | null;
  bits: number;
  socialScore: number;
  socialTier: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  walletLoginOrLink: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      walletLoginOrLink: async () => {
        await walletLoginOrLink();
        // Auth store will be updated by walletLoginOrLink via setAuth
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

