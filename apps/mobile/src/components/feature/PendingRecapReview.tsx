import React, { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  discardPendingRecap,
  getPendingRecaps,
  sendPendingRecap,
  type PendingRecap,
} from '@/services/autoReply/nativeAutoReply';
import { colors, font, radius, spacing } from '@/theme/theme';

/**
 * Surfaces recaps the Smart/Ask flow parked for review: shows the SMS body in an
 * editable box so the owner can tweak it, then Send (texts themselves) or
 * Discard. Polls on mount and whenever the app returns to the foreground (e.g.
 * after tapping the "Tap to edit" notification).
 */
export function PendingRecapReview() {
  const [queue, setQueue] = useState<PendingRecap[]>([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const current = queue[0];

  const refresh = useCallback(async () => {
    const list = await getPendingRecaps().catch(() => []);
    setQueue(list);
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  // Reset the editable text whenever the recap under review changes.
  useEffect(() => {
    setBody(current?.body ?? '');
  }, [current?.id]);

  const onSend = async () => {
    if (!current || busy) return;
    setBusy(true);
    await sendPendingRecap(current.id, body.trim()).catch(() => {});
    setBusy(false);
    refresh();
  };

  const onDiscard = async () => {
    if (!current || busy) return;
    setBusy(true);
    await discardPendingRecap(current.id).catch(() => {});
    setBusy(false);
    refresh();
  };

  if (!current) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onDiscard}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Review recap — {current.who}</Text>
            {queue.length > 1 && (
              <Text style={styles.count}>1 of {queue.length}</Text>
            )}
          </View>
          <Text style={styles.sub}>Edit before sending to yourself.</Text>

          <ScrollView style={styles.editorWrap} keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.editor}
              value={body}
              onChangeText={setBody}
              multiline
              textAlignVertical="top"
            />
          </ScrollView>

          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.btn, styles.discard]}
              onPress={onDiscard}
              disabled={busy}>
              <Text style={styles.discardText}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.send, busy && styles.btnDisabled]}
              onPress={onSend}
              disabled={busy}>
              <Text style={styles.sendText}>Send to me</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    maxHeight: '80%',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: font.size.lg, fontWeight: '700', color: colors.text, flex: 1 },
  count: { fontSize: font.size.sm, color: colors.textMuted },
  sub: { fontSize: font.size.sm, color: colors.textMuted },
  editorWrap: { maxHeight: 320, marginTop: spacing.xs },
  editor: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: font.size.md,
    color: colors.text,
    minHeight: 160,
  },
  row: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  btn: { flex: 1, paddingVertical: 14, borderRadius: radius.md, alignItems: 'center' },
  discard: { backgroundColor: colors.cardAlt },
  discardText: { fontSize: font.size.md, fontWeight: '700', color: colors.danger },
  send: { backgroundColor: colors.primary },
  sendText: { fontSize: font.size.md, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.5 },
});
