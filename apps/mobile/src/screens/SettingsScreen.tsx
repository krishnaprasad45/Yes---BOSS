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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAutoReply } from '@/hooks/useAutoReply';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { colors, font, radius, spacing } from '@/theme/theme';
import { Badge, Card, IconTile, PrimaryButton, SectionHeader } from '@/components/ui';

/** Assistant settings — missed-call auto-reply (Phase 3). */
export function SettingsScreen() {
  const { config, isLoading, save, isSaving } = useAutoReply();
  const { isTracking, pointsSynced, toggle: toggleTracking } = useLocationTracking();

  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [cooldown, setCooldown] = useState('60');
  const [recapEnabled, setRecapEnabled] = useState(false);
  const [recapNumber, setRecapNumber] = useState('');

  useEffect(() => {
    if (!config) return;
    setEnabled(config.enabled);
    setMessage(config.message);
    setSignature(config.signature);
    setCooldown(String(config.cooldownMinutes));
    setRecapEnabled(config.recapEnabled);
    setRecapNumber(config.recapNumber);
  }, [config]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ marginTop: 48 }} size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const onSave = () => {
    const mins = Number(cooldown);
    save({
      enabled,
      message: message.trim(),
      signature: signature.trim(),
      cooldownMinutes: Number.isFinite(mins) ? mins : 60,
      recapEnabled,
      recapNumber: recapNumber.trim(),
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Assistant Settings</Text>

        {/* Auto-Reply card */}
        <Card style={styles.card}>
          <View style={styles.cardHead}>
            <View style={styles.headLeft}>
              <IconTile glyph="✨" bg={colors.tileIndigo} size={40} />
              <View>
                <Text style={styles.cardTitle}>Auto-Reply</Text>
                <Text style={styles.cardSub}>AI responses to missed calls</Text>
              </View>
            </View>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ true: colors.primary, false: '#D9DBE6' }}
              thumbColor="#fff"
            />
          </View>

          <Text style={styles.label}>Custom response message</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={message}
            onChangeText={setMessage}
            multiline
            placeholder="Hi! I can't take your call right now…"
            placeholderTextColor={colors.textFaint}
          />

          <Text style={styles.label}>Signature</Text>
          <TextInput
            style={styles.input}
            value={signature}
            onChangeText={setSignature}
            placeholder="— AI Assistant"
            placeholderTextColor={colors.textFaint}
          />

          <Text style={styles.label}>Cooldown (minutes)</Text>
          <TextInput
            style={styles.input}
            value={cooldown}
            onChangeText={setCooldown}
            keyboardType="number-pad"
            placeholder="60"
            placeholderTextColor={colors.textFaint}
          />
          <Text style={styles.hint}>Won't text the same number again within this window.</Text>
        </Card>

        {/* Location tracking — feeds the "Distance (30d)" dashboard stat. */}
        <Card style={styles.card}>
          <View style={styles.cardHead}>
            <View style={styles.headLeft}>
              <IconTile glyph="📍" bg={colors.tileGreen} size={40} />
              <View>
                <Text style={styles.cardTitle}>Distance tracking</Text>
                <Text style={styles.cardSub}>GPS while the app is open</Text>
              </View>
            </View>
            <Switch
              value={isTracking}
              onValueChange={toggleTracking}
              trackColor={{ true: colors.primary, false: '#D9DBE6' }}
              thumbColor="#fff"
            />
          </View>
          <Text style={styles.hint}>
            {isTracking
              ? `Tracking… ${pointsSynced} point${pointsSynced === 1 ? '' : 's'} synced this session.`
              : 'Turn on to record kilometres travelled on the dashboard.'}
          </Text>
        </Card>

        {/* Auto call recap — texts you a summary after a recorded call. */}
        <Card style={styles.card}>
          <View style={styles.cardHead}>
            <View style={styles.headLeft}>
              <IconTile glyph="📝" bg={colors.tilePurple} size={40} />
              <View>
                <Text style={styles.cardTitle}>Auto call recap</Text>
                <Text style={styles.cardSub}>Text me a summary after a call</Text>
              </View>
            </View>
            <Switch
              value={recapEnabled}
              onValueChange={setRecapEnabled}
              trackColor={{ true: colors.primary, false: '#D9DBE6' }}
              thumbColor="#fff"
            />
          </View>

          <Text style={styles.label}>My number (where the recap is sent)</Text>
          <TextInput
            style={styles.input}
            value={recapNumber}
            onChangeText={setRecapNumber}
            keyboardType="phone-pad"
            placeholder="+91…"
            placeholderTextColor={colors.textFaint}
          />
          <Text style={styles.hint}>
            After a recorded call with a saved contact, you'll get an SMS recap —
            heading, tone, summary. Recorded calls only.
          </Text>
        </Card>

        {/* Active channels (status only for now). */}
        <Card style={styles.card}>
          <SectionHeader title="Active channels" />
          <View style={styles.channel}>
            <View style={styles.headLeft}>
              <IconTile glyph="💬" bg={colors.tileGreen} size={36} />
              <Text style={styles.channelName}>WhatsApp</Text>
            </View>
            <Badge label="Soon" tone="neutral" />
          </View>
          <View style={styles.channel}>
            <View style={styles.headLeft}>
              <IconTile glyph="✉️" bg={colors.tileIndigo} size={36} />
              <Text style={styles.channelName}>Email</Text>
            </View>
            <Badge label="Soon" tone="neutral" />
          </View>
        </Card>

        <PrimaryButton title="Save" onPress={onSave} loading={isSaving} style={{ marginTop: spacing.xs }} />
        <Text style={styles.footer}>🔒 Your data is encrypted in transit.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  title: { fontSize: font.size.xxl, fontWeight: '700', color: colors.text },
  card: { gap: spacing.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardTitle: { fontSize: font.size.lg, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: font.size.sm, color: colors.textMuted },
  label: { fontSize: font.size.sm, fontWeight: '600', color: colors.text, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.cardAlt,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: font.size.md,
    color: colors.text,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  hint: { fontSize: font.size.xs, color: colors.textFaint, marginTop: 2 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardAlt,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 4,
  },
  choiceActive: { backgroundColor: colors.primary },
  choiceText: { fontSize: font.size.md, color: colors.text, fontWeight: '600' },
  choiceTextActive: { fontSize: font.size.md, color: '#fff', fontWeight: '700' },
  radioOn: { color: '#fff', fontSize: 14 },
  radioOff: { color: colors.textFaint, fontSize: 14 },
  channel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  channelName: { fontSize: font.size.md, fontWeight: '600', color: colors.text },
  footer: { textAlign: 'center', fontSize: font.size.xs, color: colors.textFaint, marginTop: spacing.sm },
});
