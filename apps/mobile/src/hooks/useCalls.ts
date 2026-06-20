import { useEffect } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import type { CallListParams } from '@yes-boss/shared';
import { CallSyncItem, listCalls, syncCalls } from '@/services/api/calls.api';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setCalls } from '@/store/slices/callsSlice';

const PAGE_SIZE = 20;

type ListFilters = Omit<CallListParams, 'page' | 'limit'>;

export function useCallList(filters: ListFilters) {
  const dispatch = useAppDispatch();
  const cache = useAppSelector(s => s.calls);
  // Only the unfiltered list maps cleanly onto the persisted snapshot.
  const seedable = Object.keys(filters).length === 0 && cache.pagination != null;

  const query = useInfiniteQuery({
    queryKey: ['calls', filters],
    queryFn: ({ pageParam }) =>
      listCalls({ ...filters, page: pageParam, limit: PAGE_SIZE }),
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

  // Mirror the freshest first page back into the offline cache.
  useEffect(() => {
    if (seedable && query.data?.pages[0]) dispatch(setCalls(query.data.pages[0]));
  }, [seedable, dispatch, query.data]);

  return query;
}

export function useSyncCalls() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: CallSyncItem[]) => syncCalls(items),
    onSuccess: res => {
      Toast.show({ type: 'success', text1: res.message });
      qc.invalidateQueries({ queryKey: ['calls'] });
    },
    onError: err => {
      Toast.show({
        type: 'error',
        text1: err instanceof Error ? err.message : 'Call sync failed',
      });
    },
  });
}
