import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getMyHero, forgeHero, regenerateHero, Hero } from '@/utils/heroApi';

interface HeroState {
  hero: Hero | null;
  loading: boolean;
  loadHero: () => Promise<void>;
  forgeHero: () => Promise<void>;
  setHero: (hero: Hero | null) => void;
}

export const useHeroStore = create<HeroState>()(
  persist(
    (set) => ({
      hero: null,
      loading: false,
      loadHero: async () => {
        set({ loading: true });
        try {
          const { hero } = await getMyHero();
          set({ hero, loading: false });
        } catch (error) {
          console.error('Error loading hero:', error);
          set({ hero: null, loading: false });
        }
      },
      forgeHero: async () => {
        set({ loading: true });
        try {
          const { hero } = await forgeHero();
          set({ hero, loading: false });
        } catch (error) {
          console.error('Error forging hero:', error);
          set({ loading: false });
          throw error;
        }
      },
      regenerateHero: async () => {
        set({ loading: true });
        try {
          const result = await regenerateHero();
          set({ hero: result.hero, loading: false });
          return result;
        } catch (error) {
          console.error('Error regenerating hero:', error);
          set({ loading: false });
          throw error;
        }
      },
      setHero: (hero) => set({ hero }),
    }),
    {
      name: 'hero-storage',
    }
  )
);

