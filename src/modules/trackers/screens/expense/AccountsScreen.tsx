/**
 * AccountsScreen — cash / bank / wallet / card accounts with a running balance
 * (opening balance + income − expenses), per-account income and expense totals,
 * add/edit/archive/delete, and transfers between accounts.
 *
 * A transfer writes two linked transactions — an expense on the source and an
 * income on the destination, sharing a `transferId`. That keeps every balance
 * derived from the same transaction list rather than a separate ledger, so
 * nothing can drift out of sync.
 */
import { BackArrowIcon } from '../../../../shared/components/AppBackButton';
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../../../shared/components/AppText';
import { AppEmptyState } from '../../../../shared/components/AppEmptyState';
import { Colors } from '../../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../../shared/theme/spacing';
import { BottomSheet, ConfirmDialog, DatePickerSheet } from '../../components/HabitOverlays';
import { useExpenses } from '../../hooks/useExpenses';
import { useFinanceAccounts } from '../../hooks/useFinance';
import { formatMoney } from '../../utils/expenseAnalytics';
import { FinanceAccount, FinanceAccountKind, ACCOUNT_KIND_META } from '../../types';

type Props = NativeStackScreenProps<any, 'Accounts'>;
const KINDS: FinanceAccountKind[] = ['cash', 'bank', 'wallet', 'card'];
const todayISO = () => new Date().toISOString().split('T')[0];

export function AccountsScreen({ navigation }: Props) {
  const { accounts, rollups, totalBalance, addAccount, editAccount, removeAccount, error } = useFinanceAccounts();
  const { add } = useExpenses();

  // Add / edit sheet
  const [editing, setEditing] = useState<FinanceAccount | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<FinanceAccountKind>('bank');
  const [opening, setOpening] = useState('0');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<FinanceAccount | null>(null);

  // Transfer sheet
  const [transferOpen, setTransferOpen] = useState(false);
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [transferAmt, setTransferAmt] = useState('');
  const [transferDate, setTransferDate] = useState(todayISO());
  const [transferDateSheet, setTransferDateSheet] = useState(false);
  const [transferErr, setTransferErr] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);

  const openAdd = () => {
    setEditing(null); setName(''); setKind('bank'); setOpening('0');
    setErr(null); setSheetOpen(true);
  };
  const openEdit = (a: FinanceAccount) => {
    setEditing(a); setName(a.name); setKind(a.kind); setOpening(String(a.openingBalance));
    setErr(null); setSheetOpen(true);
  };

  const onSaveAccount = async () => {
    const n = name.trim();
    if (!n) { setErr('Give the account a name.'); return; }
    const ob = Number(opening);
    if (!Number.isFinite(ob)) { setErr('Opening balance must be a number.'); return; }
    const clash = accounts.some(a => a.id !== editing?.id && a.name.toLowerCase() === n.toLowerCase());
    if (clash) { setErr('An account with that name already exists.'); return; }

    setErr(null); setSaving(true);
    try {
      if (editing) await editAccount(editing.id, { name: n, kind, openingBalance: ob, emoji: ACCOUNT_KIND_META[kind].emoji });
      else await addAccount({ name: n, kind, openingBalance: ob });
      setSheetOpen(false);
    } catch { setErr('Could not save. Check your connection.'); }
    finally { setSaving(false); }
  };

  const onDelete = async () => {
    const a = confirmDelete;
    setConfirmDelete(null);
    if (!a) return;
    try { await removeAccount(a.id); }
    catch { Alert.alert('Could not delete', 'Check your connection and try again.'); }
  };

  const onRowMenu = (a: FinanceAccount) => {
    Alert.alert(a.name, undefined, [
      { text: 'Edit', onPress: () => openEdit(a) },
      { text: a.archived ? 'Unarchive' : 'Archive', onPress: () => editAccount(a.id, { archived: !a.archived }) },
      { text: 'Delete', style: 'destructive', onPress: () => setConfirmDelete(a) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const onTransfer = async () => {
    const amt = Number(transferAmt);
    if (!fromId || !toId) { setTransferErr('Pick both accounts.'); return; }
    if (fromId === toId) { setTransferErr('Pick two different accounts.'); return; }
    if (!(amt > 0)) { setTransferErr('Enter an amount greater than 0.'); return; }

    setTransferErr(null); setTransferring(true);
    const transferId = `tr_${Date.now()}`;
    const from = accounts.find(a => a.id === fromId);
    const to = accounts.find(a => a.id === toId);
    try {
      await add({
        date: transferDate, amount: amt, currency: 'INR', type: 'expense',
        category: 'transfer', account: fromId, transferId,
        note: `Transfer to ${to?.name ?? 'account'}`,
      } as any);
      await add({
        date: transferDate, amount: amt, currency: 'INR', type: 'income',
        category: 'transfer', account: toId, transferId,
        note: `Transfer from ${from?.name ?? 'account'}`,
      } as any);
      setTransferOpen(false);
      setTransferAmt('');
      Alert.alert('Transfer recorded', `${formatMoney(amt)} moved from ${from?.name} to ${to?.name}.`);
    } catch {
      setTransferErr('Could not record the transfer. Check your connection.');
    } finally { setTransferring(false); }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn}><BackArrowIcon /></TouchableOpacity>
        <AppText variant="headingSmall">Accounts</AppText>
        <TouchableOpacity onPress={() => { setTransferErr(null); setTransferOpen(true); }} style={s.hBtn}>
          <AppText variant="label" color={Colors.primary}>Transfer</AppText>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {error ? (
          <View style={s.errBanner}><AppText variant="caption" color={Colors.error}>{error}</AppText></View>
        ) : null}

        <View style={s.totalCard}>
          <AppText variant="label" color="rgba(255,255,255,0.7)">Total balance</AppText>
          <AppText variant="displayMedium" color={Colors.white}>{formatMoney(totalBalance)}</AppText>
          <AppText variant="caption" color="rgba(255,255,255,0.6)">
            Across {rollups.filter(r => !r.account.archived).length} active account
            {rollups.filter(r => !r.account.archived).length === 1 ? '' : 's'}
          </AppText>
        </View>

        {accounts.length === 0 ? (
          <AppEmptyState
            emoji="🏦"
            title="No accounts yet"
            subtitle="Add cash, a bank account or a wallet to track balances."
            actionLabel="Add Account"
            onAction={openAdd}
          />
        ) : rollups.map(r => (
          <TouchableOpacity
            key={r.account.id}
            style={[s.card, r.account.archived && { opacity: 0.55 }]}
            activeOpacity={0.85}
            onPress={() => openEdit(r.account)}
            onLongPress={() => onRowMenu(r.account)}
          >
            <View style={s.rowTop}>
              <View style={s.icon}><AppText style={{ fontSize: 20 }}>{r.account.emoji}</AppText></View>
              <View style={{ flex: 1 }}>
                <AppText variant="headingSmall" color={Colors.textPrimary}>
                  {r.account.name}{r.account.archived ? '  (archived)' : ''}
                </AppText>
                <AppText variant="caption" color={Colors.textMuted}>
                  {ACCOUNT_KIND_META[r.account.kind].label} · {r.count} transaction{r.count === 1 ? '' : 's'}
                </AppText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <AppText variant="headingSmall" color={r.balance < 0 ? Colors.error : Colors.textPrimary}>
                  {formatMoney(r.balance)}
                </AppText>
                <AppText variant="caption" color={Colors.textLight}>balance</AppText>
              </View>
              <TouchableOpacity onPress={() => onRowMenu(r.account)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ paddingLeft: 6 }}>
                <AppText style={{ fontSize: 18, color: Colors.textMuted }}>⋮</AppText>
              </TouchableOpacity>
            </View>
            <View style={s.splitRow}>
              <View style={s.split}>
                <AppText variant="caption" color={Colors.textMuted}>Income</AppText>
                <AppText variant="label" color={Colors.success}>{formatMoney(r.income)}</AppText>
              </View>
              <View style={s.split}>
                <AppText variant="caption" color={Colors.textMuted}>Expenses</AppText>
                <AppText variant="label" color={Colors.error}>{formatMoney(r.expense)}</AppText>
              </View>
              <View style={s.split}>
                <AppText variant="caption" color={Colors.textMuted}>Opening</AppText>
                <AppText variant="label" color={Colors.textSecondary}>{formatMoney(r.account.openingBalance)}</AppText>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={s.addBtn} activeOpacity={0.9} onPress={openAdd}>
        <AppText style={{ fontSize: 18, color: Colors.white }}>＋</AppText>
        <AppText variant="button" color={Colors.white}>Add Account</AppText>
      </TouchableOpacity>

      {/* Add / edit account */}
      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title={editing ? 'Edit account' : 'New account'}>
        <AppText variant="label" color={Colors.textSecondary}>Name</AppText>
        <TextInput
          style={s.input as any}
          placeholder="e.g. ICICI Bank"
          placeholderTextColor={Colors.textLight}
          value={name}
          onChangeText={setName}
          maxLength={40}
        />

        <AppText variant="label" color={Colors.textSecondary} style={{ marginTop: Spacing.base }}>Type</AppText>
        <View style={s.kindRow}>
          {KINDS.map(k => (
            <TouchableOpacity key={k} style={[s.kindBtn, kind === k && s.kindBtnOn]} onPress={() => setKind(k)}>
              <AppText style={{ fontSize: 16 }}>{ACCOUNT_KIND_META[k].emoji}</AppText>
              <AppText variant="caption" color={kind === k ? Colors.white : Colors.textSecondary}>
                {ACCOUNT_KIND_META[k].label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        <AppText variant="label" color={Colors.textSecondary} style={{ marginTop: Spacing.base }}>Opening balance</AppText>
        <TextInput
          style={s.input as any}
          placeholder="0"
          placeholderTextColor={Colors.textLight}
          keyboardType="numbers-and-punctuation"
          value={opening}
          onChangeText={setOpening}
        />
        <AppText variant="caption" color={Colors.textLight} style={{ marginTop: 4 }}>
          What's in the account today, before any tracked transactions.
        </AppText>

        {err ? <View style={s.errBanner}><AppText variant="caption" color={Colors.error}>{err}</AppText></View> : null}

        <TouchableOpacity style={s.sheetSave} activeOpacity={0.9} disabled={saving} onPress={onSaveAccount}>
          <AppText variant="button" color={Colors.white}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add account'}</AppText>
        </TouchableOpacity>
      </BottomSheet>

      {/* Transfer */}
      <BottomSheet visible={transferOpen} onClose={() => setTransferOpen(false)} title="Transfer between accounts">
        <AppText variant="label" color={Colors.textSecondary}>From</AppText>
        <View style={s.pickWrap}>
          {accounts.filter(a => !a.archived).map(a => (
            <TouchableOpacity key={a.id} style={[s.pick, fromId === a.id && s.pickOn]} onPress={() => setFromId(a.id)}>
              <AppText variant="caption" color={fromId === a.id ? Colors.white : Colors.textSecondary}>{a.emoji} {a.name}</AppText>
            </TouchableOpacity>
          ))}
        </View>

        <AppText variant="label" color={Colors.textSecondary} style={{ marginTop: Spacing.base }}>To</AppText>
        <View style={s.pickWrap}>
          {accounts.filter(a => !a.archived).map(a => (
            <TouchableOpacity key={a.id} style={[s.pick, toId === a.id && s.pickOn]} onPress={() => setToId(a.id)}>
              <AppText variant="caption" color={toId === a.id ? Colors.white : Colors.textSecondary}>{a.emoji} {a.name}</AppText>
            </TouchableOpacity>
          ))}
        </View>

        <AppText variant="label" color={Colors.textSecondary} style={{ marginTop: Spacing.base }}>Amount</AppText>
        <TextInput
          style={s.input as any}
          placeholder="0"
          placeholderTextColor={Colors.textLight}
          keyboardType="decimal-pad"
          value={transferAmt}
          onChangeText={setTransferAmt}
        />

        <TouchableOpacity style={[s.input, { justifyContent: 'center' }]} onPress={() => setTransferDateSheet(true)}>
          <AppText variant="body" color={Colors.textPrimary}>📅 {transferDate}</AppText>
        </TouchableOpacity>

        <AppText variant="caption" color={Colors.textLight} style={{ marginTop: 6 }}>
          Recorded as two linked transactions so both balances stay correct. Transfers aren't counted as income or
          spending in your reports.
        </AppText>

        {transferErr ? <View style={s.errBanner}><AppText variant="caption" color={Colors.error}>{transferErr}</AppText></View> : null}

        <TouchableOpacity style={s.sheetSave} activeOpacity={0.9} disabled={transferring} onPress={onTransfer}>
          <AppText variant="button" color={Colors.white}>{transferring ? 'Transferring…' : 'Transfer'}</AppText>
        </TouchableOpacity>
      </BottomSheet>

      <DatePickerSheet
        visible={transferDateSheet}
        title="Transfer date"
        value={transferDate}
        onConfirm={setTransferDate}
        onClose={() => setTransferDateSheet(false)}
      />

      <ConfirmDialog
        visible={!!confirmDelete}
        title="Delete account"
        message="Transactions on this account keep their amounts but lose the account link. Archiving instead keeps the history intact and hides it from pickers."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(null)}
        onConfirm={onDelete}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgApp },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
  },
  hBtn: { minWidth: 62 },
  scroll: { padding: Spacing.base, paddingBottom: 110 },

  totalCard: { backgroundColor: '#141414', borderRadius: Radius.xl, padding: Spacing.base, marginBottom: Spacing.base, ...Shadows.md },

  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.bgInput, alignItems: 'center', justifyContent: 'center' },
  splitRow: { flexDirection: 'row', marginTop: Spacing.sm, borderTopWidth: 0.5, borderTopColor: Colors.divider, paddingTop: Spacing.sm },
  split: { flex: 1, gap: 2 },

  addBtn: {
    position: 'absolute', left: Spacing.lg, right: Spacing.lg, bottom: Spacing.lg,
    flexDirection: 'row', gap: 8, backgroundColor: Colors.black, borderRadius: Radius.full,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center', ...Shadows.lg,
  },

  input: {
    backgroundColor: Colors.bgInput, borderRadius: Radius.md, padding: Spacing.md, marginTop: 6,
    fontFamily: 'DMSans-Regular', fontSize: 15, color: Colors.textPrimary, minHeight: 46,
  } as any,
  kindRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  kindBtn: {
    flex: 1, alignItems: 'center', gap: 3, paddingVertical: 10, borderRadius: Radius.md,
    backgroundColor: Colors.bgInput,
  },
  kindBtnOn: { backgroundColor: Colors.black },

  pickWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  pick: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard,
  },
  pickOn: { backgroundColor: Colors.black, borderColor: Colors.black },

  errBanner: { backgroundColor: '#FDE7EA', borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.sm },
  sheetSave: {
    backgroundColor: Colors.black, borderRadius: Radius.full, paddingVertical: 15,
    alignItems: 'center', marginTop: Spacing.lg,
  },
});
