import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Call } from '@yes-boss/shared';
import { formatDateTime } from '@/utils/formatters';
import { colors, font, radius } from '@/theme/theme';
import { IconTile } from '@/components/ui';

const DIR_META: Record<
  Call['direction'],
  { label: string; color: string; glyph: string; tile: string }
> = {
  incoming: { label: 'Incoming', color: colors.success, glyph: '↙', tile: colors.successSoft },
  outgoing: { label: 'Outgoing', color: colors.primary, glyph: '↗', tile: colors.tileIndigo },
  missed: { label: 'Missed', color: colors.danger, glyph: '✕', tile: colors.dangerSoft },
  rejected: { label: 'Rejected', color: colors.textMuted, glyph: '⊘', tile: colors.cardAlt },
};

function formatDuration(sec: number): string {
  if (sec <= 0) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** Call list item: direction tile, contact, meta, optional AI-recap callout. */
export function CallCard({ call, onPress }: { call: Call; onPress?: () => void }) {
  const meta = DIR_META[call.direction];
  const Wrapper: React.ElementType = onPress ? TouchableOpacity : View;

  return (
    <Wrapper style={styles.card} onPress={onPress}>
      <View style={styles.row}>
        <IconTile glyph={meta.glyph} bg={meta.tile} size={42} />
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
          <Text style={styles.recapLabel}>✨ AI RECAP</Text>
          <Text style={styles.recapText} numberOfLines={3}>
            {call.summary}
          </Text>
        </View>
      ) : null}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
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
  recapLabel: { fontSize: font.size.xs, fontWeight: '700', color: colors.success, marginBottom: 4 },
  recapText: { fontSize: font.size.sm, color: '#216A43', lineHeight: 19 },
});
