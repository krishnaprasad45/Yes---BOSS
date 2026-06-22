import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import type {
  Category,
  CreateCategoryInput,
  FinanceConfig,
  ItemResponse,
  ManualTxnInput,
  SpendingInsights,
  UpdateCategoryInput,
  UpdateFinanceConfigInput,
} from '@yes-boss/shared';
import {
  addManualTxn,
  createCategory,
  deleteCategory,
  getCategories,
  getFinanceConfig,
  getInsights,
  updateCategory,
  updateFinanceConfig,
} from '@/services/api/finance.api';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setCategories, setConfig, setTodayInsights } from '@/store/slices/financeSlice';

export type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

/** Inclusive ISO bounds for the selected period (local time). */
export function periodRange(period: Period): { from: string; to: string; days: number } {
  const now = new Date();
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  let days = 1;
  if (period === 'weekly') {
    from.setDate(from.getDate() - 6);
    days = 7;
  } else if (period === 'monthly') {
    from.setDate(1);
    days = now.getDate();
  } else if (period === 'yearly') {
    from.setMonth(0, 1);
    days = Math.floor((now.getTime() - from.getTime()) / 86_400_000) + 1;
  }
  return { from: from.toISOString(), to: to.toISOString(), days };
}

function envelope<T>(data: T | null): ItemResponse<T> | undefined {
  return data == null ? undefined : { data, message: '', status: 'success', statusCode: 200 };
}

/** Spending insights for a period; seeds the daily view from the offline cache. */
export function useInsights(period: Period) {
  const dispatch = useAppDispatch();
  const cached = useAppSelector(s => s.finance.todayInsights);
  const range = periodRange(period);
  const query = useQuery({
    queryKey: ['finance', 'insights', period],
    queryFn: () => getInsights({ from: range.from, to: range.to }),
    initialData: period === 'daily' ? envelope<SpendingInsights>(cached) : undefined,
  });
  useEffect(() => {
    if (period === 'daily' && query.data?.data) dispatch(setTodayInsights(query.data.data));
  }, [period, dispatch, query.data]);
  return { ...query, range };
}

export function useCategories() {
  const dispatch = useAppDispatch();
  const cached = useAppSelector(s => s.finance.categories);
  const query = useQuery({
    queryKey: ['finance', 'categories'],
    queryFn: getCategories,
    initialData: cached.length ? envelope<Category[]>(cached) : undefined,
  });
  useEffect(() => {
    if (query.data?.data) dispatch(setCategories(query.data.data));
  }, [dispatch, query.data]);
  return query;
}

export function useFinanceConfig() {
  const dispatch = useAppDispatch();
  const cached = useAppSelector(s => s.finance.config);
  const query = useQuery({
    queryKey: ['finance', 'config'],
    queryFn: getFinanceConfig,
    initialData: envelope<FinanceConfig>(cached),
  });
  useEffect(() => {
    if (query.data?.data) dispatch(setConfig(query.data.data));
  }, [dispatch, query.data]);
  return query;
}

/** Invalidate everything a write touches (insights + categories + lists). */
function useFinanceInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['finance'] });
    qc.invalidateQueries({ queryKey: ['sms-txns'] });
  };
}

export function useAddManualTxn() {
  const invalidate = useFinanceInvalidate();
  return useMutation({
    mutationFn: (input: ManualTxnInput) => addManualTxn(input),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Transaction added' });
      invalidate();
    },
    onError: err =>
      Toast.show({ type: 'error', text1: err instanceof Error ? err.message : 'Add failed' }),
  });
}

export function useSaveCategory() {
  const dispatch = useAppDispatch();
  const invalidate = useFinanceInvalidate();
  const create = useMutation({
    mutationFn: (input: CreateCategoryInput) => createCategory(input),
    onSuccess: () => invalidate(),
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateCategoryInput }) =>
      updateCategory(id, patch),
    onSuccess: () => invalidate(),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => invalidate(),
  });
  void dispatch; // categories refresh via invalidate → useCategories writeback
  return { create, update, remove };
}

export function useUpdateFinanceConfig() {
  const dispatch = useAppDispatch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateFinanceConfigInput) => updateFinanceConfig(patch),
    onSuccess: res => {
      dispatch(setConfig(res.data));
      qc.setQueryData(['finance', 'config'], res);
    },
    onError: err =>
      Toast.show({ type: 'error', text1: err instanceof Error ? err.message : 'Save failed' }),
  });
}
