import { useCallback, useEffect, useMemo } from 'react';
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
import {
  addCategoryOptimistic,
  addPendingTxn,
  removeCategoryOptimistic,
  setCategories,
  setConfig,
  setTodayInsights,
  updateCategoryOptimistic,
} from '@/store/slices/financeSlice';
import { enqueueOp } from '@/store/slices/pendingOpsSlice';

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

function uuid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Spending insights for a period.
 * For the daily view, pending offline txns are blended into the totals so the
 * user sees live calculations even without a connection.
 */
export function useInsights(period: Period) {
  const dispatch = useAppDispatch();
  const cached = useAppSelector(s => s.finance.todayInsights);
  const pendingTxns = useAppSelector(s => s.finance.pendingTxns);
  const range = periodRange(period);

  const query = useQuery({
    queryKey: ['finance', 'insights', period],
    queryFn: () => getInsights({ from: range.from, to: range.to }),
    initialData: period === 'daily' ? envelope<SpendingInsights>(cached) : undefined,
  });

  if (period === 'daily' && query.data?.data) {
    dispatch(setTodayInsights(query.data.data));
  }

  // Blend pending txns into the insights data for offline display.
  const blended = (() => {
    if (!pendingTxns.length || !query.data?.data) return query.data;
    const base = query.data.data;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const fromMs = new Date(range.from).getTime();
    const toMs = new Date(range.to).getTime();

    // Only include pending txns that fall within the current period.
    const relevant = pendingTxns.filter(t => {
      const ts = t.occurredAt ? new Date(t.occurredAt).getTime() : Date.now();
      return ts >= fromMs && ts <= toMs;
    });
    if (!relevant.length) return query.data;

    const extraDebit = relevant
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amountMinor, 0);
    const extraCredit = relevant
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amountMinor, 0);

    // Merge into byCategory.
    const cats = [...base.byCategory];
    for (const t of relevant.filter(r => r.type === 'debit' && r.category)) {
      const idx = cats.findIndex(c => c.category === t.category);
      if (idx !== -1) {
        cats[idx] = { ...cats[idx], totalMinor: cats[idx].totalMinor + t.amountMinor };
      } else {
        cats.push({ category: t.category!, color: '#64748B', totalMinor: t.amountMinor, percent: 0 });
      }
    }
    const newTotal = base.totalSpent + extraDebit - extraCredit;
    const recalcedCats = cats.map(c => ({
      ...c,
      percent: newTotal > 0 ? Math.round((c.totalMinor / newTotal) * 100) : 0,
    }));

    return {
      ...query.data,
      data: { ...base, totalSpent: Math.max(0, newTotal), byCategory: recalcedCats },
    };
  })();

  return { ...query, data: blended, range };
}

export function useCategories() {
  const dispatch = useAppDispatch();
  const cached = useAppSelector(s => s.finance.categories);
  const query = useQuery({
    queryKey: ['finance', 'categories'],
    queryFn: getCategories,
    initialData: cached.length ? envelope<Category[]>(cached) : undefined,
  });
  // Only sync to Redux when fresh data arrived from network (fetchStatus idle
  // after a real fetch). Skipping initialData prevents overwriting optimistic
  // offline adds.
  const { data, fetchStatus } = query;
  useEffect(() => {
    if (data?.data && fetchStatus === 'idle') dispatch(setCategories(data.data));
  }, [data, fetchStatus, dispatch]);
  // Always return live Redux state so optimistic offline adds are immediately
  // visible — query.data is a stale snapshot that doesn't reflect local updates.
  const liveData = useMemo(() => envelope<Category[]>(cached), [cached]);
  return { ...query, data: liveData };
}

export function useFinanceConfig() {
  const dispatch = useAppDispatch();
  const cached = useAppSelector(s => s.finance.config);
  const query = useQuery({
    queryKey: ['finance', 'config'],
    queryFn: getFinanceConfig,
    initialData: envelope<FinanceConfig>(cached),
  });
  if (query.data?.data) dispatch(setConfig(query.data.data));
  return query;
}

function useFinanceInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['finance'] });
    qc.invalidateQueries({ queryKey: ['sms-txns'] });
    qc.invalidateQueries({ queryKey: ['stats'] });
  };
}

export function useAddManualTxn() {
  const dispatch = useAppDispatch();
  const isConnected = useAppSelector(s => s.network.isConnected);
  const invalidate = useFinanceInvalidate();

  const onlineMutation = useMutation({
    mutationFn: (input: ManualTxnInput) => addManualTxn(input),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Transaction added' });
      invalidate();
    },
    onError: err =>
      Toast.show({ type: 'error', text1: err instanceof Error ? err.message : 'Add failed' }),
  });

  const mutate = useCallback(
    (input: ManualTxnInput, opts?: { onSuccess?: () => void }) => {
      if (isConnected === false) {
        const localId = uuid();
        dispatch(addPendingTxn({ ...input, localId, createdAt: new Date().toISOString() }));
        dispatch(
          enqueueOp({
            id: uuid(),
            type: 'addManualTxn',
            payload: { ...input, localId },
            createdAt: new Date().toISOString(),
          }),
        );
        Toast.show({ type: 'success', text1: 'Saved offline — will sync when connected' });
        opts?.onSuccess?.();
      } else {
        onlineMutation.mutate(input, { onSuccess: opts?.onSuccess });
      }
    },
    [dispatch, isConnected, onlineMutation],
  );

  return { mutate, isPending: onlineMutation.isPending };
}

export function useSaveCategory() {
  const dispatch = useAppDispatch();
  const isConnected = useAppSelector(s => s.network.isConnected);
  const invalidate = useFinanceInvalidate();

  const onlineCreate = useMutation({
    mutationFn: (input: CreateCategoryInput) => createCategory(input),
    onSuccess: () => invalidate(),
  });
  const onlineUpdate = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateCategoryInput }) =>
      updateCategory(id, patch),
    onSuccess: () => invalidate(),
  });
  const onlineRemove = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => invalidate(),
  });

  const create = {
    isPending: onlineCreate.isPending,
    mutate: useCallback(
      (input: CreateCategoryInput, opts?: { onSuccess?: () => void }) => {
        if (isConnected === false) {
          const tempId = uuid();
          dispatch(
            addCategoryOptimistic({
              id: tempId,
              name: input.name,
              color: input.color ?? '#64748B',
              dailyBudgetMinor: input.dailyBudgetMinor ?? null,
              sortOrder: 999,
            }),
          );
          dispatch(
            enqueueOp({
              id: uuid(),
              type: 'createCategory',
              payload: { ...input, tempId },
              createdAt: new Date().toISOString(),
            }),
          );
          Toast.show({ type: 'success', text1: 'Category saved offline' });
          opts?.onSuccess?.();
        } else {
          onlineCreate.mutate(input, { onSuccess: opts?.onSuccess });
        }
      },
      [dispatch, isConnected, onlineCreate],
    ),
  };

  const update = {
    isPending: onlineUpdate.isPending,
    mutate: useCallback(
      (args: { id: string; patch: UpdateCategoryInput }, opts?: { onSuccess?: () => void }) => {
        if (isConnected === false) {
          dispatch(updateCategoryOptimistic({ id: args.id, patch: args.patch }));
          dispatch(
            enqueueOp({
              id: uuid(),
              type: 'updateCategory',
              payload: args,
              createdAt: new Date().toISOString(),
            }),
          );
          Toast.show({ type: 'success', text1: 'Category updated offline' });
          opts?.onSuccess?.();
        } else {
          onlineUpdate.mutate(args, { onSuccess: opts?.onSuccess });
        }
      },
      [dispatch, isConnected, onlineUpdate],
    ),
  };

  const remove = {
    isPending: onlineRemove.isPending,
    mutate: useCallback(
      (id: string, opts?: { onSuccess?: () => void }) => {
        if (isConnected === false) {
          dispatch(removeCategoryOptimistic(id));
          dispatch(
            enqueueOp({
              id: uuid(),
              type: 'deleteCategory',
              payload: { id },
              createdAt: new Date().toISOString(),
            }),
          );
          Toast.show({ type: 'success', text1: 'Category deleted offline' });
          opts?.onSuccess?.();
        } else {
          onlineRemove.mutate(id, { onSuccess: opts?.onSuccess });
        }
      },
      [dispatch, isConnected, onlineRemove],
    ),
  };

  void dispatch;
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
