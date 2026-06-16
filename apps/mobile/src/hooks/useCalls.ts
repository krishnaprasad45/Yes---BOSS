import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import type { CallListParams } from '@yes-boss/shared';
import { CallSyncItem, listCalls, syncCalls } from '@/services/api/calls.api';

const PAGE_SIZE = 20;

type ListFilters = Omit<CallListParams, 'page' | 'limit'>;

export function useCallList(filters: ListFilters) {
  return useInfiniteQuery({
    queryKey: ['calls', filters],
    queryFn: ({ pageParam }) =>
      listCalls({ ...filters, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: last =>
      last.pagination.hasNextPage ? last.pagination.currentPage + 1 : undefined,
  });
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
