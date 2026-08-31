/**
 * ExpenseCategoryScreen — browse and manage categories with an Expense/Income
 * toggle. Each row shows icon, name, transaction count, total and % share, and
 * expands to reveal its transactions. Users can add, edit, recolour, reorder,
 * hide and delete categories.
 *
 * Deleting a category never rewrites history: transactions keep their stored
 * key and fall back to a neutral placeholder, so totals stay correct.
 */
import React, { useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppText } from '../../../../shared/components/AppText';
import { AppEmptyState } from '../../../../shared/components/AppEmptyState';
import { Colors } from '../../../../shared/theme/colors';
import { BottomSheet, ConfirmDialog } from '../../components/HabitOverlays';
import { useExpenses } from '../../hooks/useExpenses';
import { useFinanceCategories } from '../../hooks/useFinance';
import { formatMoney } from '../../utils/expenseAnalytics';
import {
  TxnType, FinanceCategory, CATEGORY_EMOJI_CHOICES, CATEGORY_COLOR_CHOICES,
} from '../../types';

type Props = NativeStackScreenProps<any, 'ExpenseCategory'>;

const PlusGlyph = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M10 4v12M4 10h12" stroke={Colors.white} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const EyeGlyph = ({ on }: { on: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke="#141414" strokeWidth={1.5} strokeLinejoin="round" />
    <Circle cx={12} cy={12} r={3} stroke="#141414" strokeWidth={1.5} />
    {!on && <Path d="M4 20 20 4" stroke="#141414" strokeWidth={1.5} strokeLinecap="round" />}
  </Svg>
);

export function ExpenseCategoryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { txns } = useExpenses();
  const { categories, loading, forType, addCategory, editCategory, removeCategory, toggleHidden, reorder } =
    useFinanceCategories();

  const [type, setType] = useState<TxnType>('expense');
  const [expanded, setExpanded] = useState<string | null>(null);

  // Editor sheet state — shared by "add" and "edit".
  const [editing, setEditing] = useState<FinanceCategory | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [emoji, setEmoji] = useState(CATEGORY_EMOJI_CHOICES[0]);
  const [color, setColor] = useState(CATEGORY_COLOR_CHOICES[0]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<FinanceCategory | null>(null);
  const [showHidden, setShowHidden] = useState(false);

  const rows = forType(type, showHidden);
  const hasHidden = categories.some(c => c.type === type && c.hidden);

  /** Per-category totals for the visible type. */
  const totals = useMemo(() => {
    const map: Record<string, { amount: number; count: number }> = {};
    txns.filter(t => (t.type ?? 'expense') === type).forEach(t => {
      const cur = map[t.category] ?? { amount: 0, count: 0 };
      map[t.category] = { amount: cur.amount + t.amount, count: cur.count + 1 };
    });
    const grand = Object.values(map).reduce((a, b) => a + b.amount, 0) || 1;
    return { map, grand };
  }, [txns, type]);

  const openAdd = () => {
    setEditing(null);
    setLabel(''); setEmoji(CATEGORY_EMOJI_CHOICES[0]); setColor(CATEGORY_COLOR_CHOICES[0]);
    setErr(null); setSheetOpen(true);
  };
  const openEdit = (c: FinanceCategory) => {
    setEditing(c);
    setLabel(c.label); setEmoji(c.emoji); setColor(c.color);
    setErr(null); setSheetOpen(true);
  };

  const onSaveCategory = async () => {
    const name = label.trim();
    if (!name) { setErr('Give the category a name.'); return; }
    if (name.length > 30) { setErr('Keep the name under 30 characters.'); return; }
    const clash = categories.some(c =>
      c.type === type && c.id !== editing?.id && c.label.toLowerCase() === name.toLowerCase());
    if (clash) { setErr('A category with that name already exists.'); return; }

    setErr(null); setSaving(true);
    try {
      if (editing) await editCategory(editing.id, { label: name, emoji, color });
      else await addCategory({ label: name, emoji, color, type });
      setSheetOpen(false);
    } catch {
      setErr('Could not save. Check your connection.');
    } finally { setSaving(false); }
  };

  const onDelete = async () => {
    const c = confirmDelete;
    setConfirmDelete(null);
    if (!c) return;
    try { await removeCategory(c.id); }
    catch { Alert.alert('Could not delete', 'Check your connection and try again.'); }
  };

  const onRowMenu = (c: FinanceCategory) => {
    const used = totals.map[c.key]?.count ?? 0;
    Alert.alert(c.label, used ? `${used} transaction${used === 1 ? '' : 's'} use this category.` : undefined, [
      { text: 'Edit', onPress: () => openEdit(c) },
      { text: c.hidden ? 'Unhide' : 'Hide', onPress: () => toggleHidden(c) },
      { text: 'Move up', onPress: () => reorder(c, -1) },
      { text: 'Move down', onPress: () => reorder(c, 1) },
      { text: 'Delete', style: 'destructive', onPress: () => setConfirmDelete(c) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
          <AppText style={s.backArrow}>←</AppText>
        </TouchableOpacity>
        <AppText style={s.headerTitle}>Category</AppText>
        {/* Only surfaced when something is hidden — otherwise a hidden
            category would have no way back. */}
        {hasHidden ? (
          <TouchableOpacity onPress={() => setShowHidden(v => !v)} style={s.hBtn} hitSlop={8}>
            <EyeGlyph on={showHidden} />
          </TouchableOpacity>
        ) : <View style={s.hBtn} />}
      </View>

      <View style={s.toggle}>
        {(['expense', 'income'] as TxnType[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[s.toggleBtn, type === t && s.toggleActive]}
            activeOpacity={0.85}
            onPress={() => { setType(t); setExpanded(null); }}
          >
            <AppText style={[s.toggleText, type === t && s.toggleTextOn]}>
              {t === 'income' ? 'Income Category' : 'Expense Category'}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      {/* The home indicator / nav bar was swallowing the last row, so the
          bottom inset is added to the scroll padding rather than to the
          SafeAreaView — that keeps the list scrolling under it, not clipped. */}
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {rows.length === 0 ? (
          <AppEmptyState
            emoji="🗂️"
            title={loading ? 'Setting up categories…' : 'No categories yet'}
            subtitle={loading ? 'Just a moment.' : 'Add one to start organising your transactions.'}
            actionLabel="Add Category"
            onAction={openAdd}
          />
        ) : rows.map(c => {
          const t = totals.map[c.key] ?? { amount: 0, count: 0 };
          const pct = Math.round((t.amount / totals.grand) * 100);
          const open = expanded === c.id;
          const catTxns = txns.filter(x => x.category === c.key && (x.type ?? 'expense') === type);
          return (
            <View key={c.id} style={[s.card, c.hidden && { opacity: 0.55 }]}>
              <TouchableOpacity
                style={s.row}
                activeOpacity={0.85}
                onPress={() => setExpanded(open ? null : c.id)}
                onLongPress={() => onRowMenu(c)}
              >
                <View style={[s.icon, { backgroundColor: c.color + '1F' }]}>
                  <AppText style={s.iconEmoji}>{c.emoji}</AppText>
                </View>
                <View style={s.rowText}>
                  <AppText style={s.name} numberOfLines={1}>
                    {c.label}{c.hidden ? '  (hidden)' : ''}
                  </AppText>
                  <AppText style={s.count}>
                    {t.count} Transaction{t.count === 1 ? '' : 's'}
                  </AppText>
                </View>
                <View style={s.rowRight}>
                  <AppText style={s.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                    {formatMoney(t.amount)}
                  </AppText>
                  <AppText style={s.pct}>{pct}%</AppText>
                </View>
              </TouchableOpacity>

              {open && (
                <View style={s.txnList}>
                  {catTxns.length === 0 ? (
                    <AppText style={s.muted}>No transactions in this category yet.</AppText>
                  ) : catTxns.map(x => (
                    <TouchableOpacity
                      key={x.id}
                      style={s.txnRow}
                      activeOpacity={0.85}
                      onPress={() => navigation.navigate('TransactionDetail', { id: x.id })}
                    >
                      <View style={s.rowText}>
                        <AppText style={s.txnTitle} numberOfLines={1}>{x.note || x.date}</AppText>
                        <AppText style={s.count}>
                          {x.date}{x.paymentType ? ` · ${x.paymentType}` : ''}
                        </AppText>
                      </View>
                      <AppText style={[s.txnAmount, { color: type === 'income' ? '#34C759' : '#FF383C' }]}>
                        {type === 'income' ? '+' : '-'}{formatMoney(x.amount)}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={s.manageBtn} activeOpacity={0.85} onPress={() => onRowMenu(c)}>
                    <AppText style={s.manageText}>Manage category</AppText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        <TouchableOpacity style={s.addBtn} activeOpacity={0.9} onPress={openAdd}>
          <PlusGlyph />
          <AppText style={s.addText}>Add Category</AppText>
        </TouchableOpacity>
      </ScrollView>

      {/* Add / edit sheet */}
      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? 'Edit category' : `New ${type} category`}
      >
        <AppText variant="label" color={Colors.textSecondary}>Name</AppText>
        <TextInput
          style={s.input as any}
          placeholder="e.g. Coffee"
          placeholderTextColor={Colors.textLight}
          value={label}
          onChangeText={setLabel}
          maxLength={30}
        />

        <AppText variant="label" color={Colors.textSecondary} style={{ marginTop: 16 }}>Icon</AppText>
        <View style={s.choiceWrap}>
          {CATEGORY_EMOJI_CHOICES.map(e => (
            <TouchableOpacity
              key={e}
              style={[s.emojiChoice, emoji === e && { borderColor: Colors.black, borderWidth: 2 }]}
              onPress={() => setEmoji(e)}
            >
              <AppText style={{ fontSize: 20 }}>{e}</AppText>
            </TouchableOpacity>
          ))}
        </View>

        <AppText variant="label" color={Colors.textSecondary} style={{ marginTop: 16 }}>Colour</AppText>
        <View style={s.choiceWrap}>
          {CATEGORY_COLOR_CHOICES.map(c => (
            <TouchableOpacity
              key={c}
              style={[s.colorChoice, { backgroundColor: c }, color === c && s.colorChoiceOn]}
              onPress={() => setColor(c)}
            />
          ))}
        </View>

        {err ? (
          <View style={s.errBanner}><AppText variant="caption" color={Colors.error}>{err}</AppText></View>
        ) : null}

        <TouchableOpacity style={s.sheetSave} activeOpacity={0.9} disabled={saving} onPress={onSaveCategory}>
          <AppText style={s.addText}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add category'}</AppText>
        </TouchableOpacity>
      </BottomSheet>

      <ConfirmDialog
        visible={!!confirmDelete}
        title="Delete category"
        message={
          (totals.map[confirmDelete?.key ?? '']?.count ?? 0) > 0
            ? "Existing transactions keep their amounts and stay in your totals, but they'll show as uncategorised. Hiding the category instead keeps it out of pickers without affecting anything."
            : 'This category has no transactions. Deleting it is safe.'
        }
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(null)}
        onConfirm={onDelete}
      />
    </SafeAreaView>
  );
}

const HAIRLINE = 'rgba(153,153,153,0.20)';
const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.10,
  shadowRadius: 20,
  elevation: 4,
} as const;

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 24, color: '#141414' },
  headerTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 24, color: '#141414' },

  // ── Type toggle ──
  toggle: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    marginHorizontal: 20, marginBottom: 14, padding: 5,
    backgroundColor: Colors.white, borderRadius: 30,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  toggleBtn: { flex: 1, paddingVertical: 11, borderRadius: 24, alignItems: 'center' },
  toggleActive: { backgroundColor: '#141414' },
  toggleText: { fontFamily: 'DMSans-SemiBold', fontSize: 13, color: '#494453' },
  toggleTextOn: { color: Colors.white },

  scroll: { paddingHorizontal: 20, gap: 14 },

  // ── Category rows ──
  card: {
    backgroundColor: Colors.white, borderRadius: 26,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  // Fixed 42px icon + fixed 86px value column, so every row's name starts and
  // every amount ends on the same x — regardless of label or amount length.
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12, minHeight: 66,
  },
  icon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconEmoji: { fontSize: 22, lineHeight: 26, textAlign: 'center', includeFontPadding: false } as any,
  rowText: { flex: 1, minWidth: 0, justifyContent: 'center' },
  name: { fontFamily: 'DMSans-SemiBold', fontSize: 16, lineHeight: 21, color: '#1D1A22' },
  count: { fontFamily: 'DMSans-Regular', fontSize: 12, lineHeight: 17, color: '#9CA3AF' },
  rowRight: { width: 86, alignItems: 'flex-end', justifyContent: 'center', flexShrink: 0 },
  amount: {
    fontFamily: 'DMSans-Bold', fontSize: 16, lineHeight: 21, color: '#1D1A22',
    textAlign: 'right', alignSelf: 'stretch',
  },
  pct: {
    fontFamily: 'DMSans-Regular', fontSize: 11, lineHeight: 17, color: '#9CA3AF',
    textAlign: 'right', alignSelf: 'stretch',
  },

  // ── Expanded transactions ──
  txnList: {
    gap: 10, paddingHorizontal: 18, paddingBottom: 14, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: HAIRLINE, marginHorizontal: 4,
  },
  txnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  txnTitle: { fontFamily: 'DMSans-Medium', fontSize: 14, color: '#1D1A22' },
  txnAmount: { fontFamily: 'DMSans-SemiBold', fontSize: 14 },
  muted: { fontFamily: 'DMSans-Regular', fontSize: 13, color: '#9CA3AF' },
  manageBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
  manageText: { fontFamily: 'DMSans-SemiBold', fontSize: 13, color: '#4F46E5' },

  // ── Add ──
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 18, borderRadius: 999, backgroundColor: '#141414', marginTop: 6,
  },
  addText: { fontFamily: 'DMSans-SemiBold', fontSize: 17, color: Colors.white },

  // ── Editor sheet ──
  input: {
    backgroundColor: Colors.bgInput, borderRadius: 14, padding: 14, marginTop: 6,
    fontFamily: 'DMSans-Regular', fontSize: 15, color: Colors.textPrimary,
  } as any,
  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  emojiChoice: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: Colors.bgInput,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.transparent,
  },
  colorChoice: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: Colors.transparent },
  colorChoiceOn: { borderColor: Colors.black },

  errBanner: { backgroundColor: '#FDE7EA', borderRadius: 12, padding: 12, marginTop: 10 },
  sheetSave: {
    backgroundColor: '#141414', borderRadius: 999, paddingVertical: 16,
    alignItems: 'center', marginTop: 20,
  },
});
