/**
 * AddExpenseScreen — create/edit a transaction. Expense/Income toggle; fields:
 * amount, category, date, payment type, account, bill attachment (image), notes.
 * Validation + optimistic save via useExpenses.
 */
import React, { useMemo, useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, TextInput, Image, Alert, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { RootState } from '../../../../store';
import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { uploadLocalFile } from '../../../../lib/firebaseStorage';
import { DatePickerSheet } from '../../components/HabitOverlays';
import { PickerSheet } from '../../components/PickerSheet';
import { PAYMENT_TYPES } from '../../utils/expenseAnalytics';
import { useExpenses } from '../../hooks/useExpenses';
import { useFinanceCategories, useFinanceAccounts } from '../../hooks/useFinance';
import { TxnType, PaymentType } from '../../types';

type Props = NativeStackScreenProps<any, 'AddExpense'>;

const todayISO = () => new Date().toISOString().split('T')[0];
const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const fmtDate = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };

const PAYMENT_LABELS: Record<PaymentType, string> = {
  cash: 'Cash', card: 'Debit Card', upi: 'UPI', bank: 'Bank Transfer', other: 'Other',
};
const paymentFromLabel = (label: string): PaymentType | undefined =>
  PAYMENT_TYPES.find(p => PAYMENT_LABELS[p] === label);

const NOTES_MAX = 500;

// ── Glyphs ───────────────────────────────────────────────────────────────────

const CaretGlyph = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M6 9.5 12 15.5l6-6" stroke="#000000" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const CalendarGlyph = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Rect x={4} y={5} width={16} height={15} rx={3} stroke="#000000" strokeWidth={1.5} />
    <Path d="M4 10h16M8.5 3v4M15.5 3v4" stroke="#000000" strokeWidth={1.5} strokeLinecap="round" />
    {[7.5, 10.5, 13.5, 16.5].map(cx => (
      <React.Fragment key={cx}>
        <Circle cx={cx} cy={13.5} r={0.8} fill="#000000" />
        <Circle cx={cx} cy={16.5} r={0.8} fill="#000000" />
      </React.Fragment>
    ))}
  </Svg>
);
const CardGlyph = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Rect x={3} y={5} width={18} height={14} rx={3} stroke="#000000" strokeWidth={1.5} />
    <Path d="M3 10h18" stroke="#000000" strokeWidth={1.5} />
    <Rect x={15} y={13} width={3.5} height={2.5} rx={1} fill="#000000" />
  </Svg>
);
const BankGlyph = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M12 3 3 8h18l-9-5Z" stroke="#000000" strokeWidth={1.5} strokeLinejoin="round" />
    <Path d="M5.5 8v9M9.5 8v9M14.5 8v9M18.5 8v9M4 20h16" stroke="#000000" strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);
const DocGlyph = () => (
  <Svg width={36} height={36} viewBox="0 0 40 40" fill="none">
    <Path d="M11 6h13l6 6v22a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" fill="#F7F1E4" stroke="#D9C9A5" strokeWidth={1.6} strokeLinejoin="round" />
    <Path d="M24 6v6h6" fill="#EDE2C8" stroke="#D9C9A5" strokeWidth={1.6} strokeLinejoin="round" />
    <Path d="M14 18h11M14 23h11M14 28h7" stroke="#B9A67C" strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

export function AddExpenseScreen({ navigation, route }: Props) {
  const editingId: string | undefined = route.params?.id;
  const { add, update } = useExpenses();
  const existing = useSelector((st: RootState) => st.trackers.expenses.find(t => t.id === editingId));

  const { forType } = useFinanceCategories();
  const { activeAccounts } = useFinanceAccounts();

  // `type` lets a caller open the form straight into income mode (the
  // Expense home "Add income" quick action); editing always wins.
  const [type, setType] = useState<TxnType>(
    existing?.type ?? (route.params?.type === 'income' ? 'income' : 'expense'),
  );
  const [amount, setAmount]     = useState(existing ? String(existing.amount) : '');
  const [category, setCategory] = useState(existing?.category ?? '');
  const [date, setDate]         = useState(existing?.date ?? todayISO());
  const [payment, setPayment]   = useState<PaymentType | undefined>(existing?.paymentType);
  const [account, setAccount]   = useState(existing?.account ?? '');
  const [attachment, setAttachment] = useState<string | undefined>(existing?.attachmentUrl);
  const [note, setNote]         = useState(existing?.note ?? '');

  // Not on this screen, but preserved so editing a transaction never wipes
  // values set elsewhere.
  const [time] = useState(existing?.time ?? nowHHMM());
  const location = existing?.location;
  const tags = existing?.tags;

  const [dateSheet, setDateSheet]       = useState(false);
  const [catSheet, setCatSheet]         = useState(false);
  const [paymentSheet, setPaymentSheet] = useState(false);
  const [accountSheet, setAccountSheet] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isIncome = type === 'income';

  // Categories now come from the user's own list rather than constants.
  const cats = forType(type);
  const catValid = useMemo(() => cats.some(c => c.key === category), [cats, category]);
  const selectedCat = cats.find(c => c.key === category);
  const selectedAccount = activeAccounts.find(a => a.id === account);

  const pickImage = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow access to attach a bill.'); return; }
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (res.canceled || !res.assets?.[0]) return;
    setUploading(true);
    try {
      const url = await uploadLocalFile(`expense/${Date.now()}.jpg`, res.assets[0].uri);
      setAttachment(url);
    } catch { Alert.alert('Upload failed', 'Could not upload the file. Try again.'); }
    finally { setUploading(false); }
  };
  const attachSheet = () => Alert.alert(isIncome ? 'Attach document' : 'Attach bill', undefined, [
    { text: 'Camera', onPress: () => pickImage(true) },
    { text: 'Gallery', onPress: () => pickImage(false) },
    ...(attachment ? [{ text: 'Remove', style: 'destructive' as const, onPress: () => setAttachment(undefined) }] : []),
    { text: 'Cancel', style: 'cancel' as const },
  ]);

  const onSave = async () => {
    const amt = Number(amount);
    const cat = catValid ? category : '';
    if (!(amt > 0)) { setErr('Enter a valid amount'); return; }
    if (!cat) { setErr(isIncome ? 'Pick a source of income' : 'Pick a category'); return; }
    if (date > todayISO()) { setErr("You can't log a transaction for a future date."); return; }

    setErr(null); setSaving(true);
    const data = {
      date, time, amount: amt, currency: 'INR', type, category: cat,
      paymentType: payment, account: account || undefined,
      attachmentUrl: attachment, note: note.trim() || undefined,
      location, tags,
    };
    try {
      if (editingId) await update(editingId, data); else await add(data as any);
      Alert.alert(
        editingId ? 'Transaction updated' : 'Transaction saved',
        'Your balance, reports, charts and category totals have been updated.',
        [{ text: 'Done', onPress: () => navigation.goBack() }],
      );
    } catch { setErr('Could not save. Check your connection.'); }
    finally { setSaving(false); }
  };

  /** Label + right-hand value/icon, used by Date / Payment / Account. */
  const FieldRow = ({
    label, value, icon, onPress,
  }: { label: string; value: string; icon: React.ReactNode; onPress: () => void }) => (
    <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={onPress}>
      <View style={s.fieldRow}>
        <AppText style={s.cardTitle}>{label}</AppText>
        <View style={s.fieldRight}>
          <AppText style={s.fieldValue} numberOfLines={1}>{value}</AppText>
          {icon}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
          <AppText style={s.backArrow}>←</AppText>
        </TouchableOpacity>
        <AppText style={s.headerTitle}>
          {editingId ? 'Edit Transaction' : isIncome ? 'Add Income' : 'Add Expenses'}
        </AppText>
        <View style={s.hBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* ── Expense / Income toggle ── */}
        <View style={s.toggle}>
          {(['expense', 'income'] as TxnType[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[s.toggleBtn, type === t ? s.toggleOn : s.toggleOff]}
              activeOpacity={0.85}
              onPress={() => {
                if (t === type) return;
                setType(t);
                // Categories are per-type, so a carried-over id would be invalid.
                setCategory('');
              }}
            >
              <AppText style={[s.toggleText, type === t && s.toggleTextOn]}>
                {t === 'income' ? 'Income' : 'Expenses'}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Amount ── */}
        <View style={s.amountCard}>
          <AppText style={s.currency}>₹</AppText>
          <TextInput
            style={s.amountInput as any}
            placeholder="0"
            placeholderTextColor="rgba(20,20,20,0.25)"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        {/* ── Category ── */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <AppText style={s.cardTitle}>{isIncome ? 'Source of Income' : 'Category'}</AppText>
          </View>
          <TouchableOpacity style={s.innerCard} activeOpacity={0.85} onPress={() => setCatSheet(true)}>
            <View style={s.fieldRow}>
              <View style={s.catLeft}>
                <AppText style={s.catEmoji}>{selectedCat?.emoji ?? '🏷️'}</AppText>
                <AppText style={s.catLabel} numberOfLines={1}>
                  {selectedCat?.label ?? (isIncome ? 'Choose a source' : 'Choose a category')}
                </AppText>
              </View>
              <CaretGlyph />
            </View>
          </TouchableOpacity>
        </View>

        <FieldRow label="Date" value={fmtDate(date)} icon={<CalendarGlyph />} onPress={() => setDateSheet(true)} />
        <FieldRow
          label="Payment"
          value={payment ? PAYMENT_LABELS[payment] : 'Select'}
          icon={<CardGlyph />}
          onPress={() => setPaymentSheet(true)}
        />
        <FieldRow
          label="Account"
          value={selectedAccount ? selectedAccount.name : activeAccounts.length ? 'Select' : 'Add one'}
          icon={<BankGlyph />}
          onPress={() => (activeAccounts.length ? setAccountSheet(true) : navigation.navigate('Accounts'))}
        />

        {/* ── Attachment ── */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <AppText style={s.cardTitle}>
              {isIncome ? 'Attach Document ' : 'Attach Bill '}
              <AppText style={s.cardTitleMuted}>(Optional)</AppText>
            </AppText>
          </View>
          <View style={s.attachRow}>
            <TouchableOpacity style={s.attachTile} activeOpacity={0.85} onPress={attachSheet}>
              {attachment ? (
                <Image source={{ uri: attachment }} style={s.attachPreview} resizeMode="cover" />
              ) : (
                <>
                  <DocGlyph />
                  <AppText style={s.attachLabel}>
                    {uploading ? 'Uploading…' : isIncome ? 'Add Document' : 'Add Bill'}
                  </AppText>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Notes ── */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <AppText style={s.cardTitle}>
              Notes <AppText style={s.cardTitleMuted}>(Optional)</AppText>
            </AppText>
          </View>
          <View style={s.notesBox}>
            <TextInput
              style={s.notesInput as any}
              placeholder={isIncome ? 'Nov Bill - Payment' : 'Group Dinner'}
              placeholderTextColor="rgba(70,69,82,0.50)"
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={NOTES_MAX}
            />
          </View>
        </View>

        {err ? (
          <View style={s.errBanner}>
            <AppText variant="caption" color={Colors.error}>{err}</AppText>
          </View>
        ) : null}

        <TouchableOpacity style={s.saveBtn} onPress={onSave} disabled={saving} activeOpacity={0.9}>
          <AppText style={s.saveText}>{saving ? 'Saving…' : 'Save'}</AppText>
        </TouchableOpacity>
      </ScrollView>

      <DatePickerSheet visible={dateSheet} title="Date" value={date} onConfirm={setDate} onClose={() => setDateSheet(false)} />

      <PickerSheet
        visible={catSheet}
        title={isIncome ? 'Source of Income' : 'Category'}
        options={cats.map(c => `${c.emoji} ${c.label}`)}
        value={selectedCat ? `${selectedCat.emoji} ${selectedCat.label}` : undefined}
        onSelect={label => {
          const hit = cats.find(c => `${c.emoji} ${c.label}` === label);
          if (hit) setCategory(hit.key);
          setCatSheet(false);
        }}
        onClose={() => setCatSheet(false)}
      />
      <PickerSheet
        visible={paymentSheet}
        title="Payment"
        options={PAYMENT_TYPES.map(p => PAYMENT_LABELS[p])}
        value={payment ? PAYMENT_LABELS[payment] : undefined}
        onSelect={label => { const p = paymentFromLabel(label); if (p) setPayment(p); setPaymentSheet(false); }}
        onClose={() => setPaymentSheet(false)}
      />
      <PickerSheet
        visible={accountSheet}
        title="Account"
        options={activeAccounts.map(a => a.name)}
        value={selectedAccount?.name}
        onSelect={name => {
          const hit = activeAccounts.find(a => a.name === name);
          if (hit) setAccount(hit.id);
          setAccountSheet(false);
        }}
        onClose={() => setAccountSheet(false)}
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

  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },

  // ── Toggle ──
  toggle: { flexDirection: 'row', gap: 16 },
  toggleBtn: {
    flex: 1, height: 48, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center', ...CARD_SHADOW,
  },
  toggleOn: { backgroundColor: '#141414' },
  toggleOff: { backgroundColor: '#E5E5E5' },
  toggleText: { fontFamily: 'DMSans-SemiBold', fontSize: 16, lineHeight: 24, color: '#141414' },
  toggleTextOn: { color: Colors.white },

  // ── Amount ──
  amountCard: {
    height: 140, borderRadius: 30, backgroundColor: Colors.white,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  currency: { fontFamily: 'DMSans-SemiBold', fontSize: 30, color: '#141414' },
  amountInput: {
    fontFamily: 'DMSans-SemiBold', fontSize: 46, color: '#141414',
    minWidth: 100, maxWidth: 240, textAlign: 'center', padding: 0,
  } as any,

  // ── Cards ──
  card: {
    backgroundColor: Colors.white, borderRadius: 30, padding: 10, gap: 10,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  cardHead: { paddingHorizontal: 10, paddingVertical: 5 },
  cardTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: '#141414' },
  cardTitleMuted: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: '#999999' },
  innerCard: {
    backgroundColor: Colors.white, borderRadius: 30, padding: 10,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },

  fieldRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    paddingLeft: 10, paddingRight: 12, paddingVertical: 5,
  },
  fieldRight: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1, minWidth: 0 },
  fieldValue: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: '#141414', flexShrink: 1 },

  catLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  catEmoji: { fontSize: 26, lineHeight: 32, includeFontPadding: false } as any,
  catLabel: { flex: 1, minWidth: 0, fontFamily: 'DMSans-SemiBold', fontSize: 19, color: '#141414' },

  // ── Attachment ──
  attachRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  attachTile: {
    width: 120, height: 86, borderRadius: 20, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE,
  },
  attachPreview: { width: '100%', height: '100%' },
  attachLabel: { fontFamily: 'DMSans-Medium', fontSize: 12, lineHeight: 16, color: '#141414' },

  // ── Notes ──
  notesBox: {
    height: 128, padding: 16, borderRadius: 20,
    backgroundColor: '#F6F7F8', borderWidth: 1, borderColor: '#C7C5D4',
  },
  notesInput: {
    flex: 1, textAlignVertical: 'top', padding: 0,
    fontFamily: 'DMSans-Regular', fontSize: 16, lineHeight: 24, color: '#141414',
  } as any,

  errBanner: { backgroundColor: '#FDE7EA', borderRadius: 12, padding: 12 },

  saveBtn: {
    paddingVertical: 18, paddingHorizontal: 30, borderRadius: 999,
    backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center', ...CARD_SHADOW,
  },
  saveText: { fontFamily: 'DMSans-SemiBold', fontSize: 20, lineHeight: 24, color: Colors.white },
});
