import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchBulkData } from '@/store/bulkThunk';
import { drainPendingOps } from '@/store/sync';
import { setConnected } from '@/store/slices/networkSlice';
import { colors, font } from '@/theme/theme';

/**
 * Bridges device connectivity into Redux and orchestrates offline-first sync:
 * - mirrors NetInfo → `network.isConnected`
 * - on (re)connect while authenticated: drains queued writes, then warm-hydrates
 *   every slice from the bulk snapshot
 * - renders a thin "Offline" banner so the user knows data is cached
 *
 * Must live inside <Provider>, <AuthProvider> and below the safe-area inset.
 */
export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAuth();
  const isConnected = useAppSelector(state => state.network.isConnected);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = !!state.isConnected;
      dispatch(setConnected(connected));
      if (connected && isAuthenticated) {
        dispatch(drainPendingOps());
        dispatch(fetchBulkData());
      }
    });
    return () => unsubscribe();
  }, [dispatch, isAuthenticated]);

  // Initial warm hydrate on login / cold start once authenticated.
  useEffect(() => {
    if (isAuthenticated) dispatch(fetchBulkData());
  }, [dispatch, isAuthenticated]);

  return (
    <View style={styles.flex}>
      {isConnected === false && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Offline — showing saved data</Text>
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  banner: {
    backgroundColor: colors.warningSoft,
    paddingVertical: 4,
    alignItems: 'center',
  },
  bannerText: { fontSize: font.size.xs, color: colors.warning, fontWeight: '600' },
});
