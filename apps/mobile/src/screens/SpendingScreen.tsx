import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { SmsTxn } from '@yes-boss/shared';
import { useSmsTxnList } from '@/hooks/useSmsTxns';
import { useAppSelector } from '@/store/hooks';
import {
  useCategories,
  useFinanceConfig,
  useInsights,
  useUpdateFinanceConfig,
  type Period,
} from '@/hooks/useFinance';
import { SmsTxnCard } from '@/components/feature/SmsTxnCard';
import { DonutChart } from '@/components/feature/DonutChart';
import { ManualTxnModal } from '@/components/feature/ManualTxnModal';
import { CategoriesModal } from '@/components/feature/CategoriesModal';
import { formatMinor } from '@/utils/formatters';
import { font, radius, spacing } from '@/theme/theme';
import { useTheme } from '@/theme/ThemeContext';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Palette } from '@/theme/palettes';
import { Card, PrimaryButton } from '@/components/ui';
import { Pencil, Plus, SlidersHorizontal } from '@/components/ui/icons';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

const PERIOD_NOUN: Record<Period, string> = {
  daily: 'Today',
  weekly: 'This Week',
  monthly: 'This Month',
  yearly: 'This Year',
};

/** Spending Insights — period totals, budget, donut breakdown, manual entry. */
export function SpendingScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [period, setPeriod] = useState<Period>('daily');
  const [showManual, setShowManual] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  const insights = useInsights(period);
  const categories = useCategories();
  const config = useFinanceConfig();
  const updateConfig = useUpdateFinanceConfig();

  const range = insights.range;
  const txnList = useSmsTxnList({ from: range.from, to: range.to });
  const pendingTxns = useAppSelector(s => s.finance.pendingTxns);

  const serverTxns: SmsTxn[] = txnList.data?.pages.flatMap(p => p.data) ?? [];

  // Convert pending offline txns to SmsTxn shape for display.
  const pendingAsTxns: SmsTxn[] = pendingTxns
    .filter(t => {
      const ts = t.occurredAt ? new Date(t.occurredAt).getTime() : new Date(t.createdAt).getTime();
      return ts >= new Date(range.from).getTime() && ts <= new Date(range.to).getTime();
    })
    .map(t => ({
      id: t.localId,
      type: t.type,
      amountMinor: t.amountMinor,
      currency: 'INR' as const,
      merchant: t.note ?? null,
      source: null,
      category: t.category ?? null,
      rawBody: '',
      sender: 'Manual entry',
      receivedAt: t.occurredAt ?? t.createdAt,
      dueAt: null,
      entryMode: 'manual' as const,
      note: t.note ?? null,
      createdAt: t.createdAt,
    }));

  const txns: SmsTxn[] = [...pendingAsTxns, ...serverTxns];

  const data = insights.data?.data;
  const cats = categories.data?.data ?? [];
  const manualEnabled = config.data?.data.manualEntryEnabled ?? false;

  const periodBudget = (data?.dailyBudgetMinor ?? 0) * range.days;
  const spent = data?.totalSpent ?? 0;
  const pct = periodBudget > 0 ? Math.min(100, Math.round((spent / periodBudget) * 100)) : 0;
  const overBudget = spent > periodBudget && periodBudget > 0;

  const segments = (data?.byCategory ?? []).map(c => ({ value: c.totalMinor, color: c.color }));

  const onRefresh = () => {
    insights.refetch();
    txnList.refetch();
    categories.refetch();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        contentContainerStyle={styles.content}
        data={txns}
        keyExtractor={t => t.id}
        renderItem={({ item }) => <SmsTxnCard txn={item} />}
        onEndReached={() => txnList.hasNextPage && txnList.fetchNextPage()}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={txnList.isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={{ gap: spacing.lg }}>
            <Text style={styles.title}>Spending Insights</Text>

            {/* Period tabs */}
            <View style={styles.periodRow}>
              {PERIODS.map(p => (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.periodChip, period === p.key && styles.periodChipActive]}
                  onPress={() => setPeriod(p.key)}>
                  <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Budget hero */}
            <Card style={styles.hero}>
              <Text style={styles.heroLabel}>Total Spent {PERIOD_NOUN[period]}</Text>
              <Text style={styles.heroValue}>{formatMinor(spent)}</Text>
              <View style={styles.heroMetaRow}>
                <Text style={styles.heroBudget}>
                  Budget: {formatMinor(periodBudget)}
                </Text>
                <Text style={[styles.heroPct, overBudget && { color: colors.danger }]}>
                  {pct}% Used
                </Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    { width: `${pct}%`, backgroundColor: overBudget ? colors.danger : colors.primary },
                  ]}
                />
              </View>
            </Card>

            {/* Category breakdown */}
            <Text style={styles.sectionTitle}>Category Breakdown</Text>
            {segments.length > 0 ? (
              <Card style={{ gap: spacing.lg }}>
                <View style={styles.donutWrap}>
                  <DonutChart segments={segments} size={180} thickness={22}>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={styles.donutTotalLabel}>Total</Text>
                      <Text style={styles.donutTotal}>{formatMinor(spent)}</Text>
                    </View>
                  </DonutChart>
                </View>
                {data!.byCategory.map(c => (
                  <View key={c.category} style={styles.catRow}>
                    <View style={[styles.catBar, { backgroundColor: c.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.catName}>{c.category}</Text>
                      <Text style={styles.catSub}>{c.percent}% of spend</Text>
                    </View>
                    <Text style={styles.catAmt}>{formatMinor(c.totalMinor)}</Text>
                    <TouchableOpacity onPress={() => setShowCategories(true)} style={styles.pencil}>
                      <Pencil size={15} color={colors.textMuted} strokeWidth={2.2} />
                    </TouchableOpacity>
                  </View>
                ))}
              </Card>
            ) : (
              <Card>
                <Text style={styles.empty}>
                  No spending recorded for {PERIOD_NOUN[period].toLowerCase()} yet.
                </Text>
              </Card>
            )}

            <TouchableOpacity style={styles.customizeBtn} onPress={() => setShowCategories(true)}>
              <SlidersHorizontal size={16} color={colors.primary} strokeWidth={2.3} />
              <Text style={styles.customizeText}>Customize Categories</Text>
            </TouchableOpacity>

            {/* Manual entry toggle + add */}
            <Card style={styles.manualCard}>
              <View style={styles.manualHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.manualTitle}>Add manually</Text>
                  <Text style={styles.manualSub}>For cash or card — no SMS needed</Text>
                </View>
                <Switch
                  value={manualEnabled}
                  onValueChange={v => updateConfig.mutate({ manualEntryEnabled: v })}
                  trackColor={{ true: colors.primary, false: colors.cardAlt }}
                  thumbColor="#fff"
                />
              </View>
              {manualEnabled && (
                <PrimaryButton title="Add transaction" onPress={() => setShowManual(true)} />
              )}
            </Card>

            <View style={styles.txnHead}>
              <Text style={styles.sectionTitle}>Transactions</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          txnList.isLoading ? (
            <ActivityIndicator style={styles.loading} size="large" color={colors.primary} />
          ) : (
            <Text style={styles.empty}>
              No transactions {PERIOD_NOUN[period].toLowerCase()}.{' '}
              {manualEnabled ? 'Tap "Add transaction" above.' : 'Enable manual entry to add one.'}
            </Text>
          )
        }
      />

      {manualEnabled && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowManual(true)} activeOpacity={0.85}>
          <Plus size={26} color={colors.onPrimary} strokeWidth={2.6} />
        </TouchableOpacity>
      )}

      <ManualTxnModal visible={showManual} onClose={() => setShowManual(false)} categories={cats} />
      <CategoriesModal
        visible={showCategories}
        onClose={() => setShowCategories(false)}
        categories={cats}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.lg, paddingBottom: 96 },
    title: { fontSize: font.size.xxl, fontWeight: '700', color: colors.text },
    sectionTitle: { fontSize: font.size.lg, fontWeight: '700', color: colors.text },
    periodRow: { flexDirection: 'row', gap: spacing.sm },
    periodChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 9,
      borderRadius: radius.pill,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    periodChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    periodText: { fontSize: font.size.sm, fontWeight: '700', color: colors.textMuted },
    periodTextActive: { color: colors.onPrimary },
    hero: { gap: 6, alignItems: 'center' },
    heroLabel: { fontSize: font.size.sm, color: colors.textMuted },
    heroValue: { fontSize: font.size.display, fontWeight: '800', color: colors.primary },
    heroMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginTop: 4,
    },
    heroBudget: { fontSize: font.size.sm, color: colors.success, fontWeight: '600' },
    heroPct: { fontSize: font.size.sm, color: colors.textMuted, fontWeight: '700' },
    track: { height: 8, borderRadius: 4, backgroundColor: colors.cardAlt, overflow: 'hidden', width: '100%' },
    fill: { height: 8, borderRadius: 4 },
    donutWrap: { alignItems: 'center' },
    donutTotalLabel: { fontSize: font.size.xs, color: colors.textMuted },
    donutTotal: { fontSize: font.size.lg, fontWeight: '800', color: colors.text },
    catRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    catBar: { width: 4, height: 34, borderRadius: 2 },
    catName: { fontSize: font.size.md, fontWeight: '600', color: colors.text },
    catSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1 },
    catAmt: { fontSize: font.size.md, fontWeight: '700', color: colors.text },
    pencil: { padding: 4 },
    customizeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 13,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    customizeText: { fontSize: font.size.md, fontWeight: '700', color: colors.primary },
    manualCard: { gap: spacing.md },
    manualHead: { flexDirection: 'row', alignItems: 'center' },
    manualTitle: { fontSize: font.size.md, fontWeight: '700', color: colors.text },
    manualSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1 },
    txnHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    loading: { marginTop: 32 },
    empty: { textAlign: 'center', color: colors.textMuted, paddingVertical: 16, paddingHorizontal: 16 },
    fab: {
      position: 'absolute',
      right: spacing.lg,
      bottom: spacing.lg,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
  });
