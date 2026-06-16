import { useQuery } from '@tanstack/react-query';
import { getDailyDigest, getDashboardStats } from '@/services/api/stats.api';

export function useDashboardStats(range?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ['stats', 'overview', range ?? {}],
    queryFn: () => getDashboardStats(range),
  });
}

export function useDailyDigest(date?: string) {
  return useQuery({
    queryKey: ['stats', 'digest', date ?? 'today'],
    queryFn: () => getDailyDigest(date),
  });
}
