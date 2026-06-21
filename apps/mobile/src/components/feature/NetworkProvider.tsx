import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchBulkData } from '@/store/bulkThunk';
import { drainPendingOps } from '@/store/sync';
import { setConnected } from '@/store/slices/networkSlice';
import { WifiOff } from '@/components/ui/icons';
import { font } from '@/theme/theme';
import { useTheme } from '@/theme/ThemeContext';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Palette } from '@/theme/palettes';

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
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
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
          <WifiOff size={13} color={colors.warning} strokeWidth={2.4} />
          <Text style={styles.bannerText}>Offline — showing saved data</Text>
        </View>
      )}
      {children}
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  flex: { flex: 1 },
  banner: {
    backgroundColor: colors.warningSoft,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bannerText: { fontSize: font.size.xs, color: colors.warning, fontWeight: '600' },
  });
