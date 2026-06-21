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
import type { RecapMode } from '@yes-boss/shared';
import { useAutoReply } from '@/hooks/useAutoReply';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { font, radius, spacing } from '@/theme/theme';
import { useTheme } from '@/theme/ThemeContext';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Palette } from '@/theme/palettes';
import { Badge, Card, IconTile, PrimaryButton, SectionHeader } from '@/components/ui';
import { FileText, Mail, MapPin, MessageSquare, Moon, ReceiptText, ShieldCheck, Sparkles, Sun } from '@/components/ui/icons';

const RECAP_MODES: { key: RecapMode; label: string }[] = [
  { key: 'smart', label: 'Smart' },
  { key: 'always_send', label: 'Always' },
  { key: 'always_ask', label: 'Ask' },
];

const RECAP_MODE_HINT: Record<RecapMode, string> = {
  smart:
    'Auto-sends only when the call has something actionable (date, time, number, price, follow-up). Otherwise shows an editable preview to confirm.',
  always_send: 'Sends a recap SMS after every recorded call.',
  always_ask: 'Never auto-sends — every recap opens an editable preview you Send or Discard.',
};

/** Assistant settings — missed-call auto-reply (Phase 3). */
export function SettingsScreen() {
  const { colors, mode, toggle: toggleTheme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { config, isLoading, save, isSaving } = useAutoReply();
  const { isTracking, pointsSynced, toggle: toggleTracking } = useLocationTracking();

  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [cooldown, setCooldown] = useState('60');
  const [recapEnabled, setRecapEnabled] = useState(false);
  const [recapNumber, setRecapNumber] = useState('');
  const [recapMode, setRecapMode] = useState<RecapMode>('smart');
  const [callerSummary, setCallerSummary] = useState(false);

  useEffect(() => {
    if (!config) return;
    setEnabled(config.enabled);
    setMessage(config.message);
    setSignature(config.signature);
    setCooldown(String(config.cooldownMinutes));
    setRecapEnabled(config.recapEnabled);
    setRecapNumber(config.recapNumber);
    setRecapMode(config.recapMode);
    setCallerSummary(config.callerSummaryEnabled);
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
      recapMode,
      callerSummaryEnabled: callerSummary,
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Assistant Settings</Text>

        {/* Appearance — light / dark theme toggle (persisted, default dark). */}
        <Card style={styles.card}>
          <View style={styles.cardHead}>
            <View style={styles.headLeft}>
              <IconTile
                icon={mode === 'dark' ? Moon : Sun}
                tint={colors.iconIndigo}
                bg={colors.tileIndigo}
                size={40}
              />
              <View>
                <Text style={styles.cardTitle}>Dark mode</Text>
                <Text style={styles.cardSub}>
                  {mode === 'dark' ? 'On — deep navy theme' : 'Off — light theme'}
                </Text>
              </View>
            </View>
            <Switch
              value={mode === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ true: colors.primary, false: colors.cardAlt }}
              thumbColor="#fff"
            />
          </View>
        </Card>

        {/* Auto-Reply card */}
        <Card style={styles.card}>
          <View style={styles.cardHead}>
            <View style={styles.headLeft}>
              <IconTile icon={Sparkles} tint={colors.iconIndigo} bg={colors.tileIndigo} size={40} />
              <View>
                <Text style={styles.cardTitle}>Auto-Reply</Text>
                <Text style={styles.cardSub}>AI responses to missed calls</Text>
              </View>
            </View>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ true: colors.primary, false: colors.cardAlt }}
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
              <IconTile icon={MapPin} tint={colors.iconGreen} bg={colors.tileGreen} size={40} />
              <View>
                <Text style={styles.cardTitle}>Distance tracking</Text>
                <Text style={styles.cardSub}>GPS while the app is open</Text>
              </View>
            </View>
            <Switch
              value={isTracking}
              onValueChange={toggleTracking}
              trackColor={{ true: colors.primary, false: colors.cardAlt }}
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
              <IconTile icon={FileText} tint={colors.iconPurple} bg={colors.tilePurple} size={40} />
              <View>
                <Text style={styles.cardTitle}>Auto call recap</Text>
                <Text style={styles.cardSub}>Text me a summary after a call</Text>
              </View>
            </View>
            <Switch
              value={recapEnabled}
              onValueChange={setRecapEnabled}
              trackColor={{ true: colors.primary, false: colors.cardAlt }}
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

          <Text style={styles.label}>When to send</Text>
          <View style={styles.modeRow}>
            {RECAP_MODES.map(m => (
              <TouchableOpacity
                key={m.key}
                style={[styles.modeChip, recapMode === m.key && styles.modeChipActive]}
                onPress={() => setRecapMode(m.key)}>
                <Text
                  style={[styles.modeChipText, recapMode === m.key && styles.modeChipTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.hint}>{RECAP_MODE_HINT[recapMode]}</Text>

          <View style={[styles.cardHead, { marginTop: spacing.md }]}>
            <View style={styles.headLeft}>
              <IconTile icon={ReceiptText} tint={colors.iconOrange} bg={colors.tileOrange} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Also summarise to caller</Text>
                <Text style={styles.cardSub}>Only when items are agreed</Text>
              </View>
            </View>
            <Switch
              value={callerSummary}
              onValueChange={setCallerSummary}
              trackColor={{ true: colors.primary, false: colors.cardAlt }}
              thumbColor="#fff"
            />
          </View>
          <Text style={styles.hint}>
            ⚠️ Texts the other person a short summary — but only when the call has
            concrete items (date, price, item list, commitment). Off for casual
            calls. They'll know you summarise calls.
          </Text>
        </Card>

        {/* Active channels (status only for now). */}
        <Card style={styles.card}>
          <SectionHeader title="Active channels" />
          <View style={styles.channel}>
            <View style={styles.headLeft}>
              <IconTile icon={MessageSquare} tint={colors.iconGreen} bg={colors.tileGreen} size={36} />
              <Text style={styles.channelName}>WhatsApp</Text>
            </View>
            <Badge label="Soon" tone="neutral" />
          </View>
          <View style={styles.channel}>
            <View style={styles.headLeft}>
              <IconTile icon={Mail} tint={colors.iconIndigo} bg={colors.tileIndigo} size={36} />
              <Text style={styles.channelName}>Email</Text>
            </View>
            <Badge label="Soon" tone="neutral" />
          </View>
        </Card>

        <PrimaryButton title="Save" onPress={onSave} loading={isSaving} style={{ marginTop: spacing.xs }} />
        <View style={styles.footerRow}>
          <ShieldCheck size={14} color={colors.textFaint} strokeWidth={2.2} />
          <Text style={styles.footer}>Your data is encrypted in transit.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
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
  modeRow: { flexDirection: 'row', gap: spacing.sm },
  modeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeChipText: { fontSize: font.size.sm, fontWeight: '600', color: colors.textMuted },
  modeChipTextActive: { color: colors.onPrimary },
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
  choiceTextActive: { fontSize: font.size.md, color: colors.onPrimary, fontWeight: '700' },
  radioOn: { color: colors.onPrimary, fontSize: 14 },
  radioOff: { color: colors.textFaint, fontSize: 14 },
  channel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  channelName: { fontSize: font.size.md, fontWeight: '600', color: colors.text },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.sm },
  footer: { fontSize: font.size.xs, color: colors.textFaint },
});
