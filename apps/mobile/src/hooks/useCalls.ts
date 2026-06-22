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
  const seedable = cache.items.length > 0 && cache.pagination != null;

  // Filter cached snapshot client-side so offline view respects direction / time
  // bounds even when the server is unreachable.
  const seededItems = seedable
    ? cache.items.filter(c => {
        if (filters.direction && c.direction !== filters.direction) return false;
        if (filters.from && c.occurredAt < filters.from) return false;
        if (filters.to && c.occurredAt > filters.to) return false;
        if (filters.search) {
          const s = filters.search.toLowerCase();
          if (!c.phoneNumber.includes(s) && !(c.contactName ?? '').toLowerCase().includes(s))
            return false;
        }
        return true;
      })
    : [];

  const query = useInfiniteQuery({
    queryKey: ['calls', filters],
    queryFn: ({ pageParam }) =>
      listCalls({ ...filters, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: last =>
      last.pagination.hasNextPage ? last.pagination.currentPage + 1 : undefined,
    initialData: seedable
      ? {
          pages: [
            {
              data: seededItems,
              pagination: {
                itemCount: seededItems.length,
                pageCount: 1,
                currentPage: 1,
                hasNextPage: false,
              },
              message: '',
            },
          ],
          pageParams: [1],
        }
      : undefined,
  });

  // Mirror the unfiltered first page back into the offline cache.
  const noFilters =
    !filters.direction && !filters.search && !filters.from && !filters.to;
  useEffect(() => {
    if (noFilters && query.data?.pages[0]) dispatch(setCalls(query.data.pages[0]));
  }, [noFilters, dispatch, query.data]);

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
