import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Call } from '@yes-boss/shared';
import type { CallsStackParamList } from '@/navigation/CallsStack';
import { useGenerateRecap, useRecapStatus } from '@/hooks/useCallRecap';
import { formatDateTime } from '@/utils/formatters';
import { font, radius, spacing } from '@/theme/theme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Palette } from '@/theme/palettes';
import { Card, PrimaryButton, SectionHeader } from '@/components/ui';

type Props = NativeStackScreenProps<CallsStackParamList, 'CallDetail'>;

/** Call detail + recap (transcript & Claude summary). */
export function CallDetailScreen({ route }: Props) {
  const styles = useThemedStyles(makeStyles);
  const [call, setCall] = useState<Call>(route.params.call);
  const status = useRecapStatus();
  const recap = useGenerateRecap();

  const providersReady = status.data?.data.transcription && status.data?.data.summary;

  const onRecap = (force: boolean) => {
    recap.mutate({ callId: call.id, force }, { onSuccess: res => setCall(res.data) });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.name}>{call.contactName ?? call.phoneNumber}</Text>
      <Text style={styles.meta}>
        {call.direction} · {call.durationSec}s · {formatDateTime(call.occurredAt)}
      </Text>

      {!call.recordingUrl && (
        <Text style={styles.note}>No recording was backed up for this call.</Text>
      )}

      {call.summary ? (
        <Card style={styles.card}>
          <SectionHeader title="AI Summary" />
          <Text style={styles.body}>{call.summary}</Text>
        </Card>
      ) : null}

      {call.transcript ? (
        <Card style={styles.card}>
          <SectionHeader title="Transcript" />
          <Text style={styles.body}>{call.transcript}</Text>
        </Card>
      ) : null}

      {call.recordingUrl && (
        <View style={styles.actions}>
          {!providersReady && status.data && (
            <Text style={styles.note}>Recap providers aren't configured on the server yet.</Text>
          )}
          <PrimaryButton
            title={call.summary ? 'Regenerate recap' : 'Generate recap'}
            onPress={() => onRecap(false)}
            loading={recap.isPending}
            disabled={!providersReady}
          />
        </View>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  name: { fontSize: font.size.xxl, fontWeight: '700', color: colors.text },
  meta: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 4, textTransform: 'capitalize' },
  card: { marginTop: spacing.lg, gap: spacing.sm },
  body: { fontSize: font.size.md, color: colors.text, lineHeight: 22 },
  note: { fontSize: font.size.sm, color: colors.textFaint, marginTop: spacing.lg },
  actions: { marginTop: spacing.xxl },
});
