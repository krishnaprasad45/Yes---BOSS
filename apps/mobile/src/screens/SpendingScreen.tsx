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
import type { SmsTxn, SpendingSummary, TxnType } from '@yes-boss/shared';
import { useSmsTxnList, useSpendingSummary } from '@/hooks/useSmsTxns';
import { useInboxSync } from '@/hooks/useInboxSync';
import { SmsTxnCard } from '@/components/feature/SmsTxnCard';
import { formatMinor } from '@/utils/formatters';
import { font, radius, spacing } from '@/theme/theme';
import { useTheme } from '@/theme/ThemeContext';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Palette } from '@/theme/palettes';
import { Card, Chip, IconTile, PrimaryButton, SectionHeader } from '@/components/ui';
import { Tag } from '@/components/ui/icons';

const FILTERS: { key: TxnType | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'debit', label: 'Spent' },
  { key: 'credit', label: 'Received' },
  { key: 'payment_due', label: 'Due' },
];

/** Finance screen — financial pulse, top categories, transactions. */
export function SpendingScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const CAT_TILE = [colors.tilePurple, colors.tileOrange, colors.tileTeal, colors.tileIndigo, colors.tileGreen];
  const [typeFilter, setTypeFilter] = useState<TxnType | 'all'>('all');
  const filters = useMemo(
    () => ({ type: typeFilter === 'all' ? undefined : typeFilter }),
    [typeFilter],
  );

  const summary = useSpendingSummary();
  const { sync, isSyncing } = useInboxSync();
  const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage, error } =
    useSmsTxnList(filters);

  const txns: SmsTxn[] = data?.pages.flatMap(p => p.data) ?? [];
  const s: SpendingSummary | undefined = summary.data?.data;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        contentContainerStyle={styles.content}
        data={txns}
        keyExtractor={t => t.id}
        renderItem={({ item }) => <SmsTxnCard txn={item} />}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetch();
              summary.refetch();
            }}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: spacing.lg }}>
            <View style={styles.header}>
              <Text style={styles.title}>Financial Pulse</Text>
            </View>

            {s && (
              <Card style={styles.hero}>
                <Text style={styles.heroLabel}>Total spent this month</Text>
                <Text style={styles.heroValue}>{formatMinor(s.totalSpent)}</Text>
                <View style={styles.heroRow}>
                  <Text style={[styles.heroSub, { color: colors.success }]}>
                    Received {formatMinor(s.totalCredited)}
                  </Text>
                  <Text style={[styles.heroSub, { color: colors.warning }]}>
                    {s.dueCount} bill{s.dueCount === 1 ? '' : 's'} due
                  </Text>
                </View>
              </Card>
            )}

            {s && s.byCategory.length > 0 && (
              <Card>
                <SectionHeader title="Top categories" />
                {s.byCategory.slice(0, 5).map((c, i) => {
                  const max = s.byCategory[0].totalMinor || 1;
                  const pct = Math.max(6, Math.round((c.totalMinor / max) * 100));
                  return (
                    <View key={c.category} style={styles.catRow}>
                      <IconTile icon={Tag} tint={colors.iconTeal} bg={CAT_TILE[i % CAT_TILE.length]} size={36} />
                      <View style={styles.catMid}>
                        <View style={styles.catTop}>
                          <Text style={styles.catName}>{c.category}</Text>
                          <Text style={styles.catAmt}>{formatMinor(c.totalMinor)}</Text>
                        </View>
                        <View style={styles.track}>
                          <View style={[styles.fill, { width: `${pct}%` }]} />
                        </View>
                      </View>
                    </View>
                  );
                })}
              </Card>
            )}

            <PrimaryButton
              title="Sync SMS"
              onPress={sync}
              loading={isSyncing}
            />

            <SectionHeader title="Recent transactions" />
            <View style={styles.filterRow}>
              {FILTERS.map(f => (
                <Chip
                  key={f.key}
                  label={f.label}
                  active={typeFilter === f.key}
                  onPress={() => setTypeFilter(f.key)}
                />
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={styles.empty} size="large" color={colors.primary} />
          ) : (
            <Text style={styles.empty}>
              {error ? error.message : 'No transactions yet. Sync SMS to get started.'}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: font.size.xxl, fontWeight: '700', color: colors.text },
  hero: { gap: 6 },
  heroLabel: { color: colors.textMuted, fontSize: font.size.sm },
  heroValue: { color: colors.danger, fontSize: font.size.display, fontWeight: '700' },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  heroSub: { color: colors.textMuted, fontSize: font.size.sm, fontWeight: '600' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 8 },
  catMid: { flex: 1, gap: 6 },
  catTop: { flexDirection: 'row', justifyContent: 'space-between' },
  catName: { fontSize: font.size.md, color: colors.text, fontWeight: '600', textTransform: 'capitalize' },
  catAmt: { fontSize: font.size.md, color: colors.text, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.cardAlt, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginTop: -spacing.sm, marginBottom: spacing.sm, flexWrap: 'wrap' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40, paddingHorizontal: 32 },
});
