import api from './api';

export interface VaultUsageResponse {
  used: number;
  limit: number | null;
  socialTier: string;
}

export async function getMyVaultUsage(): Promise<VaultUsageResponse> {
  const res = await api.get('/user/me/vault');
  return res.data;
}

