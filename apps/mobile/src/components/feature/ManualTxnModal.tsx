import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Category } from '@yes-boss/shared';
import { font, radius, spacing } from '@/theme/theme';
import { useTheme } from '@/theme/ThemeContext';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Palette } from '@/theme/palettes';
import { PrimaryButton } from '@/components/ui';
import { X } from '@/components/ui/icons';
import { useAddManualTxn } from '@/hooks/useFinance';

/** Bottom-sheet form to add a transaction by hand (amount, type, category, note). */
export function ManualTxnModal({
  visible,
  onClose,
  categories,
}: {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const add = useAddManualTxn();

  const [type, setType] = useState<'debit' | 'credit'>('debit');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const reset = () => {
    setType('debit');
    setAmount('');
    setCategory(null);
    setNote('');
  };

  const onSave = () => {
    const rupees = Number(amount.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(rupees) || rupees <= 0) return;
    add.mutate(
      {
        type,
        amountMinor: Math.round(rupees * 100),
        category,
        note: note.trim() || null,
      },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      },
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Add transaction</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={22} color={colors.textMuted} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: spacing.md }}>
            <View style={styles.typeRow}>
              {(['debit', 'credit'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, type === t && styles.typeChipActive]}
                  onPress={() => setType(t)}>
                  <Text style={[styles.typeText, type === t && styles.typeTextActive]}>
                    {t === 'debit' ? 'Spent' : 'Received'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Amount (₹)</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textFaint}
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.catWrap}>
              {categories.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.catChip,
                    category === c.name && { backgroundColor: c.color, borderColor: c.color },
                  ]}
                  onPress={() => setCategory(category === c.name ? null : c.name)}>
                  <View style={[styles.dot, { backgroundColor: c.color }]} />
                  <Text
                    style={[styles.catText, category === c.name && styles.catTextActive]}
                    numberOfLines={1}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Note (optional)</Text>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Lunch with team"
              placeholderTextColor={colors.textFaint}
            />

            <PrimaryButton
              title="Save"
              onPress={onSave}
              loading={add.isPending}
              style={{ marginTop: spacing.sm }}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.lg,
      gap: spacing.md,
      maxHeight: '85%',
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: font.size.xl, fontWeight: '700', color: colors.text },
    label: { fontSize: font.size.sm, fontWeight: '600', color: colors.textMuted },
    input: {
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: font.size.md,
      color: colors.text,
    },
    typeRow: { flexDirection: 'row', gap: spacing.sm },
    typeChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 11,
      borderRadius: radius.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    typeText: { fontSize: font.size.md, fontWeight: '700', color: colors.textMuted },
    typeTextActive: { color: colors.onPrimary },
    catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    catChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.pill,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dot: { width: 10, height: 10, borderRadius: 5 },
    catText: { fontSize: font.size.sm, fontWeight: '600', color: colors.text, maxWidth: 120 },
    catTextActive: { color: '#fff' },
  });
