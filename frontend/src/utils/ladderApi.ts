import api from './api';

export interface HeroicRanking {
  rating: number;
  wins: number;
  losses: number;
  streak: number;
  highest_rating: number;
  tier: string;
  hero_nft_id: number;
}

export interface Season {
  id: number;
  name: string;
  starts_at: string;
  ends_at: string;
}

export interface LeaderboardEntry extends HeroicRanking {
  userId: number;
  username: string;
}

export async function getMyHeroicRanking(): Promise<{
  season: Season | null;
  ranking: HeroicRanking | null;
}> {
  const res = await api.get('/ladder/heroic/me');
  return res.data;
}

export async function getHeroicLeaderboard(limit = 50, offset = 0): Promise<{
  season: Season | null;
  entries: LeaderboardEntry[];
}> {
  const res = await api.get('/ladder/heroic/leaderboard', {
    params: { limit, offset },
  });
  return res.data;
}

