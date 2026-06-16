import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SmsTxn } from '@yes-boss/shared';
import { formatDateTime, formatMinor } from '@/utils/formatters';
import { colors, font, radius } from '@/theme/theme';
import { IconTile } from '@/components/ui';

const TYPE_META: Record<
  SmsTxn['type'],
  { label: string; color: string; sign: string; glyph: string; tile: string }
> = {
  debit: { label: 'Spent', color: colors.danger, sign: '-', glyph: '💳', tile: colors.dangerSoft },
  credit: { label: 'Received', color: colors.success, sign: '+', glyph: '💰', tile: colors.successSoft },
  payment_due: { label: 'Due', color: colors.warning, sign: '', glyph: '🧾', tile: colors.warningSoft },
  spam: { label: 'Spam', color: colors.textMuted, sign: '', glyph: '🚫', tile: colors.cardAlt },
  unknown: { label: 'Other', color: colors.textMuted, sign: '', glyph: '✉️', tile: colors.cardAlt },
};

/** Dumb: one transaction row, styled as a card list item. */
export function SmsTxnCard({ txn }: { txn: SmsTxn }) {
  const meta = TYPE_META[txn.type];
  return (
    <View style={styles.row}>
      <IconTile glyph={meta.glyph} bg={meta.tile} size={40} />
      <View style={styles.mid}>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  mid: { flex: 1 },
  merchant: { fontSize: font.size.md, fontWeight: '600', color: colors.text },
  sub: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
  amount: { fontSize: font.size.md, fontWeight: '700' },
});
