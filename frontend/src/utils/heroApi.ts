import api from './api';

export interface Hero {
  id: number;
  tokenId: number;
  name: string;
  description: string;
  affinity: string;
  level: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  experience: number;
  isHeroic: boolean;
  isDynamic: boolean;
  isSoulbound: boolean;
  heroicUsernameInscription: string;
  mediaUrl?: string;
  ipfsHash?: string;
  tokenUri?: string;
}

export async function getMyHero(): Promise<{ hero: Hero | null }> {
  const res = await api.get('/hero/me');
  return res.data;
}

export async function forgeHero(): Promise<{ message: string; hero: Hero }> {
  const res = await api.post('/hero/forge');
  return res.data;
}

export async function regenerateHero(): Promise<{
  message: string;
  hero: Hero;
  regenerationsUsed: number;
  regenerationsLimit: number;
  bitsSpent: number;
}> {
  const res = await api.post('/hero/regenerate');
  return res.data;
}

export async function getMyHeroBattles(): Promise<{ battles: any[]; count: number }> {
  const res = await api.get('/battle/hero/my');
  return res.data;
}

