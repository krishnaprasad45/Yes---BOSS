import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Call } from '@yes-boss/shared';
import { formatDateTime } from '@/utils/formatters';

const DIR_META: Record<Call['direction'], { label: string; color: string; icon: string }> = {
  incoming: { label: 'Incoming', color: '#27ae60', icon: '↙' },
  outgoing: { label: 'Outgoing', color: '#2980b9', icon: '↗' },
  missed: { label: 'Missed', color: '#c0392b', icon: '✕' },
  rejected: { label: 'Rejected', color: '#7f8c8d', icon: '⊘' },
};

function formatDuration(sec: number): string {
  if (sec <= 0) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** Dumb: one call row. Tappable when an onPress handler is provided. */
export function CallCard({ call, onPress }: { call: Call; onPress?: () => void }) {
  const meta = DIR_META[call.direction];
  const body = (
    <>
      <Text style={[styles.icon, { color: meta.color }]}>{meta.icon}</Text>
      <View style={styles.mid}>
        <Text style={styles.name} numberOfLines={1}>
          {call.contactName ?? call.phoneNumber}
        </Text>
        <Text style={styles.sub}>
          {meta.label} · {formatDateTime(call.occurredAt)}
          {call.recordingUrl ? ' · 🎙' : ''}
          {call.summary ? ' · 📝' : ''}
        </Text>
      </View>
      <Text style={styles.duration}>{formatDuration(call.durationSec)}</Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.card} onPress={onPress}>
        {body}
      </TouchableOpacity>
    );
  }
  return <View style={styles.card}>{body}</View>;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    gap: 12,
  },
  icon: { fontSize: 20, width: 24, textAlign: 'center' },
  mid: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#111' },
  sub: { fontSize: 13, color: '#777', marginTop: 2 },
  duration: { fontSize: 14, color: '#555' },
});
