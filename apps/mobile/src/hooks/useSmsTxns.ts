import { useEffect } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import type { ItemResponse, SmsTxnListParams, SmsTxnSyncItem } from '@yes-boss/shared';
import {
  getSpendingSummary,
  listSmsTxns,
  syncSmsTxns,
} from '@/services/api/smsTxn.api';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSmsTxns, setSpendingSummary } from '@/store/slices/smsTxnsSlice';

const PAGE_SIZE = 20;

type ListFilters = Omit<SmsTxnListParams, 'page' | 'limit'>;

export function useSmsTxnList(filters: ListFilters) {
  const dispatch = useAppDispatch();
  const cache = useAppSelector(s => s.smsTxns);
  const seedable = Object.keys(filters).length === 0 && cache.pagination != null;

  const query = useInfiniteQuery({
    queryKey: ['sms-txns', filters],
    queryFn: ({ pageParam }) =>
      listSmsTxns({ ...filters, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: last =>
      last.pagination.hasNextPage ? last.pagination.currentPage + 1 : undefined,
    initialData: seedable
      ? {
          pages: [{ data: cache.items, pagination: cache.pagination!, message: '' }],
          pageParams: [1],
        }
      : undefined,
  });

  useEffect(() => {
    if (seedable && query.data?.pages[0]) dispatch(setSmsTxns(query.data.pages[0]));
  }, [seedable, dispatch, query.data]);

  return query;
}

export function useSpendingSummary(range: { from?: string; to?: string } = {}) {
  const dispatch = useAppDispatch();
  const cached = useAppSelector(s => s.smsTxns.summary);
  const noFilter = !range.from && !range.to;
  const query = useQuery({
    queryKey: ['sms-txns', 'summary', range],
    queryFn: () => getSpendingSummary(range),
    initialData:
      noFilter && cached
        ? ({ data: cached, message: '', status: 'success', statusCode: 200 } as ItemResponse<
            typeof cached
          >)
        : undefined,
  });
  useEffect(() => {
    if (noFilter && query.data?.data) dispatch(setSpendingSummary(query.data.data));
  }, [noFilter, dispatch, query.data]);
  return query;
}

export function useSyncSmsTxns() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: SmsTxnSyncItem[]) => syncSmsTxns(items),
    onSuccess: res => {
      Toast.show({ type: 'success', text1: res.message });
      qc.invalidateQueries({ queryKey: ['sms-txns'] });
    },
    onError: err => {
      Toast.show({
        type: 'error',
        text1: err instanceof Error ? err.message : 'Sync failed',
      });
    },
  });
}
