/**
 * TransactionDetailScreen — full detail for one transaction: amount, type,
 * category, date/time, payment method, account, attachment, notes, location and
 * tags. Offers Edit, Duplicate and Delete (confirm first).
 *
 * Deleting one half of a transfer warns that the paired row will be left
 * dangling, since balances are derived from both.
 */
import { BackArrowIcon } from '../../../../shared/components/AppBackButton';
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Image, Share, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../../../shared/components/AppText';
import { AppEmptyState } from '../../../../shared/components/AppEmptyState';
import { Colors } from '../../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../../shared/theme/spacing';
import { ConfirmDialog } from '../../components/HabitOverlays';
import { useExpenses } from '../../hooks/useExpenses';
import { useFinanceCategories, useFinanceAccounts } from '../../hooks/useFinance';
import { formatMoney } from '../../utils/expenseAnalytics';

type Props = NativeStackScreenProps<any, 'TransactionDetail'>;

const fmtTime = (hhmm?: string) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};

export function TransactionDetailScreen({ navigation, route }: Props) {
  const id: string | undefined = route.params?.id;
  const { txns, remove, add } = useExpenses();
  const { metaFor } = useFinanceCategories();
  const { accountById } = useFinanceAccounts();

  const txn = id ? txns.find(t => t.id === id) ?? null : null;

  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<'delete' | 'duplicate' | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const Header = (
    <View style={s.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn}><BackArrowIcon /></TouchableOpacity>
      <AppText variant="headingSmall">Transaction</AppText>
      <View style={s.hBtn} />
    </View>
  );

  if (!txn) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {Header}
        <AppEmptyState
          emoji="🧾"
          title="Transaction not found"
          subtitle="It may have been deleted."
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  const isIncome = txn.type === 'income';
  const cat = metaFor(txn.category, isIncome ? 'income' : 'expense');
  const account = txn.account ? accountById(txn.account) : null;

  const onDelete = async () => {
    setConfirming(false);
    setBusy('delete');
    setErr(null);
    try {
      await remove(txn.id);
      navigation.goBack();
    } catch {
      setErr('Could not delete. Check your connection and try again.');
      setBusy(null);
    }
  };

  const onDuplicate = async () => {
    setBusy('duplicate');
    setErr(null);
    try {
      const { id: _id, createdAt: _c, updatedAt: _u, transferId: _t, ...rest } = txn as any;
      await add({ ...rest, date: new Date().toISOString().split('T')[0] });
      Alert.alert('Duplicated', "A copy has been added with today's date.", [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch {
      setErr('Could not duplicate. Check your connection.');
    } finally { setBusy(null); }
  };

  const onShare = async () => {
    const lines = [
      `${isIncome ? 'Income' : 'Expense'}: ${formatMoney(txn.amount)}`,
      `Category: ${cat.label}`,
      `Date: ${txn.date}${txn.time ? ` ${txn.time}` : ''}`,
      txn.paymentType ? `Payment: ${txn.paymentType}` : null,
      account ? `Account: ${account.name}` : null,
      txn.note ? `Note: ${txn.note}` : null,
    ].filter(Boolean).join('\n');
    try { await Share.share({ message: lines }); } catch { /* user dismissed */ }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {Header}

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={[s.amountCard, { backgroundColor: cat.color + '18' }]}>
          <View style={[s.icon, { backgroundColor: cat.color + '2A' }]}>
            <AppText style={{ fontSize: 28 }}>{cat.emoji}</AppText>
          </View>
          <AppText variant="displayMedium" color={isIncome ? Colors.success : Colors.error}>
            {isIncome ? '+' : '−'}{formatMoney(txn.amount)}
          </AppText>
          <AppText variant="body" color={Colors.textSecondary}>{cat.label}</AppText>
          <View style={[s.typePill, { backgroundColor: isIncome ? '#DCFCE7' : '#FEE2E2' }]}>
            <AppText variant="caption" color={isIncome ? '#15803D' : '#B91C1C'}>
              {isIncome ? 'Income' : 'Expense'}
            </AppText>
          </View>
        </View>

        {txn.transferId ? (
          <View style={s.transferNote}>
            <AppText variant="caption" color={Colors.textSecondary}>
              🔁 Part of an account transfer. Deleting only this side will leave the paired entry behind.
            </AppText>
          </View>
        ) : null}

        <View style={s.card}>
          <Row label="Date" value={new Date(txn.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
          {fmtTime(txn.time) ? <Row label="Time" value={fmtTime(txn.time)!} /> : null}
          <Row label="Payment method" value={txn.paymentType ? txn.paymentType.toUpperCase() : '—'} />
          <Row label="Account" value={account ? `${account.emoji} ${account.name}` : '—'} />
          <Row label="Location" value={txn.location || '—'} last={!txn.tags?.length} />
          {txn.tags?.length ? (
            <View style={s.tagRow}>
              {txn.tags.map(t => (
                <View key={t} style={s.tag}><AppText variant="caption" color={Colors.textSecondary}>#{t}</AppText></View>
              ))}
            </View>
          ) : null}
        </View>

        {txn.note ? (
          <>
            <AppText variant="headingLarge" color={Colors.textPrimary} style={s.sectionLbl}>Notes</AppText>
            <View style={s.card}>
              <AppText variant="body" color={Colors.textSecondary} style={{ lineHeight: 22 }}>{txn.note}</AppText>
            </View>
          </>
        ) : null}

        {txn.attachmentUrl ? (
          <>
            <AppText variant="headingLarge" color={Colors.textPrimary} style={s.sectionLbl}>Attachment</AppText>
            <Image source={{ uri: txn.attachmentUrl }} style={s.attachment} resizeMode="cover" />
          </>
        ) : null}

        {err ? <AppText variant="caption" color={Colors.error} style={{ marginTop: Spacing.sm }}>{err}</AppText> : null}

        <View style={s.actionRow}>
          <TouchableOpacity style={s.ghostBtn} activeOpacity={0.85} onPress={onDuplicate} disabled={busy !== null}>
            <AppText variant="label" color={Colors.textPrimary}>
              {busy === 'duplicate' ? 'Copying…' : '⧉ Duplicate'}
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity style={s.ghostBtn} activeOpacity={0.85} onPress={onShare}>
            <AppText variant="label" color={Colors.textPrimary}>↗ Share</AppText>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.editBtn} activeOpacity={0.9} onPress={() => navigation.navigate('AddExpense', { id: txn.id })}>
          <AppText style={{ fontSize: 16 }}>✏️</AppText>
          <AppText variant="button" color={Colors.white}>Edit Transaction</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={s.deleteBtn} activeOpacity={0.9} disabled={busy !== null} onPress={() => setConfirming(true)}>
          <AppText style={{ fontSize: 16 }}>🗑️</AppText>
          <AppText variant="button" color={Colors.error}>{busy === 'delete' ? 'Deleting…' : 'Delete Transaction'}</AppText>
        </TouchableOpacity>
      </ScrollView>

      <ConfirmDialog
        visible={confirming}
        title="Delete transaction"
        message={txn.transferId
          ? 'This is one half of a transfer. Deleting it will leave the other side behind and your balances will no longer match.'
          : 'This will permanently delete this transaction. Your balance, reports, charts and category totals will update.'}
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirming(false)}
        onConfirm={onDelete}
      />
    </SafeAreaView>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.row, last && { borderBottomWidth: 0 }]}>
      <AppText variant="body" color={Colors.textSecondary} style={{ flex: 1 }}>{label}</AppText>
      <AppText variant="headingSmall" color={Colors.textPrimary}>{value}</AppText>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgApp },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
  },
  hBtn: { minWidth: 40 },
  scroll: { padding: Spacing.base, paddingBottom: 60 },
  sectionLbl: { marginTop: Spacing.lg, marginBottom: Spacing.sm },

  amountCard: { alignItems: 'center', gap: 4, borderRadius: Radius.xl, paddingVertical: Spacing.lg },
  icon: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  typePill: { borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 4, marginTop: 4 },

  transferNote: { backgroundColor: '#EEF2FF', borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.base },

  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.base, marginTop: Spacing.base, ...Shadows.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 11,
    borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: Spacing.sm },
  tag: { backgroundColor: Colors.bgInput, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },

  attachment: { width: '100%', height: 200, borderRadius: Radius.lg },

  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  ghostBtn: {
    flex: 1, alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: Radius.full,
    paddingVertical: 14, ...Shadows.sm,
  },

  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.black, borderRadius: Radius.full, paddingVertical: 16, marginTop: Spacing.sm,
  },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FDE7EA', borderRadius: Radius.full, paddingVertical: 16, marginTop: Spacing.sm,
  },
});
