/**
 * IntimacyEntryDetailScreen — read-only view of a single logged entry.
 * Date + weekday header, a card listing Who / Protection / Time / Feeling /
 * After mood plus free-text Notes, then Edit Entry and Delete Entry actions
 * (delete routes through a confirm dialog first).
 */
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';

import { RootState } from '../../../../store';
import { AppText } from '../../../../shared/components/AppText';
import { AppEmptyState } from '../../../../shared/components/AppEmptyState';
import { Colors } from '../../../../shared/theme/colors';
import { ConfirmDialog } from '../../components/HabitOverlays';
import { useIntimacyTracker } from '../../hooks/useTrackers';
import { IntimacyFeeling, IntimacyMoodAfter } from '../../types';

import PartnerIcon from '../../components/PartnerIcon';
import SelfloveIcon from '../../components/SelfloveIcon';
import { CheckBadge, CrossBadge } from '../../components/ProtectionBadges';

type Props = NativeStackScreenProps<any, 'IntimacyEntryDetail'>;

const FEELING_META: Record<IntimacyFeeling, { label: string; emoji: string }> = {
  loved:        { label: 'Loved',        emoji: '🥰' },
  happy:        { label: 'Happy',        emoji: '😄' },
  relaxed:      { label: 'Relaxed',      emoji: '😌' },
  passionate:   { label: 'Passionate',   emoji: '😍' },
  neutral:      { label: 'Neutral',      emoji: '🙂' },
  disappointed: { label: 'Disappointed', emoji: '😞' },
};
const MOOD_AFTER_META: Record<IntimacyMoodAfter, { label: string; emoji: string }> = {
  amazing: { label: 'Amazing', emoji: '🤩' },
  good:    { label: 'Good',    emoji: '😍' },
  ok:      { label: 'Ok',      emoji: '😊' },
  low:     { label: 'Low',     emoji: '😔' },
};

const fmtTime = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

const PencilIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M14.2 2.3a1.9 1.9 0 0 1 2.7 2.7l-9 9-3.6.9.9-3.6 9-9Z"
      stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);
const TrashIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M3.5 5h13M8 5V3.3h4V5M5.2 5l.7 11.2h8.2L14.8 5"
      stroke="#FF2222" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

export function IntimacyEntryDetailScreen({ navigation, route }: Props) {
  const id: string | undefined = route.params?.id;
  const entry = useSelector((st: RootState) => st.trackers.intimacy.find(e => e.id === id));
  const { removeEntry } = useIntimacyTracker();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const onDelete = async () => {
    if (!entry) return;
    setConfirming(false);
    setDeleting(true);
    try {
      await removeEntry(entry.id);
      navigation.goBack();
    } finally {
      setDeleting(false);
    }
  };

  const Header = (
    <View style={s.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
        <AppText style={s.backArrow}>←</AppText>
      </TouchableOpacity>
      <AppText style={s.headerTitle}>Entry Details</AppText>
      <View style={s.hBtn} />
    </View>
  );

  // The entry can vanish if it was deleted from another screen while this one
  // was still mounted — fall back to an empty state rather than crashing.
  if (!entry) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {Header}
        <AppEmptyState
          emoji="💗"
          title="Entry not found"
          subtitle="This entry may have been deleted."
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  const dateObj = new Date(entry.date + 'T00:00:00');
  const dateLabel = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

  const isPartner = entry.who === 'partner';
  // The last visible row loses its divider. Which row that is depends on what
  // the entry actually contains, so it's derived rather than hardcoded.
  const lastRow = entry.notes ? 'notes'
    : entry.moodAfter ? 'mood'
    : entry.feeling ? 'feeling'
    : 'time';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {Header}

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Date banner */}
        <View style={s.dateCard}>
          <View style={s.dateInner}>
            <View style={s.dateLeft}>
              <View style={s.dateIcon}>
                <AppText style={s.dateIconGlyph}>❤️</AppText>
              </View>
              <AppText style={s.dateText}>{dateLabel}</AppText>
            </View>
            <AppText style={s.weekday}>{weekday}</AppText>
          </View>
        </View>

        {/* Detail card */}
        <View style={s.card}>
          <DetailRow
            label="Who"
            value={isPartner ? 'With Partner' : 'Self Love'}
            circle
            icon={isPartner
              ? <PartnerIcon width={40} height={40} />
              : <SelfloveIcon width={40} height={40} />}
          />

          {entry.protection ? (
            <DetailRow
              label="Protection"
              value={entry.protection === 'protected' ? 'Protected' : 'Unprotected'}
              circle
              icon={entry.protection === 'protected' ? <CheckBadge /> : <CrossBadge />}
            />
          ) : null}

          <DetailRow
            label="Time"
            value={fmtTime(entry.time)}
            emoji="🕐"
            last={lastRow === 'time'}
          />

          {entry.feeling ? (
            <DetailRow
              label="Feeling"
              value={FEELING_META[entry.feeling].label}
              emoji={FEELING_META[entry.feeling].emoji}
              last={lastRow === 'feeling'}
            />
          ) : null}

          {entry.moodAfter ? (
            <DetailRow
              label="After mood"
              value={MOOD_AFTER_META[entry.moodAfter].label}
              emoji={MOOD_AFTER_META[entry.moodAfter].emoji}
              last={lastRow === 'mood'}
            />
          ) : null}

          {entry.notes ? (
            <View style={s.notesBlock}>
              <AppText style={s.notesTitle}>Notes</AppText>
              <AppText style={s.notesText}>{entry.notes}</AppText>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          style={s.editBtn}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('LogIntimacy', { id: entry.id })}
        >
          <PencilIcon />
          <AppText style={s.editText}>Edit Entry</AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.deleteBtn}
          activeOpacity={0.9}
          disabled={deleting}
          onPress={() => setConfirming(true)}
        >
          <TrashIcon />
          <AppText style={s.deleteText}>{deleting ? 'Deleting…' : 'Delete Entry'}</AppText>
        </TouchableOpacity>
      </ScrollView>

      <ConfirmDialog
        visible={confirming}
        title="Delete entry"
        message="This will permanently delete this intimacy entry. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirming(false)}
        onConfirm={onDelete}
      />
    </SafeAreaView>
  );
}

/**
 * `circle` picks the 48px round avatar used for Who/Protection; the rest get
 * the 40px rounded tile. Two shapes, matching the design's own split.
 */
function DetailRow({
  label, value, icon, emoji, circle, last,
}: {
  label: string; value: string;
  icon?: React.ReactNode; emoji?: string;
  circle?: boolean; last?: boolean;
}) {
  return (
    <View style={[s.row, last && s.rowLast]}>
      <View style={circle ? s.rowCircle : s.rowTile}>
        {icon ?? <AppText style={s.rowEmoji}>{emoji}</AppText>}
      </View>
      <View style={s.rowBody}>
        <AppText style={s.rowLabel}>{label}</AppText>
        <AppText style={s.rowValue}>{value}</AppText>
      </View>
    </View>
  );
}

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.10,
  shadowRadius: 20,
  elevation: 5,
} as const;
const HAIRLINE = 'rgba(153,153,153,0.20)';

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },

  // Flat header — no card, shadow or rounded corners behind the title.
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12,
  },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 24, color: '#141414' },
  headerTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 24, color: '#141414' },

  scroll: { padding: 24, paddingBottom: 40, gap: 20 },

  // ── Date banner ──
  // Sits directly on the page: no card, no shadow. Only the heart keeps its
  // circle, since that's the icon itself rather than a background.
  dateCard: { paddingHorizontal: 2 },
  dateInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 5,
  },
  dateLeft: { flexDirection: 'row', alignItems: 'center', gap: 20, flexShrink: 1 },
  dateIcon: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: HAIRLINE,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  dateIconGlyph: { fontSize: 24, lineHeight: 30, includeFontPadding: false },
  dateText: { fontFamily: 'DMSans-Bold', fontSize: 24, lineHeight: 28, color: '#1F2937', flexShrink: 1 },
  weekday: { fontFamily: 'DMSans-Medium', fontSize: 20, lineHeight: 24, color: '#999999' },

  // ── Detail card ──
  card: {
    backgroundColor: Colors.white, borderRadius: 24, padding: 8,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  rowLast: { borderBottomWidth: 0 },
  rowCircle: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#F4F2F3',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  rowTile: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: HAIRLINE,
    alignItems: 'center', justifyContent: 'center',
    // Nudged so the 40px tile and the 48px circle share a left edge.
    marginLeft: 4, marginRight: 4,
  },
  rowEmoji: { fontSize: 22, lineHeight: 28, includeFontPadding: false },
  rowBody: { flex: 1, minWidth: 0 },
  rowLabel: { fontFamily: 'DMSans-Bold', fontSize: 16, color: '#141414' },
  rowValue: { fontFamily: 'DMSans-Medium', fontSize: 14, lineHeight: 20, color: '#999999' },

  notesBlock: { paddingHorizontal: 16, paddingVertical: 24, gap: 7 },
  notesTitle: { fontFamily: 'DMSans-Bold', fontSize: 16, lineHeight: 20, color: '#0F172A' },
  notesText: { fontFamily: 'DMSans-Medium', fontSize: 14, lineHeight: 21, color: '#999999' },

  // ── Actions ──
  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 16, borderRadius: 20,
    backgroundColor: '#141414', borderWidth: 1.5, borderColor: HAIRLINE,
  },
  editText: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: Colors.white },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 16, borderRadius: 20,
    backgroundColor: 'rgba(255,116,116,0.20)',
  },
  deleteText: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: '#FF2222' },
});
