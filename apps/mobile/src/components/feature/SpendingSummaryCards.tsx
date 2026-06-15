import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SpendingSummary } from '@yes-boss/shared';
import { formatMinor } from '@/utils/formatters';

/** Dumb: the three headline numbers + category breakdown. */
export function SpendingSummaryCards({ summary }: { summary: SpendingSummary }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Stat label="Spent" value={formatMinor(summary.totalSpent)} color="#c0392b" />
        <Stat label="Received" value={formatMinor(summary.totalCredited)} color="#27ae60" />
      </View>
      <View style={styles.row}>
        <Stat label="Net" value={formatMinor(summary.totalCredited - summary.totalSpent)} color="#111" />
        <Stat label="Bills due" value={String(summary.dueCount)} color="#d35400" />
      </View>

      {summary.byCategory.length > 0 && (
        <View style={styles.catBlock}>
          <Text style={styles.catTitle}>Top spend categories</Text>
          {summary.byCategory.slice(0, 5).map(c => (
            <View key={c.category} style={styles.catRow}>
              <Text style={styles.catName}>{c.category}</Text>
              <Text style={styles.catAmt}>{formatMinor(c.totalMinor)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  stat: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
  },
  statLabel: { fontSize: 13, color: '#777' },
  statValue: { fontSize: 22, fontWeight: '700', marginTop: 4 },
  catBlock: { marginTop: 4, backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16 },
  catTitle: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 8 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  catName: { fontSize: 15, color: '#333', textTransform: 'capitalize' },
  catAmt: { fontSize: 15, fontWeight: '600', color: '#111' },
});
