import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import type { SmsTxnListParams, SmsTxnSyncItem } from '@yes-boss/shared';
import {
  getSpendingSummary,
  listSmsTxns,
  syncSmsTxns,
} from '@/services/api/smsTxn.api';

const PAGE_SIZE = 20;

type ListFilters = Omit<SmsTxnListParams, 'page' | 'limit'>;

export function useSmsTxnList(filters: ListFilters) {
  return useInfiniteQuery({
    queryKey: ['sms-txns', filters],
    queryFn: ({ pageParam }) =>
      listSmsTxns({ ...filters, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: last =>
      last.pagination.hasNextPage ? last.pagination.currentPage + 1 : undefined,
  });
}

export function useSpendingSummary(range: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: ['sms-txns', 'summary', range],
    queryFn: () => getSpendingSummary(range),
  });
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
