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
import { useAuth } from '@/hooks/useAuth';
import { useDailyDigest, useDashboardStats } from '@/hooks/useDashboard';
import { formatMinor } from '@/utils/formatters';

function formatTalk(sec: number): string {
  if (sec <= 0) return '0m';
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Analytics dashboard: today's digest + last-30-day call & spending stats. */
export function HomeScreen() {
  const { logout } = useAuth();
  const overview = useDashboardStats();
  const digest = useDailyDigest();

  const refreshing = overview.isRefetching || digest.isRefetching;
  const onRefresh = () => {
    overview.refetch();
    digest.refetch();
  };

  const stats = overview.data?.data;
  const day = digest.data?.data;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={styles.title}>Dashboard</Text>

      {overview.isLoading && <ActivityIndicator style={{ marginTop: 24 }} size="large" />}
      {overview.error && <Text style={styles.error}>{overview.error.message}</Text>}

      {day && (
        <Section title="Today">
          <View style={styles.row}>
            <Stat label="Spent" value={formatMinor(day.spentMinor)} color="#c0392b" />
            <Stat label="Received" value={formatMinor(day.creditedMinor)} color="#27ae60" />
          </View>
          <View style={styles.row}>
            <Stat label="Calls" value={String(day.callsCount)} />
            <Stat label="Missed" value={String(day.missedCount)} color="#c0392b" />
            <Stat label="Bills due" value={String(day.billsDue)} color="#d35400" />
          </View>
        </Section>
      )}

      {stats && (
        <>
          <Section title="Last 30 days · Calls">
            <View style={styles.row}>
              <Stat label="Total" value={String(stats.calls.total)} />
              <Stat label="Missed" value={String(stats.calls.missed)} color="#c0392b" />
              <Stat label="Talk time" value={formatTalk(stats.calls.totalTalkSec)} />
            </View>
            <View style={styles.row}>
              <Stat label="Incoming" value={String(stats.calls.incoming)} />
              <Stat label="Outgoing" value={String(stats.calls.outgoing)} />
            </View>
            {stats.calls.topContacts.length > 0 && (
              <View style={styles.block}>
                <Text style={styles.blockTitle}>Top contacts</Text>
                {stats.calls.topContacts.map(c => (
                  <View key={c.name} style={styles.listRow}>
                    <Text style={styles.listName}>{c.name}</Text>
                    <Text style={styles.listVal}>{c.count}</Text>
                  </View>
                ))}
              </View>
            )}
          </Section>

          <Section title="Last 30 days · Money">
            <View style={styles.row}>
              <Stat label="Spent" value={formatMinor(stats.spending.totalSpent)} color="#c0392b" />
              <Stat label="Received" value={formatMinor(stats.spending.totalCredited)} color="#27ae60" />
            </View>
            <View style={styles.row}>
              <Stat label="Net" value={formatMinor(stats.spending.netMinor)} />
              <Stat label="Bills due" value={String(stats.spending.dueCount)} color="#d35400" />
            </View>
          </Section>
        </>
      )}

      <TouchableOpacity style={[styles.btn, styles.secondary]} onPress={logout}>
        <Text style={styles.btnText}>Log out</Text>
      </TouchableOpacity>
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

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 28, fontWeight: '700' },
  error: { color: '#c00', marginTop: 16 },
  section: { marginTop: 20, gap: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#555' },
  row: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 12, padding: 14 },
  statLabel: { fontSize: 12, color: '#777' },
  statValue: { fontSize: 20, fontWeight: '700', color: '#111', marginTop: 4 },
  block: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 14 },
  blockTitle: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 8 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  listName: { fontSize: 15, color: '#333' },
  listVal: { fontSize: 15, fontWeight: '600', color: '#111' },
  btn: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  secondary: { backgroundColor: '#666' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
