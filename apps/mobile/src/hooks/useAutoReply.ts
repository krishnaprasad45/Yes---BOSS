import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import type { AutoReplyConfig, ItemResponse, UpdateAutoReplyConfig } from '@yes-boss/shared';
import {
  getAutoReplyConfig,
  updateAutoReplyConfig,
} from '@/services/api/settings.api';
import { getDeviceToken } from '@/services/api/auth.api';
import { BASE_URL } from '@/services/api/client';
import {
  isAutoReplyAvailable,
  pushAutoReplyConfig,
  pushRecapAuth,
  requestAutoReplyPermissions,
} from '@/services/autoReply/nativeAutoReply';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { patchAutoReplyOptimistic, setAutoReply } from '@/store/slices/settingsSlice';
import { enqueueOp } from '@/store/slices/pendingOpsSlice';

const KEY = ['settings', 'auto-reply'];

/**
 * Auto-reply config — Redux is the source of truth so the UI is instant and
 * works offline. Writes apply optimistically; when offline they're queued
 * (pendingOps) and replayed on reconnect. Server response always wins.
 */
export function useAutoReply() {
  const dispatch = useAppDispatch();
  const config = useAppSelector(s => s.settings.autoReply);
  const isConnected = useAppSelector(s => s.network.isConnected);

  const query = useQuery({
    queryKey: KEY,
    queryFn: getAutoReplyConfig,
    initialData: config
      ? ({ data: config, message: '', status: 'success', statusCode: 200 } as ItemResponse<
          AutoReplyConfig
        >)
      : undefined,
  });

  // Server refresh → cache.
  useEffect(() => {
    if (query.data?.data) dispatch(setAutoReply(query.data.data));
  }, [dispatch, query.data]);

  // Mirror config to native SharedPreferences whenever it changes.
  useEffect(() => {
    if (config) pushAutoReplyConfig(config).catch(() => {});
  }, [config]);

  // When recap is on, hand the background worker a long-lived token + base URL.
  const authPushed = useRef(false);
  useEffect(() => {
    if (!config?.recapEnabled || authPushed.current) return;
    authPushed.current = true;
    getDeviceToken()
      .then(res => pushRecapAuth(`${BASE_URL}/api/v1`, res.data.deviceToken))
      .catch(() => {
        authPushed.current = false; // allow a retry on next config change
      });
  }, [config?.recapEnabled]);

  const [isSaving, setSaving] = useState(false);

  const save = useCallback(
    async (patch: UpdateAutoReplyConfig) => {
      try {
        // Turning the feature on requires SMS + phone-state permission.
        if (patch.enabled && isAutoReplyAvailable()) {
          const granted = await requestAutoReplyPermissions();
          if (!granted) throw new Error('SMS / phone permission denied');
        }

        // Optimistic: update cache + native immediately.
        dispatch(patchAutoReplyOptimistic(patch));

        if (isConnected === false) {
          // Offline — queue the write, drained on reconnect (server wins later).
          dispatch(
            enqueueOp({
              id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
              type: 'updateAutoReply',
              payload: patch,
              createdAt: new Date().toISOString(),
            }),
          );
          Toast.show({ type: 'success', text1: 'Saved — will sync when online' });
          return;
        }

        setSaving(true);
        const res = await updateAutoReplyConfig(patch);
        dispatch(setAutoReply(res.data));
        await pushAutoReplyConfig(res.data);
        Toast.show({ type: 'success', text1: 'Auto-reply saved' });
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: err instanceof Error ? err.message : 'Save failed',
        });
      } finally {
        setSaving(false);
      }
    },
    [dispatch, isConnected, setSaving],
  );

  return { config: config ?? undefined, isLoading: query.isLoading && !config, save, isSaving };
}
