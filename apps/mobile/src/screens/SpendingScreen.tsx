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
import type { SmsTxn, TxnType } from '@yes-boss/shared';
import { useSmsTxnList, useSpendingSummary } from '@/hooks/useSmsTxns';
import { SmsTxnCard } from '@/components/feature/SmsTxnCard';
import { SpendingSummaryCards } from '@/components/feature/SpendingSummaryCards';

const FILTERS: { key: TxnType | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'debit', label: 'Spent' },
  { key: 'credit', label: 'Received' },
  { key: 'payment_due', label: 'Due' },
];

/** Smart container: owns the type filter, wires hooks to dumb components. */
export function SpendingScreen() {
  const [typeFilter, setTypeFilter] = useState<TxnType | 'all'>('all');

  const filters = useMemo(
    () => ({ type: typeFilter === 'all' ? undefined : typeFilter }),
    [typeFilter],
  );

  const summary = useSpendingSummary();
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    error,
  } = useSmsTxnList(filters);

  const txns: SmsTxn[] = data?.pages.flatMap(p => p.data) ?? [];

  return (
    <FlatList
      style={styles.list}
      data={txns}
      keyExtractor={t => t.id}
      renderItem={({ item }) => <SmsTxnCard txn={item} />}
      onEndReached={() => hasNextPage && fetchNextPage()}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => {
            refetch();
            summary.refetch();
          }}
        />
      }
      ListHeaderComponent={
        <View>
          <Text style={styles.title}>Spending</Text>
          {summary.data && <SpendingSummaryCards summary={summary.data.data} />}
          <View style={styles.filterRow}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.chip, typeFilter === f.key && styles.chipActive]}
                onPress={() => setTypeFilter(f.key)}>
                <Text style={[styles.chipText, typeFilter === f.key && styles.chipTextActive]}>
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
            {error ? error.message : 'No transactions yet. Sync SMS to get started.'}
          </Text>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700', paddingHorizontal: 16, paddingTop: 16 },
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
