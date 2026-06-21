import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Call, CallDirection } from '@yes-boss/shared';
import type { CallsStackParamList } from '@/navigation/CallsStack';
import { useCallList } from '@/hooks/useCalls';
import { useCallBackup } from '@/hooks/useCallBackup';
import { CallCard } from '@/components/feature/CallCard';
import { font, radius, spacing } from '@/theme/theme';
import { useTheme } from '@/theme/ThemeContext';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Palette } from '@/theme/palettes';
import { Chip, PrimaryButton, SearchBar } from '@/components/ui';
import { X } from '@/components/ui/icons';

const FILTERS: { key: CallDirection | 'all'; label: string }[] = [
  { key: 'all', label: 'All Calls' },
  { key: 'incoming', label: 'In' },
  { key: 'outgoing', label: 'Out' },
  { key: 'missed', label: 'Missed' },
];

type Props = NativeStackScreenProps<CallsStackParamList, 'CallsList'>;

/** Inclusive ISO bounds for the local "today". */
function todayRange(): { from: string; to: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

/** Call logs — search, direction filter, backup, recap-aware list. */
export function CallsScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [dirFilter, setDirFilter] = useState<CallDirection | 'all'>('all');
  const [search, setSearch] = useState('');
  // Seeded from the dashboard "Calls Today" tap; user can clear it.
  const [todayOnly, setTodayOnly] = useState(!!route.params?.today);

  // Re-apply when the dashboard navigates in again with the flag.
  useEffect(() => {
    if (route.params?.today) setTodayOnly(true);
  }, [route.params?.today]);

  const filters = useMemo(() => {
    const range = todayOnly ? todayRange() : {};
    return {
      direction: dirFilter === 'all' ? undefined : dirFilter,
      search: search.trim() || undefined,
      ...range,
    };
  }, [dirFilter, search, todayOnly]);

  const { backup, isBackingUp } = useCallBackup();
  const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage, error } =
    useCallList(filters);

  const calls: Call[] = data?.pages.flatMap(p => p.data) ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        contentContainerStyle={styles.content}
        data={calls}
        keyExtractor={c => c.id}
        renderItem={({ item }) => (
          <CallCard
            call={item}
            onPress={() => navigation.navigate('CallDetail', { call: item })}
          />
        )}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListHeaderComponent={
          <View style={{ gap: spacing.md }}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Call Logs</Text>
              {todayOnly && (
                <TouchableOpacity style={styles.todayPill} onPress={() => setTodayOnly(false)}>
                  <Text style={styles.todayPillText}>Today</Text>
                  <X size={13} color={colors.primary} strokeWidth={2.6} />
                </TouchableOpacity>
              )}
            </View>
            <SearchBar
              placeholder="Search your calls"
              value={search}
              onChangeText={setSearch}
            />
            <View style={styles.filterRow}>
              {FILTERS.map(f => (
                <Chip
                  key={f.key}
                  label={f.label}
                  active={dirFilter === f.key}
                  onPress={() => setDirFilter(f.key)}
                />
              ))}
            </View>
            <PrimaryButton title="Back up call log" onPress={backup} loading={isBackingUp} />
            <Text style={styles.recentLabel}>Recent</Text>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={styles.empty} size="large" color={colors.primary} />
          ) : (
            <Text style={styles.empty}>
              {error ? error.message : 'No calls yet. Tap "Back up" to sync your call log.'}
            </Text>
          )
        }
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: font.size.xxl, fontWeight: '700', color: colors.text },
  todayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  todayPillText: { fontSize: font.size.sm, fontWeight: '700', color: colors.primary },
  filterRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  recentLabel: { fontSize: font.size.sm, fontWeight: '700', color: colors.textMuted, marginTop: 4 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40, paddingHorizontal: 32 },
});
