import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Call, CallDirection } from '@yes-boss/shared';
import type { CallsStackParamList } from '@/navigation/CallsStack';
import { useCallList } from '@/hooks/useCalls';
import { useCallBackup } from '@/hooks/useCallBackup';
import { CallCard } from '@/components/feature/CallCard';
import { colors, font, spacing } from '@/theme/theme';
import { Chip, PrimaryButton, SearchBar } from '@/components/ui';

const FILTERS: { key: CallDirection | 'all'; label: string }[] = [
  { key: 'all', label: 'All Calls' },
  { key: 'incoming', label: 'In' },
  { key: 'outgoing', label: 'Out' },
  { key: 'missed', label: 'Missed' },
];

type Props = NativeStackScreenProps<CallsStackParamList, 'CallsList'>;

/** Call logs — search, direction filter, backup, recap-aware list. */
export function CallsScreen({ navigation }: Props) {
  const [dirFilter, setDirFilter] = useState<CallDirection | 'all'>('all');
  const [search, setSearch] = useState('');

  const filters = useMemo(
    () => ({
      direction: dirFilter === 'all' ? undefined : dirFilter,
      search: search.trim() || undefined,
    }),
    [dirFilter, search],
  );

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
            <Text style={styles.title}>Call Logs</Text>
            <SearchBar
              glyph="🔍"
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: font.size.xxl, fontWeight: '700', color: colors.text },
  filterRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  recentLabel: { fontSize: font.size.sm, fontWeight: '700', color: colors.textMuted, marginTop: 4 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40, paddingHorizontal: 32 },
});
