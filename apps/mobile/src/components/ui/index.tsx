import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { colors, font, radius, shadow, spacing } from '@/theme/theme';

/** White rounded card with soft shadow — the core surface of the design. */
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Section heading row: "Title" + optional "View all" action on the right. */
export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction} disabled={!onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/** Rounded tile holding an emoji/glyph, tinted by `bg`. */
export function IconTile({
  glyph,
  bg = colors.tileIndigo,
  size = 44,
}: {
  glyph: string;
  bg?: string;
  size?: number;
}) {
  return (
    <View style={[styles.iconTile, { backgroundColor: bg, width: size, height: size }]}>
      <Text style={{ fontSize: size * 0.45 }}>{glyph}</Text>
    </View>
  );
}

/** Stat card: icon tile, big value, label, optional delta badge. */
export function StatCard({
  glyph,
  tileBg,
  value,
  label,
  delta,
  deltaUp,
  style,
}: {
  glyph: string;
  tileBg?: string;
  value: string;
  label: string;
  delta?: string;
  deltaUp?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Card style={StyleSheet.flatten([styles.statCard, style])}>
      <IconTile glyph={glyph} bg={tileBg} size={38} />
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
      {delta && (
        <Text style={[styles.delta, { color: deltaUp ? colors.success : colors.danger }]}>
          {deltaUp ? '↑' : '↓'} {delta}
        </Text>
      )}
    </Card>
  );
}

/** Pill chip used for filters; indigo when active. */
export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      disabled={!onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

/** Small status badge (e.g. "Connected", "Live"). */
export function Badge({
  label,
  tone = 'success',
}: {
  label: string;
  tone?: 'success' | 'danger' | 'warning' | 'neutral';
}) {
  const map = {
    success: { bg: colors.successSoft, fg: colors.success },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    neutral: { bg: colors.cardAlt, fg: colors.textMuted },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: map.bg }]}>
      <Text style={[styles.badgeText, { color: map.fg }]}>{label}</Text>
    </View>
  );
}

/** Primary filled indigo button. */
export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <TouchableOpacity
      style={[styles.primaryBtn, (disabled || loading) && styles.btnDisabled, style]}
      onPress={onPress}
      disabled={disabled || loading}>
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.primaryBtnText}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

/** Rounded inset search/prompt bar with a leading glyph. */
export function SearchBar({
  glyph = '✨',
  ...props
}: TextInputProps & { glyph?: string }) {
  return (
    <View style={styles.searchBar}>
      <Text style={styles.searchGlyph}>{glyph}</Text>
      <TextInput
        style={styles.searchInput}
        placeholderTextColor={colors.textFaint}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: font.size.lg, fontWeight: '700', color: colors.text },
  sectionAction: { fontSize: font.size.sm, fontWeight: '600', color: colors.primary },
  iconTile: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCard: { flex: 1, gap: 6, padding: spacing.lg },
  statValue: { fontSize: font.size.xl, fontWeight: '700', color: colors.text, marginTop: 4 },
  statLabel: { fontSize: font.size.sm, color: colors.textMuted },
  delta: { fontSize: font.size.xs, fontWeight: '600', marginTop: 2 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: font.size.sm, color: colors.textMuted, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: { fontSize: font.size.xs, fontWeight: '700' },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: font.size.md },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    ...shadow.card,
  },
  searchGlyph: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: font.size.md, color: colors.text, padding: 0 },
});
