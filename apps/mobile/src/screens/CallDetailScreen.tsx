import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Call } from '@yes-boss/shared';
import type { CallsStackParamList } from '@/navigation/CallsStack';
import { useGenerateRecap, useRecapStatus } from '@/hooks/useCallRecap';
import { formatDateTime } from '@/utils/formatters';

type Props = NativeStackScreenProps<CallsStackParamList, 'CallDetail'>;

/** Call detail + recap (transcript & Claude summary). */
export function CallDetailScreen({ route }: Props) {
  const [call, setCall] = useState<Call>(route.params.call);
  const status = useRecapStatus();
  const recap = useGenerateRecap();

  const providersReady =
    status.data?.data.transcription && status.data?.data.summary;

  const onRecap = (force: boolean) => {
    recap.mutate(
      { callId: call.id, force },
      { onSuccess: res => setCall(res.data) },
    );
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
        <Section title="Summary">
          <Text style={styles.body}>{call.summary}</Text>
        </Section>
      ) : null}

      {call.transcript ? (
        <Section title="Transcript">
          <Text style={styles.body}>{call.transcript}</Text>
        </Section>
      ) : null}

      {call.recordingUrl && (
        <View style={styles.actions}>
          {!providersReady && status.data && (
            <Text style={styles.note}>
              Recap providers aren't configured on the server yet.
            </Text>
          )}
          <TouchableOpacity
            style={[styles.btn, (recap.isPending || !providersReady) && styles.btnDisabled]}
            disabled={recap.isPending || !providersReady}
            onPress={() => onRecap(false)}>
            {recap.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>
                {call.summary ? 'Regenerate recap' : 'Generate recap'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  name: { fontSize: 24, fontWeight: '700', color: '#111' },
  meta: { fontSize: 14, color: '#777', marginTop: 4, textTransform: 'capitalize' },
  section: {
    marginTop: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 8 },
  body: { fontSize: 15, color: '#222', lineHeight: 22 },
  note: { fontSize: 13, color: '#999', marginTop: 16 },
  actions: { marginTop: 24 },
  btn: {
    backgroundColor: '#111',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
