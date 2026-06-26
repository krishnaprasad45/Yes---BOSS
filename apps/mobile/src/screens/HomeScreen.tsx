import React from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/hooks/useAuth';
import {
  useDailyDigest,
  useDashboardStats,
  useDistance,
  usePeakUsage,
  useSubscriptions,
} from '@/hooks/useDashboard';
import { useAppSelector } from '@/store/hooks';
import { formatMinor } from '@/utils/formatters';
import { font, radius, shadow, spacing } from '@/theme/theme';
import { useTheme } from '@/theme/ThemeContext';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Palette } from '@/theme/palettes';
import { Card, IconTile, PressScale, SectionHeader, StatCard } from '@/components/ui';
import {
  BadgeCheck,
  Bell,
  FileText,
  MapPin,
  Mic,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Repeat,
  ReceiptText,
  Sparkles,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from '@/components/ui/icons';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatTalk(sec: number): string {
  if (sec <= 0) return '0m';
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatHour(h: number): string {
  const period = h < 12 ? 'am' : 'pm';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}${period}`;
}

/** "Last called yesterday / 3 days ago" from an ISO timestamp. */
function relativeDay(iso: string): string {
  const then = new Date(iso);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const days = Math.floor((start.getTime() - then.getTime()) / 86_400_000);
  if (days <= 0) return 'Last called today';
  if (days === 1) return 'Last called yesterday';
  return `Last called ${days} days ago`;
}

// Rotating tint set so each contact avatar gets a stable, distinct color.
const AVATAR_TINTS = ['iconOrange', 'iconIndigo', 'iconGreen', 'iconTeal', 'iconPurple'] as const;

/** Dashboard — overview grid, quick actions, 30-day insights, top contacts. */
export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { user, logout } = useAuth();
  // AuthUser has no avatar field yet — read defensively, fall back to initials.
  const avatarUrl = (user as { avatarUrl?: string } | null)?.avatarUrl;
  const overview = useDashboardStats();
  const digest = useDailyDigest();
  const subs = useSubscriptions();
  const peak = usePeakUsage();
  const distance = useDistance();

  const refreshing = overview.isRefetching || digest.isRefetching;
  const onRefresh = () => {
    overview.refetch();
    digest.refetch();
    subs.refetch();
    peak.refetch();
    distance.refetch();
  };

  const pendingTxns = useAppSelector(s => s.finance.pendingTxns);
  const cachedCalls = useAppSelector(s => s.calls.items);
  const stats = overview.data?.data;
  const day = digest.data?.data;
  // Blend offline pending debits into Spent Today so it updates before server sync.
  const pendingSpentMinor = pendingTxns
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amountMinor, 0);
  const spentTodayMinor = (day?.spentMinor ?? 0) + pendingSpentMinor;
  const billsDue = day?.billsDue ?? 0;
  // Count today's calls directly from the device-synced Redux cache — no backend round-trip.
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayCalls = cachedCalls.filter(c => c.occurredAt >= todayStart.toISOString());
  const callsToday = todayCalls.length;
  const incomingToday = todayCalls.filter(c => c.direction === 'incoming').length;
  const outgoingToday = todayCalls.filter(c => c.direction === 'outgoing').length;
  const missedToday = todayCalls.filter(c => c.direction === 'missed').length;
  const subscriptions = subs.data?.data ?? [];
  const buckets = peak.data?.data ?? [];
  const busiest = buckets.reduce(
    (best, b) => (b.count > best.count ? b : best),
    { hour: -1, count: 0 },
  );

  // Most-recent call time per contact name, to label top contacts with "last called".
  const lastCallByName = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const c of cachedCalls) {
      if (!c.contactName) continue;
      const prev = map.get(c.contactName);
      if (!prev || c.occurredAt > prev) map.set(c.contactName, c.occurredAt);
    }
    return map;
  }, [cachedCalls]);
  const topContacts = stats?.calls.topContacts ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Header — avatar + greeting on the left, notifications on the right */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Avatar name={user?.name ?? 'there'} url={avatarUrl} tint={colors.iconIndigo} size={48} onPress={logout} />
            <View>
              <Text style={styles.greeting}>{greeting()},</Text>
              <Text style={styles.name}>{user?.name ?? 'there'} 👋</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8}>
            <Bell size={18} color={colors.text} strokeWidth={2.2} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        {/* Assistant prompt bar */}
        <TouchableOpacity style={styles.assistantBar} activeOpacity={0.85}>
          <View style={styles.assistantSpark}>
            <Sparkles size={18} color={colors.iconPurple} strokeWidth={2.2} />
          </View>
          <TextInput
            style={styles.assistantInput}
            placeholder="Ask your assistant anything"
            placeholderTextColor={colors.textMuted}
            editable={false}
            pointerEvents="none"
          />
          <Mic size={20} color={colors.textMuted} strokeWidth={2.2} />
        </TouchableOpacity>

        {overview.isLoading && <ActivityIndicator style={{ marginTop: 32 }} size="large" color={colors.primary} />}
        {overview.error && <Text style={styles.error}>{overview.error.message}</Text>}

        {/* Today's overview grid — calls come from device cache, spend from server */}
        {(callsToday > 0 || day) && (
          <>
            <View style={styles.overviewHead}>
              <Text style={styles.overviewTitle}>Today's Overview</Text>
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Finance')}>
                <Text style={styles.viewAll}>View all</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.grid}>
              <StatCard
                icon={Phone}
                tint={colors.iconIndigo}
                tileBg={colors.tileIndigo}
                value={String(callsToday)}
                label="Calls Today"
                onPress={() => navigation.navigate('Calls', { screen: 'CallsList', params: { today: true } })}
                accessory={
                  <View style={styles.callBreakdown}>
                    <View style={styles.breakRow}>
                      <PhoneIncoming size={13} color={colors.success} strokeWidth={2.4} />
                      <Text style={styles.breakNum}>{incomingToday}</Text>
                    </View>
                    <View style={styles.breakRow}>
                      <PhoneOutgoing size={13} color={colors.iconIndigo} strokeWidth={2.4} />
                      <Text style={styles.breakNum}>{outgoingToday}</Text>
                    </View>
                    <View style={styles.breakRow}>
                      <PhoneMissed size={13} color={colors.danger} strokeWidth={2.4} />
                      <Text style={styles.breakNum}>{missedToday}</Text>
                    </View>
                  </View>
                }
              />
              <StatCard
                icon={Wallet}
                tint={colors.iconGreen}
                tileBg={colors.tileGreen}
                value={formatMinor(spentTodayMinor)}
                label="Spent Today"
                onPress={() => navigation.navigate('Finance')}
                accessory={spentTodayMinor === 0 ? <StatusPill label="No expenses today" /> : undefined}
              />
            </View>
            <View style={styles.grid}>
              <StatCard
                icon={MapPin}
                tint={colors.iconTeal}
                tileBg={colors.tileTeal}
                value={distance.data ? `${distance.data.data.totalKm} km` : '—'}
                label="Distance"
                accessory={<Text style={styles.cardLink}>Last 30 Days</Text>}
              />
              <StatCard
                icon={ReceiptText}
                tint={colors.iconOrange}
                tileBg={colors.tileOrange}
                value={String(billsDue)}
                label="Bills Due"
                accessory={billsDue === 0 ? <StatusPill label="You're all caught up!" /> : undefined}
              />
            </View>
          </>
        )}

        {/* Quick actions */}
        <SectionHeader title="Quick Actions" />
        <View style={styles.actionRow}>
          <QuickAction
            icon={Phone}
            tint={colors.iconPurple}
            label="View Call Log"
            onPress={() => navigation.navigate('Calls', { screen: 'CallsList' })}
          />
          <QuickAction
            icon={Wallet}
            tint={colors.iconGreen}
            label="Add Expense"
            onPress={() => navigation.navigate('Finance')}
          />
          <QuickAction
            icon={FileText}
            tint={colors.iconOrange}
            label="Pay Bill"
            onPress={() => navigation.navigate('Finance')}
          />
          <QuickAction
            icon={MapPin}
            tint={colors.iconIndigo}
            label="View Trips"
            onPress={() => navigation.navigate('Finance')}
          />
        </View>

        {/* 30-day calls */}
        {stats && (
          <Card style={styles.block}>
            <View style={styles.thirtyHead}>
              <Text style={styles.thirtyTitle}>Last 30 Days · Calls</Text>
              <TouchableOpacity
                style={styles.analyticsPill}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Finance')}>
                <Text style={styles.analyticsText}>View Analytics</Text>
                <TrendingUp size={13} color={colors.primary} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
            <View style={styles.metricRow}>
              <Metric label="Total Calls" value={String(stats.calls.total)} />
              <Metric label="Missed Calls" value={String(stats.calls.missed)} color={colors.danger} />
              <Metric label="Talk Time" value={formatTalk(stats.calls.totalTalkSec)} color={colors.primary} />
            </View>
          </Card>
        )}

        {/* Top contacts */}
        {topContacts.length > 0 && (
          <View style={styles.block}>
            <SectionHeader
              title="Top Contacts"
              action="View All"
              onAction={() => navigation.navigate('Calls', { screen: 'CallsList' })}
            />
            <Card style={styles.contactsCard}>
              {topContacts.map((c, i) => {
                const last = lastCallByName.get(c.name);
                const tint = colors[AVATAR_TINTS[i % AVATAR_TINTS.length]];
                return (
                  <View
                    key={c.name}
                    style={[styles.contactRow, i > 0 && styles.contactDivider]}>
                    <Avatar name={c.name} tint={tint} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.contactName} numberOfLines={1}>{c.name}</Text>
                      {last && <Text style={styles.contactMeta}>{relativeDay(last)}</Text>}
                    </View>
                    <View style={styles.contactCount}>
                      <Text style={styles.contactNum}>{c.count}</Text>
                      <Text style={styles.contactNumLabel}>CALLS</Text>
                    </View>
                  </View>
                );
              })}
            </Card>
          </View>
        )}

        {/* 30-day money */}
        {stats && (
          <Card style={styles.block}>
            <SectionHeader title="Last 30 days · Money" />
            <View style={styles.inlineStats}>
              <Inline label="Spent" value={formatMinor(stats.spending.totalSpent)} color={colors.danger} />
              <Inline label="Received" value={formatMinor(stats.spending.totalCredited)} color={colors.success} />
            </View>
            <View style={styles.inlineStats}>
              <Inline label="Net" value={formatMinor(stats.spending.netMinor)} />
              <Inline label="Bills due" value={String(stats.spending.dueCount)} color={colors.warning} />
            </View>
          </Card>
        )}

        {/* Subscriptions */}
        {subscriptions.length > 0 && (
          <Card style={styles.block}>
            <SectionHeader title="Subscriptions detected" />
            {subscriptions.map(s => (
              <View key={s.merchant} style={styles.subRow}>
                <IconTile icon={Repeat} tint={colors.iconPurple} bg={colors.tilePurple} size={38} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.subName}>{s.merchant}</Text>
                  <Text style={styles.subMeta}>every {s.cadenceDays} days</Text>
                </View>
                <Text style={styles.subAmt}>{formatMinor(s.amountMinor)}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Activity */}
        {(busiest.hour >= 0 || distance.data) && (
          <Card style={styles.block}>
            <SectionHeader title="Activity" />
            <View style={styles.inlineStats}>
              {busiest.hour >= 0 && <Inline label="Busiest hour" value={formatHour(busiest.hour)} />}
              {distance.data && <Inline label="Distance (30d)" value={`${distance.data.data.totalKm} km`} />}
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Soft green "caught up" status row with a check, shown inside stat cards. */
function StatusPill({ label }: { label: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.statusPill}>
      <BadgeCheck size={13} color={colors.success} strokeWidth={2.4} />
      <Text style={styles.statusPillText} numberOfLines={1}>{label}</Text>
    </View>
  );
}

/** Quick-action tile: tinted icon over a label, springs on press. */
function QuickAction({
  icon: Icon,
  tint,
  label,
  onPress,
}: {
  icon: LucideIcon;
  tint: string;
  label: string;
  onPress?: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <PressScale onPress={onPress} containerStyle={styles.action} style={styles.actionInner}>
      <View style={styles.actionTile}>
        <Icon size={22} color={tint} strokeWidth={2.1} />
      </View>
      <Text style={styles.actionLabel} numberOfLines={1}>{label}</Text>
    </PressScale>
  );
}

/**
 * Circular avatar: shows the image at `url` when present, otherwise the first
 * initial over a tinted disc. Optionally pressable (e.g. the header profile).
 */
function Avatar({
  name,
  tint,
  url,
  size = 44,
  onPress,
}: {
  name: string;
  tint: string;
  url?: string;
  size?: number;
  onPress?: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const dim = { width: size, height: size, borderRadius: size / 2 };
  const initial = name.trim().charAt(0).toUpperCase() || '#';
  const inner = url ? (
    <Image source={{ uri: url }} style={[styles.avatar, dim]} />
  ) : (
    <View style={[styles.avatar, dim, { backgroundColor: tint + '22' }]}>
      <Text style={[styles.avatarText, { color: tint, fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

/** Big-number metric in the 30-day calls card. */
function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.metricValue, color ? { color } : null]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function Inline({ label, value, color }: { label: string; value: string; color?: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.inline}>
      <Text style={styles.inlineLabel}>{label}</Text>
      <Text style={[styles.inlineValue, color ? { color } : null]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  greeting: { fontSize: font.size.sm, color: colors.textMuted },
  name: { fontSize: font.size.xl, fontWeight: '700', color: colors.text },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 11,
    right: 13,
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  error: { color: colors.danger, marginTop: spacing.lg },
  // Assistant prompt bar
  assistantBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
    ...shadow.card,
  },
  assistantSpark: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.tilePurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantInput: { flex: 1, fontSize: font.size.md, color: colors.text, padding: 0 },
  overviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  overviewTitle: { fontSize: font.size.lg, fontWeight: '700', color: colors.text },
  viewAll: { fontSize: font.size.sm, fontWeight: '600', color: colors.primary },
  grid: { flexDirection: 'row', gap: spacing.md },
  callBreakdown: { gap: 5, alignItems: 'flex-end' },
  breakRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  breakNum: { fontSize: font.size.sm, fontWeight: '700', color: colors.text, minWidth: 14, textAlign: 'right' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.successSoft,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 2,
  },
  statusPillText: { fontSize: font.size.xs, color: colors.success, fontWeight: '600', flexShrink: 1 },
  cardLink: { fontSize: font.size.xs, fontWeight: '600', color: colors.primary, marginTop: 2 },
  // Quick actions
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
  actionInner: { alignItems: 'center', gap: 6 },
  actionTile: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 64,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: font.size.xs, color: colors.textMuted, fontWeight: '500', textAlign: 'center' },
  block: { gap: spacing.md },
  // 30-day calls
  thirtyHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  thirtyTitle: { fontSize: font.size.lg, fontWeight: '700', color: colors.text },
  analyticsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  analyticsText: { fontSize: font.size.sm, fontWeight: '600', color: colors.primary },
  metricRow: { flexDirection: 'row', gap: spacing.sm },
  metric: { flex: 1, backgroundColor: colors.cardAlt, borderRadius: radius.md, padding: spacing.md, gap: 4 },
  metricLabel: { fontSize: font.size.xs, color: colors.textMuted, fontWeight: '600', letterSpacing: 0.4 },
  metricValue: { fontSize: font.size.xl, fontWeight: '700', color: colors.text },
  // Top contacts
  contactsCard: { padding: spacing.xs, gap: 0 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  contactDivider: { borderTopWidth: 1, borderTopColor: colors.divider },
  avatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.cardAlt },
  avatarText: { fontSize: font.size.lg, fontWeight: '700' },
  contactName: { fontSize: font.size.md, fontWeight: '600', color: colors.text },
  contactMeta: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
  contactCount: { alignItems: 'flex-end' },
  contactNum: { fontSize: font.size.lg, fontWeight: '700', color: colors.text },
  contactNumLabel: { fontSize: 9, color: colors.textFaint, fontWeight: '600', letterSpacing: 0.6 },
  // Shared
  inlineStats: { flexDirection: 'row', gap: spacing.md },
  inline: { flex: 1, backgroundColor: colors.cardAlt, borderRadius: radius.md, padding: spacing.md },
  inlineLabel: { fontSize: font.size.xs, color: colors.textMuted },
  inlineValue: { fontSize: font.size.lg, fontWeight: '700', color: colors.text, marginTop: 2 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 6 },
  subName: { fontSize: font.size.md, fontWeight: '600', color: colors.text },
  subMeta: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 1 },
  subAmt: { fontSize: font.size.md, fontWeight: '700', color: colors.text },
});
