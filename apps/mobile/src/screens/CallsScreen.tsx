import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Call, CallDirection } from '@yes-boss/shared';
import { useCallList } from '@/hooks/useCalls';
import { useCallBackup } from '@/hooks/useCallBackup';
import { CallCard } from '@/components/feature/CallCard';

const FILTERS: { key: CallDirection | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'incoming', label: 'In' },
  { key: 'outgoing', label: 'Out' },
  { key: 'missed', label: 'Missed' },
];

/** Smart container: direction filter + call backup trigger. */
export function CallsScreen() {
  const [dirFilter, setDirFilter] = useState<CallDirection | 'all'>('all');
  const filters = useMemo(
    () => ({ direction: dirFilter === 'all' ? undefined : dirFilter }),
    [dirFilter],
  );

  const { backup, isBackingUp } = useCallBackup();
  const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage, error } =
    useCallList(filters);

  const calls: Call[] = data?.pages.flatMap(p => p.data) ?? [];

  return (
    <FlatList
      style={styles.list}
      data={calls}
      keyExtractor={c => c.id}
      renderItem={({ item }) => <CallCard call={item} />}
      onEndReached={() => hasNextPage && fetchNextPage()}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
      ListHeaderComponent={
        <View>
          <View style={styles.header}>
            <Text style={styles.title}>Calls</Text>
            <TouchableOpacity
              style={[styles.syncBtn, isBackingUp && styles.syncBtnDisabled]}
              disabled={isBackingUp}
              onPress={backup}>
              {isBackingUp ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.syncBtnText}>Back up</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.filterRow}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.chip, dirFilter === f.key && styles.chipActive]}
                onPress={() => setDirFilter(f.key)}>
                <Text style={[styles.chipText, dirFilter === f.key && styles.chipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      }
      ListEmptyComponent={
        isLoading ? (
          <ActivityIndicator style={styles.empty} size="large" />
        ) : (
          <Text style={styles.empty}>
            {error ? error.message : 'No calls yet. Tap "Back up" to sync your call log.'}
          </Text>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: { fontSize: 28, fontWeight: '700' },
  syncBtn: {
    backgroundColor: '#111',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    minWidth: 88,
    alignItems: 'center',
  },
  syncBtnDisabled: { opacity: 0.5 },
  syncBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  chipActive: { backgroundColor: '#111' },
  chipText: { fontSize: 14, color: '#555' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#888', marginTop: 48, paddingHorizontal: 32 },
});
