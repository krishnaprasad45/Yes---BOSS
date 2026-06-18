import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
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
import { formatMinor } from '@/utils/formatters';
import { colors, font, radius, spacing } from '@/theme/theme';
import { Card, IconTile, SectionHeader, StatCard } from '@/components/ui';

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

/** Dashboard — greeting, today's overview grid, 30-day insights. */
export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
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

  const stats = overview.data?.data;
  const day = digest.data?.data;
  const subscriptions = subs.data?.data ?? [];
  const buckets = peak.data?.data ?? [];
  const busiest = buckets.reduce(
    (best, b) => (b.count > best.count ? b : best),
    { hour: -1, count: 0 },
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Greeting header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.name}>{user?.name ?? 'there'} 👋</Text>
          </View>
          <TouchableOpacity style={styles.bell} onPress={logout}>
            <Text style={{ fontSize: 18 }}>⏻</Text>
          </TouchableOpacity>
        </View>

        {overview.isLoading && <ActivityIndicator style={{ marginTop: 32 }} size="large" color={colors.primary} />}
        {overview.error && <Text style={styles.error}>{overview.error.message}</Text>}

        {/* Today's overview grid */}
        {day && (
          <>
            <SectionHeader title="Today's Overview" />
            <View style={styles.grid}>
              <StatCard
                glyph="📞"
                tileBg={colors.tileIndigo}
                value={String(day.callsCount)}
                label="Calls Today"
                onPress={() => navigation.navigate('Calls')}
                accessory={
                  <View style={styles.callBreakdown}>
                    <View style={styles.breakRow}>
                      <Text style={[styles.breakArrow, { color: colors.success }]}>{'↓︎'}</Text>
                      <Text style={styles.breakNum}>{day.incomingCount}</Text>
                      <Text style={styles.breakTag}>In</Text>
                    </View>
                    <View style={styles.breakRow}>
                      <Text style={[styles.breakArrow, { color: colors.primary }]}>{'↑︎'}</Text>
                      <Text style={styles.breakNum}>{day.outgoingCount}</Text>
                      <Text style={styles.breakTag}>Out</Text>
                    </View>
                  </View>
                }
              />
              <StatCard glyph="💸" tileBg={colors.tileGreen} value={formatMinor(day.spentMinor)} label="Spent Today" />
            </View>
            <View style={styles.grid}>
              <StatCard
                glyph="📍"
                tileBg={colors.tileTeal}
                value={distance.data ? `${distance.data.data.totalKm} km` : '—'}
                label="Distance (30d)"
              />
              <StatCard glyph="🧾" tileBg={colors.tileOrange} value={String(day.billsDue)} label="Bills Due" />
            </View>
          </>
        )}

        {/* 30-day calls */}
        {stats && (
          <Card style={styles.block}>
            <SectionHeader title="Last 30 days · Calls" />
            <View style={styles.inlineStats}>
              <Inline label="Total" value={String(stats.calls.total)} />
              <Inline label="Missed" value={String(stats.calls.missed)} color={colors.danger} />
              <Inline label="Talk time" value={formatTalk(stats.calls.totalTalkSec)} />
            </View>
            {stats.calls.topContacts.length > 0 && (
              <View style={styles.list}>
                <Text style={styles.listHead}>Top contacts</Text>
                {stats.calls.topContacts.map(c => (
                  <View key={c.name} style={styles.listRow}>
                    <Text style={styles.listName}>{c.name}</Text>
                    <Text style={styles.listVal}>{c.count}</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
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
                <IconTile glyph="🔁" bg={colors.tilePurple} size={38} />
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

function Inline({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.inline}>
      <Text style={styles.inlineLabel}>{label}</Text>
      <Text style={[styles.inlineValue, color ? { color } : null]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  greeting: { fontSize: font.size.sm, color: colors.textMuted },
  name: { fontSize: font.size.xxl, fontWeight: '700', color: colors.text },
  bell: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { color: colors.danger, marginTop: spacing.lg },
  grid: { flexDirection: 'row', gap: spacing.md },
  callBreakdown: { gap: 2, alignItems: 'flex-end' },
  breakRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  breakArrow: { fontSize: font.size.sm, fontWeight: '700' },
  breakNum: { fontSize: font.size.sm, fontWeight: '700', color: colors.text, minWidth: 12, textAlign: 'right' },
  breakTag: { fontSize: font.size.xs, color: colors.textMuted, width: 22 },
  block: { gap: spacing.md },
  inlineStats: { flexDirection: 'row', gap: spacing.md },
  inline: { flex: 1, backgroundColor: colors.cardAlt, borderRadius: radius.md, padding: spacing.md },
  inlineLabel: { fontSize: font.size.xs, color: colors.textMuted },
  inlineValue: { fontSize: font.size.lg, fontWeight: '700', color: colors.text, marginTop: 2 },
  list: { backgroundColor: colors.cardAlt, borderRadius: radius.md, padding: spacing.md },
  listHead: { fontSize: font.size.sm, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  listName: { fontSize: font.size.md, color: colors.text },
  listVal: { fontSize: font.size.md, fontWeight: '700', color: colors.text },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 6 },
  subName: { fontSize: font.size.md, fontWeight: '600', color: colors.text },
  subMeta: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 1 },
  subAmt: { fontSize: font.size.md, fontWeight: '700', color: colors.text },
});
