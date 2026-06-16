import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import type { Call } from '@yes-boss/shared';
import { generateRecap, getRecapStatus } from '@/services/api/calls.api';

export function useRecapStatus() {
  return useQuery({
    queryKey: ['calls', 'recap-status'],
    queryFn: getRecapStatus,
    staleTime: 5 * 60 * 1000,
  });
}

/** Triggers recap generation and refreshes the call lists on success. */
export function useGenerateRecap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ callId, force }: { callId: string; force?: boolean }) =>
      generateRecap(callId, force),
    onSuccess: res => {
      Toast.show({ type: 'success', text1: 'Recap ready' });
      qc.invalidateQueries({ queryKey: ['calls'] });
    },
    onError: err => {
      Toast.show({
        type: 'error',
        text1: err instanceof Error ? err.message : 'Recap failed',
      });
    },
  });
}

export type { Call };
