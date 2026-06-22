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
import { formatMinor } from '@/utils/formatters';
import { font, radius, spacing } from '@/theme/theme';
import { useTheme } from '@/theme/ThemeContext';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Palette } from '@/theme/palettes';
import { PrimaryButton } from '@/components/ui';
import { ChevronRight, X } from '@/components/ui/icons';
import { useSaveCategory } from '@/hooks/useFinance';

const SWATCHES = [
  '#FB923C', '#6366F1', '#22C55E', '#A855F7', '#EF4444',
  '#2DD4BF', '#F59E0B', '#EC4899', '#0EA5E9', '#64748B',
];

/** Manage spending categories — add, rename, recolour, set daily budget, delete. */
export function CategoriesModal({
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
  const { create, update, remove } = useSaveCategory();

  // null = list view; 'new' = add form; otherwise editing that category.
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(SWATCHES[0]);
  const [budget, setBudget] = useState('');

  const openEdit = (cat: Category | 'new') => {
    setEditing(cat);
    if (cat === 'new') {
      setName('');
      setColor(SWATCHES[0]);
      setBudget('');
    } else {
      setName(cat.name);
      setColor(cat.color);
      setBudget(cat.dailyBudgetMinor != null ? String(cat.dailyBudgetMinor / 100) : '');
    }
  };

  const onSave = () => {
    if (!name.trim()) return;
    const rupees = Number(budget.replace(/[^0-9.]/g, ''));
    const dailyBudgetMinor = budget.trim() && Number.isFinite(rupees) ? Math.round(rupees * 100) : null;
    const done = () => setEditing(null);
    if (editing === 'new') {
      create.mutate({ name: name.trim(), color, dailyBudgetMinor }, { onSuccess: done });
    } else if (editing) {
      update.mutate(
        { id: editing.id, patch: { name: name.trim(), color, dailyBudgetMinor } },
        { onSuccess: done },
      );
    }
  };

  const onDelete = () => {
    if (editing && editing !== 'new') remove.mutate(editing.id, { onSuccess: () => setEditing(null) });
  };

  const saving = create.isPending || update.isPending;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{editing ? (editing === 'new' ? 'New category' : 'Edit category') : 'Categories'}</Text>
            <TouchableOpacity onPress={() => (editing ? setEditing(null) : onClose())}>
              <X size={22} color={colors.textMuted} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          {!editing ? (
            <ScrollView contentContainerStyle={{ gap: spacing.sm }}>
              {categories.map(c => (
                <TouchableOpacity key={c.id} style={styles.row} onPress={() => openEdit(c)}>
                  <View style={[styles.dot, { backgroundColor: c.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{c.name}</Text>
                    {c.dailyBudgetMinor != null && (
                      <Text style={styles.rowSub}>Budget {formatMinor(c.dailyBudgetMinor)}/day</Text>
                    )}
                  </View>
                  <ChevronRight size={18} color={colors.textFaint} strokeWidth={2.2} />
                </TouchableOpacity>
              ))}
              <PrimaryButton title="Add category" onPress={() => openEdit('new')} style={{ marginTop: spacing.sm }} />
            </ScrollView>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: spacing.md }}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Category name"
                placeholderTextColor={colors.textFaint}
              />

              <Text style={styles.label}>Colour</Text>
              <View style={styles.swatchWrap}>
                {SWATCHES.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.swatch, { backgroundColor: s }, color === s && styles.swatchOn]}
                    onPress={() => setColor(s)}
                  />
                ))}
              </View>

              <Text style={styles.label}>Daily budget ₹ (optional)</Text>
              <TextInput
                style={styles.input}
                value={budget}
                onChangeText={setBudget}
                keyboardType="decimal-pad"
                placeholder="e.g. 1500"
                placeholderTextColor={colors.textFaint}
              />

              <PrimaryButton title="Save" onPress={onSave} loading={saving} style={{ marginTop: spacing.sm }} />
              {editing !== 'new' && (
                <TouchableOpacity style={styles.delete} onPress={onDelete}>
                  <Text style={styles.deleteText}>Delete category</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
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
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    dot: { width: 16, height: 16, borderRadius: 8 },
    rowName: { fontSize: font.size.md, fontWeight: '600', color: colors.text },
    rowSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
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
    swatchWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: 'transparent' },
    swatchOn: { borderColor: colors.text },
    delete: { alignItems: 'center', paddingVertical: 12 },
    deleteText: { color: colors.danger, fontWeight: '700', fontSize: font.size.md },
  });
