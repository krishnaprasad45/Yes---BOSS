import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Toast from 'react-native-toast-message';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema, type LoginFormValues } from '@/schema/login.schema';
import { font, radius, spacing } from '@/theme/theme';
import { useTheme } from '@/theme/ThemeContext';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Palette } from '@/theme/palettes';
import { Card, IconTile, PrimaryButton } from '@/components/ui';
import { Bot } from '@/components/ui/icons';

export function LoginScreen() {
  const { login } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async values => {
    try {
      await login(values);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: err instanceof Error ? err.message : 'Login failed',
      });
    }
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.brand}>
        <IconTile icon={Bot} tint={colors.primary} bg={colors.primarySoft} size={64} />
        <Text style={styles.title}>Yes Boss</Text>
        <Text style={styles.subtitle}>Your personal assistant</Text>
      </View>

      <Card style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              keyboardType="email-address"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          )}
        />
        {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}

        <Text style={styles.label}>Password</Text>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textFaint}
              secureTextEntry
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          )}
        />
        {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}

        <PrimaryButton
          title="Log in"
          onPress={onSubmit}
          loading={isSubmitting}
          style={{ marginTop: spacing.md }}
        />
      </Card>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.bg },
  brand: { alignItems: 'center', marginBottom: spacing.xxl, gap: spacing.sm },
  title: { fontSize: font.size.display, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  subtitle: { fontSize: font.size.md, color: colors.textMuted },
  card: { gap: spacing.sm },
  label: { fontSize: font.size.sm, fontWeight: '600', color: colors.text, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.cardAlt,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: font.size.md,
    color: colors.text,
  },
  error: { color: colors.danger, fontSize: font.size.sm, marginTop: 2 },
});
