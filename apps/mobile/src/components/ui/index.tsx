import React, { useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import LinearGradientBase from 'react-native-linear-gradient';
import { font, radius, shadow, spacing } from '@/theme/theme';
import { useTheme } from '@/theme/ThemeContext';
import type { Palette } from '@/theme/palettes';
import { ChevronRight, Search, type LucideIcon } from './icons';

// The shipped typings omit `children`; the component accepts them at runtime.
const LinearGradient = LinearGradientBase as unknown as React.ComponentType<{
  colors: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}>;

/** Card with a hairline border + soft ambient shadow — core surface. */
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const styles = useStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

/**
 * Pressable that springs down slightly while held — the small tactile detail
 * that makes the whole app feel premium. Wraps any children.
 */
export function PressScale({
  children,
  onPress,
  style,
  containerStyle,
  scaleTo = 0.97,
  disabled,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  scaleTo?: number;
  disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => to(scaleTo)}
      onPressOut={() => to(1)}
      style={containerStyle}>
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Section heading row: "Title" + optional action with a chevron on the right. */
export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction} disabled={!onAction} style={styles.sectionActionRow}>
          <Text style={styles.sectionAction}>{action}</Text>
          <ChevronRight size={15} color={colors.primary} strokeWidth={2.4} />
        </TouchableOpacity>
      )}
    </View>
  );
}

/** Rounded tile holding a Lucide icon, tinted by `bg` + `tint`. */
export function IconTile({
  icon: Icon,
  tint,
  bg,
  size = 44,
}: {
  icon: LucideIcon;
  tint?: string;
  bg?: string;
  size?: number;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles_iconTile,
        { backgroundColor: bg ?? colors.tileTeal, width: size, height: size },
      ]}>
      <Icon size={Math.round(size * 0.5)} color={tint ?? colors.iconTeal} strokeWidth={2.1} />
    </View>
  );
}

/** Stat card: icon tile, big value, label, optional right accessory + delta. */
export function StatCard({
  icon,
  tint,
  tileBg,
  value,
  label,
  delta,
  deltaUp,
  accessory,
  onPress,
  style,
}: {
  icon: LucideIcon;
  tint?: string;
  tileBg?: string;
  value: string;
  label: string;
  delta?: string;
  deltaUp?: boolean;
  accessory?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const body = (
    <>
      <View style={styles.statTopRow}>
        <IconTile icon={icon} tint={tint} bg={tileBg} size={38} />
        {accessory}
      </View>
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
    </>
  );
  if (onPress) {
    return (
      <PressScale
        onPress={onPress}
        containerStyle={{ flex: 1 }}
        style={StyleSheet.flatten([styles.card, styles.statCard, style])}>
        {body}
      </PressScale>
    );
  }
  return <Card style={StyleSheet.flatten([styles.statCard, style])}>{body}</Card>;
}

/** Pill chip used for filters; teal when active. */
export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  const styles = useStyles();
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.8}>
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
  const { colors } = useTheme();
  const styles = useStyles();
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

/** Primary button — teal gradient fill, springs on press. */
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
  const { colors } = useTheme();
  const styles = useStyles();
  const off = disabled || loading;
  return (
    <PressScale onPress={onPress} disabled={off} style={style} scaleTo={0.98}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.primaryBtn, off && styles.btnDisabled]}>
        {loading ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.primaryBtnText}>{title}</Text>
        )}
      </LinearGradient>
    </PressScale>
  );
}

/** Rounded inset search/prompt bar with a leading Lucide icon. */
export function SearchBar({
  icon: Icon = Search,
  ...props
}: TextInputProps & { icon?: LucideIcon }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.searchBar}>
      <Icon size={18} color={colors.textMuted} strokeWidth={2.2} />
      <TextInput style={styles.searchInput} placeholderTextColor={colors.textFaint} {...props} />
    </View>
  );
}

// IconTile has no themed text/border, so a single static style is fine.
const styles_iconTile: ViewStyle = {
  borderRadius: radius.md,
  alignItems: 'center',
  justifyContent: 'center',
};

/** Memoised per-theme StyleSheet shared by the kit. */
function useStyles() {
  const { colors } = useTheme();
  return useMemo(() => makeStyles(colors), [colors]);
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadow.card,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    sectionTitle: { fontSize: font.size.lg, fontWeight: '700', color: colors.text },
    sectionActionRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    sectionAction: { fontSize: font.size.sm, fontWeight: '600', color: colors.primary },
    statCard: { flex: 1, gap: 6, padding: spacing.lg },
    statTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
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
    chipTextActive: { color: colors.onPrimary },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
    badgeText: { fontSize: font.size.xs, fontWeight: '700' },
    primaryBtn: {
      borderRadius: radius.md,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnDisabled: { opacity: 0.5 },
    primaryBtnText: { color: colors.onPrimary, fontWeight: '700', fontSize: font.size.md },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: radius.pill,
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: { flex: 1, fontSize: font.size.md, color: colors.text, padding: 0 },
  });
