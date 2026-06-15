import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SmsTxn } from '@yes-boss/shared';
import { formatDateTime, formatMinor } from '@/utils/formatters';

const TYPE_META: Record<SmsTxn['type'], { label: string; color: string; sign: string }> = {
  debit: { label: 'Spent', color: '#c0392b', sign: '-' },
  credit: { label: 'Received', color: '#27ae60', sign: '+' },
  payment_due: { label: 'Due', color: '#d35400', sign: '' },
  spam: { label: 'Spam', color: '#7f8c8d', sign: '' },
  unknown: { label: 'Other', color: '#7f8c8d', sign: '' },
};

/** Dumb: one transaction row. Props in, JSX out. */
export function SmsTxnCard({ txn }: { txn: SmsTxn }) {
  const meta = TYPE_META[txn.type];
  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <Text style={styles.merchant} numberOfLines={1}>
          {txn.merchant ?? txn.sender}
        </Text>
        <Text style={styles.sub}>
          {meta.label} · {formatDateTime(txn.receivedAt)}
        </Text>
      </View>
      <Text style={[styles.amount, { color: meta.color }]}>
        {txn.amountMinor !== null ? `${meta.sign}${formatMinor(txn.amountMinor)}` : '—'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    gap: 12,
  },
  left: { flex: 1 },
  merchant: { fontSize: 16, fontWeight: '600', color: '#111' },
  sub: { fontSize: 13, color: '#777', marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '700' },
});
