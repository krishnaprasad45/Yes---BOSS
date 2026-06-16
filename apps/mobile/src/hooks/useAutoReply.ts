import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import type { AutoReplyConfig, UpdateAutoReplyConfig } from '@yes-boss/shared';
import {
  getAutoReplyConfig,
  updateAutoReplyConfig,
} from '@/services/api/settings.api';
import {
  isAutoReplyAvailable,
  pushAutoReplyConfig,
  requestAutoReplyPermissions,
} from '@/services/autoReply/nativeAutoReply';

const KEY = ['settings', 'auto-reply'];

/**
 * Reads the auto-reply config and keeps the native SharedPreferences store
 * (which the background receiver reads) mirrored to it.
 */
export function useAutoReply() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn: getAutoReplyConfig,
  });

  // Mirror server config to native whenever it loads/changes.
  const config: AutoReplyConfig | undefined = query.data?.data;
  useEffect(() => {
    if (config) pushAutoReplyConfig(config).catch(() => {});
  }, [config]);

  const mutation = useMutation({
    mutationFn: async (patch: UpdateAutoReplyConfig) => {
      // Turning the feature on requires SMS + phone-state permission.
      if (patch.enabled && isAutoReplyAvailable()) {
        const granted = await requestAutoReplyPermissions();
        if (!granted) throw new Error('SMS / phone permission denied');
      }
      const res = await updateAutoReplyConfig(patch);
      await pushAutoReplyConfig(res.data);
      return res;
    },
    onSuccess: res => {
      qc.setQueryData(KEY, res);
      Toast.show({ type: 'success', text1: 'Auto-reply saved' });
    },
    onError: err => {
      Toast.show({
        type: 'error',
        text1: err instanceof Error ? err.message : 'Save failed',
      });
    },
  });

  return { config, isLoading: query.isLoading, save: mutation.mutate, isSaving: mutation.isPending };
}
