import { useQuery } from '@tanstack/react-query';
import {
  getDailyDigest,
  getDashboardStats,
  getPeakUsage,
  getSubscriptions,
} from '@/services/api/stats.api';
import { getDistance } from '@/services/api/location.api';

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

export function useSubscriptions() {
  return useQuery({
    queryKey: ['stats', 'subscriptions'],
    queryFn: getSubscriptions,
  });
}

export function usePeakUsage() {
  return useQuery({
    queryKey: ['stats', 'peak-usage'],
    queryFn: getPeakUsage,
  });
}

export function useDistance() {
  return useQuery({
    queryKey: ['stats', 'distance'],
    queryFn: () => getDistance(),
  });
}
