import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAutoReply } from '@/hooks/useAutoReply';

/** Missed-call auto-reply settings (Phase 3). */
export function SettingsScreen() {
  const { config, isLoading, save, isSaving } = useAutoReply();

  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [cooldown, setCooldown] = useState('60');

  // Seed local form from the server config once it loads.
  useEffect(() => {
    if (!config) return;
    setEnabled(config.enabled);
    setMessage(config.message);
    setSignature(config.signature);
    setCooldown(String(config.cooldownMinutes));
  }, [config]);

  if (isLoading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  const onSave = () => {
    const mins = Number(cooldown);
    save({
      enabled,
      message: message.trim(),
      signature: signature.trim(),
      cooldownMinutes: Number.isFinite(mins) ? mins : 60,
    });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Auto-reply</Text>
      <Text style={styles.subtitle}>
        Text missed callers automatically when you can't pick up.
      </Text>

      <View style={styles.rowBetween}>
        <Text style={styles.label}>Enabled</Text>
        <Switch value={enabled} onValueChange={setEnabled} />
      </View>

      <Text style={styles.label}>Message</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={message}
        onChangeText={setMessage}
        multiline
        placeholder="Sorry, I missed your call…"
      />

      <Text style={styles.label}>Signature</Text>
      <TextInput
        style={styles.input}
        value={signature}
        onChangeText={setSignature}
        placeholder="— AI Assistant"
      />

      <Text style={styles.label}>Cooldown (minutes)</Text>
      <TextInput
        style={styles.input}
        value={cooldown}
        onChangeText={setCooldown}
        keyboardType="number-pad"
        placeholder="60"
      />
      <Text style={styles.hint}>
        Won't text the same number again within this window.
      </Text>

      <TouchableOpacity
        style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
        disabled={isSaving}
        onPress={onSave}>
        {isSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Save</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1 },
  content: { padding: 16, gap: 10 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#777', marginBottom: 8 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  label: { fontSize: 15, fontWeight: '600', color: '#333', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111',
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  hint: { fontSize: 12, color: '#999' },
  saveBtn: {
    backgroundColor: '#111',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
