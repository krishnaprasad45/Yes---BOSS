import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Call } from '@yes-boss/shared';
import { formatDateTime } from '@/utils/formatters';
import { font, radius } from '@/theme/theme';
import { useTheme } from '@/theme/ThemeContext';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Palette } from '@/theme/palettes';
import { IconTile } from '@/components/ui';
import {
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  PhoneOutgoing,
  Sparkles,
  type LucideIcon,
} from '@/components/ui/icons';

const DIR_META: Record<
  Call['direction'],
  { label: string; icon: LucideIcon; color: (c: Palette) => string; tile: (c: Palette) => string }
> = {
  incoming: { label: 'Incoming', icon: PhoneIncoming, color: c => c.success, tile: c => c.successSoft },
  outgoing: { label: 'Outgoing', icon: PhoneOutgoing, color: c => c.iconIndigo, tile: c => c.tileIndigo },
  missed: { label: 'Missed', icon: PhoneMissed, color: c => c.danger, tile: c => c.dangerSoft },
  rejected: { label: 'Rejected', icon: PhoneOff, color: c => c.textMuted, tile: c => c.cardAlt },
};

function formatDuration(sec: number): string {
  if (sec <= 0) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** Call list item: direction tile, contact, meta, optional AI-recap callout. */
export function CallCard({ call, onPress }: { call: Call; onPress?: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const meta = DIR_META[call.direction];
  const Wrapper: React.ElementType = onPress ? TouchableOpacity : View;

  return (
    <Wrapper style={styles.card} onPress={onPress}>
      <View style={styles.row}>
        <IconTile icon={meta.icon} tint={meta.color(colors)} bg={meta.tile(colors)} size={42} />
        <View style={styles.mid}>
          <Text style={styles.name} numberOfLines={1}>
            {call.contactName ?? call.phoneNumber}
          </Text>
          <Text style={styles.sub}>
            {meta.label} · {formatDateTime(call.occurredAt)}
            {formatDuration(call.durationSec) ? ` · ${formatDuration(call.durationSec)}` : ''}
          </Text>
        </View>
        {call.direction === 'missed' && (
          <TouchableOpacity
            style={styles.callBack}
            onPress={() => Linking.openURL(`tel:${call.phoneNumber}`)}>
            <Text style={styles.callBackText}>Call Back</Text>
          </TouchableOpacity>
        )}
      </View>

      {call.summary ? (
        <View style={styles.recap}>
          <View style={styles.recapLabelRow}>
            <Sparkles size={13} color={colors.success} strokeWidth={2.4} />
            <Text style={styles.recapLabel}>AI RECAP</Text>
          </View>
          <Text style={styles.recapText} numberOfLines={3}>
            {call.summary}
          </Text>
        </View>
      ) : null}
    </Wrapper>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    mid: { flex: 1 },
    name: { fontSize: font.size.md, fontWeight: '600', color: colors.text },
    sub: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
    callBack: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    callBackText: { color: colors.primary, fontWeight: '700', fontSize: font.size.sm },
    recap: {
      marginTop: 10,
      backgroundColor: colors.successSoft,
      borderRadius: radius.md,
      padding: 12,
    },
    recapLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
    recapLabel: { fontSize: font.size.xs, fontWeight: '700', color: colors.success, letterSpacing: 0.5 },
    recapText: { fontSize: font.size.sm, color: colors.text, lineHeight: 19 },
  });
