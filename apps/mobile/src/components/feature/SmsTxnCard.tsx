import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SmsTxn } from '@yes-boss/shared';
import { formatDateTime, formatMinor } from '@/utils/formatters';
import { font, radius } from '@/theme/theme';
import { useTheme } from '@/theme/ThemeContext';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Palette } from '@/theme/palettes';
import { IconTile } from '@/components/ui';
import {
  Ban,
  CreditCard,
  Mail,
  ReceiptText,
  Wallet,
  type LucideIcon,
} from '@/components/ui/icons';

const TYPE_META: Record<
  SmsTxn['type'],
  { label: string; sign: string; icon: LucideIcon; color: (c: Palette) => string; tile: (c: Palette) => string }
> = {
  debit: { label: 'Spent', sign: '-', icon: CreditCard, color: c => c.danger, tile: c => c.dangerSoft },
  credit: { label: 'Received', sign: '+', icon: Wallet, color: c => c.success, tile: c => c.successSoft },
  payment_due: { label: 'Due', sign: '', icon: ReceiptText, color: c => c.warning, tile: c => c.warningSoft },
  spam: { label: 'Spam', sign: '', icon: Ban, color: c => c.textMuted, tile: c => c.cardAlt },
  unknown: { label: 'Other', sign: '', icon: Mail, color: c => c.textMuted, tile: c => c.cardAlt },
};

/** Dumb: one transaction row, styled as a card list item. */
export function SmsTxnCard({ txn }: { txn: SmsTxn }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const meta = TYPE_META[txn.type];
  return (
    <View style={styles.row}>
      <IconTile icon={meta.icon} tint={meta.color(colors)} bg={meta.tile(colors)} size={40} />
      <View style={styles.mid}>
        <Text style={styles.merchant} numberOfLines={1}>
          {txn.merchant ?? txn.sender}
        </Text>
        <Text style={styles.sub}>
          {meta.label} · {formatDateTime(txn.receivedAt)}
        </Text>
      </View>
      <Text style={[styles.amount, { color: meta.color(colors) }]}>
        {txn.amountMinor !== null ? `${meta.sign}${formatMinor(txn.amountMinor)}` : '—'}
      </Text>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: radius.md,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    mid: { flex: 1 },
    merchant: { fontSize: font.size.md, fontWeight: '600', color: colors.text },
    sub: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
    amount: { fontSize: font.size.md, fontWeight: '700' },
  });
