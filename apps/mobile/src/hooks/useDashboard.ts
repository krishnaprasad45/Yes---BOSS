import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ItemResponse } from '@yes-boss/shared';
import {
  getDailyDigest,
  getDashboardStats,
  getPeakUsage,
  getSubscriptions,
} from '@/services/api/stats.api';
import { getDistance } from '@/services/api/location.api';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setDigest,
  setDistance,
  setOverview,
  setPeakUsage,
  setSubscriptions,
} from '@/store/slices/statsSlice';

/** Wrap a cached value in the standard ItemResponse envelope screens expect. */
function envelope<T>(data: T | null): ItemResponse<T> | undefined {
  return data == null ? undefined : { data, message: '', status: 'success', statusCode: 200 };
}

export function useDashboardStats(range?: { from?: string; to?: string }) {
  const dispatch = useAppDispatch();
  const cached = useAppSelector(s => s.stats.overview);
  const query = useQuery({
    queryKey: ['stats', 'overview', range ?? {}],
    queryFn: () => getDashboardStats(range),
    initialData: envelope(cached),
  });
  useEffect(() => {
    if (query.data?.data) dispatch(setOverview(query.data.data));
  }, [dispatch, query.data]);
  return query;
}

export function useDailyDigest(date?: string) {
  const dispatch = useAppDispatch();
  const cached = useAppSelector(s => s.stats.digest);
  const query = useQuery({
    queryKey: ['stats', 'digest', date ?? 'today'],
    queryFn: () => getDailyDigest(date),
    initialData: envelope(cached),
  });
  useEffect(() => {
    if (query.data?.data) dispatch(setDigest(query.data.data));
  }, [dispatch, query.data]);
  return query;
}

export function useSubscriptions() {
  const dispatch = useAppDispatch();
  const cached = useAppSelector(s => s.stats.subscriptions);
  const query = useQuery({
    queryKey: ['stats', 'subscriptions'],
    queryFn: getSubscriptions,
    initialData: cached.length ? envelope(cached) : undefined,
  });
  useEffect(() => {
    if (query.data?.data) dispatch(setSubscriptions(query.data.data));
  }, [dispatch, query.data]);
  return query;
}

export function usePeakUsage() {
  const dispatch = useAppDispatch();
  const cached = useAppSelector(s => s.stats.peakUsage);
  const query = useQuery({
    queryKey: ['stats', 'peak-usage'],
    queryFn: getPeakUsage,
    initialData: cached.length ? envelope(cached) : undefined,
  });
  useEffect(() => {
    if (query.data?.data) dispatch(setPeakUsage(query.data.data));
  }, [dispatch, query.data]);
  return query;
}

export function useDistance() {
  const dispatch = useAppDispatch();
  const cached = useAppSelector(s => s.stats.distance);
  const query = useQuery({
    queryKey: ['stats', 'distance'],
    queryFn: () => getDistance(),
    initialData: envelope(cached),
  });
  useEffect(() => {
    if (query.data?.data) dispatch(setDistance(query.data.data));
  }, [dispatch, query.data]);
  return query;
}
