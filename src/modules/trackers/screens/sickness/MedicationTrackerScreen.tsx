/**
 * MedicationTrackerScreen — "My medic" tab (upcoming dose + active
 * medications list) and "History" tab (merged symptom + medication
 * timeline). Tap a row → Edit/Delete bottom sheet.
 */
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { AppText } from '../../../../shared/components/AppText';
import { AppEmptyState } from '../../../../shared/components/AppEmptyState';
import { Colors } from '../../../../shared/theme/colors';
import { EntryActionSheet } from '../../components/EntryActionSheet';
import { useSicknessTracker } from '../../hooks/useTrackers';
import { severityTag, statusTagColors } from './sicknessMeta';

type Props = NativeStackScreenProps<any, 'MedicationTracker'>;

function fmtTime(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h)) return '';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
function shortDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}
function relativeDay(dateISO: string) {
  const today = new Date().toISOString().split('T')[0];
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (dateISO === today) return 'Today';
  if (dateISO === y.toISOString().split('T')[0]) return 'Yesterday';
  return new Date(dateISO + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
const titleCase = (v?: string) =>
  v ? v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

// ── Glyphs ───────────────────────────────────────────────────────────────────

const PillGlyph = ({ color = Colors.white, size = 20 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={3.2} y={8.6} width={17.6} height={6.8} rx={3.4} stroke={color} strokeWidth={1.8}
      transform="rotate(-45 12 12)" />
    <Path d="M9.2 9.2 14.8 14.8" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);
const ThermometerGlyph = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M10 14.8V5.5a2 2 0 1 1 4 0v9.3a4 4 0 1 1-4 0Z" stroke="#141414" strokeWidth={1.6} />
    <Circle cx={12} cy={17.8} r={1.8} fill="#141414" />
    <Path d="M15.5 8h2.5M15.5 11h2.5" stroke="#141414" strokeWidth={1.4} strokeLinecap="round" />
  </Svg>
);
const CalendarGlyph = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Rect x={4} y={5} width={16} height={15} rx={3} stroke="#666666" strokeWidth={1.8} />
    <Path d="M4 10h16M8.5 3v4M15.5 3v4" stroke="#666666" strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);
const RepeatGlyph = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path d="M4 10a8 8 0 0 1 13.7-5.6M20 14a8 8 0 0 1-13.7 5.6"
      stroke="#666666" strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M18 3v5h-5M6 21v-5h5" stroke="#666666" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const ChevronGlyph = ({ color = Colors.white }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M6 3 10.5 8 6 13" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const PlusGlyph = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M10 4v12M4 10h12" stroke={Colors.white} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
/** Alarm clock for the upcoming-dose banner. */
const AlarmArt = () => (
  <Svg width={46} height={46} viewBox="0 0 48 48" fill="none">
    <Path d="M8 11 14 6M40 11 34 6" stroke="#E8A33D" strokeWidth={4} strokeLinecap="round" />
    <Circle cx={24} cy={26} r={16} fill="#F2B33D" />
    <Circle cx={24} cy={26} r={12.5} fill="#FFF3DA" />
    <Path d="M24 18v8.4l5.4 3" stroke="#8A6B2E" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 40l-3 4M34 40l3 4" stroke="#D99A28" strokeWidth={3.4} strokeLinecap="round" />
  </Svg>
);

export function MedicationTrackerScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'medic' | 'history'>(route.params?.tab ?? 'medic');
  const {
    medications, refreshing, refresh, timeline,
    upcomingDose, removeMedication, removeSymptom,
  } = useSicknessTracker();

  const [selected, setSelected] = useState<
    { kind: 'symptom' | 'medication'; id: string; label: string; date: string; time: string } | null
  >(null);

  const activeMeds = [...medications].sort((a, b) =>
    `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));

  // Render immediately; empty states cover both loading and no-data.
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
          <AppText style={s.backArrow}>←</AppText>
        </TouchableOpacity>
        <View style={s.hBtn} />
        <View style={s.hBtn} />
      </View>

      <View style={s.toggle}>
        {(['medic', 'history'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[s.toggleBtn, tab === t && s.toggleBtnActive]}
            activeOpacity={0.85}
            onPress={() => setTab(t)}
          >
            <AppText style={[s.toggleText, tab === t && s.toggleTextOn]}>
              {t === 'medic' ? 'My medic' : 'History'}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: 24 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.trackers} />}
      >
        {tab === 'medic' ? (
          <>
            {upcomingDose ? (
              <TouchableOpacity
                style={s.upcomingCard}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('SicknessLog', { medicationId: upcomingDose.id })}
              >
                <AlarmArt />
                <View style={s.upcomingText}>
                  <AppText style={s.upcomingKicker}>UPCOMING DOSE</AppText>
                  <AppText style={s.upcomingTitle}>1 medication due soon</AppText>
                  <AppText style={s.upcomingSub} numberOfLines={1}>
                    Next: {upcomingDose.medication} at {fmtTime(upcomingDose.time)}
                  </AppText>
                </View>
                <ChevronGlyph />
              </TouchableOpacity>
            ) : null}

            <View style={s.sectionRow}>
              <AppText style={s.sectionTitle}>Active list</AppText>
              <AppText style={s.sectionCount}>{activeMeds.length} ACTIVE</AppText>
            </View>

            {activeMeds.length === 0 ? (
              <AppEmptyState
                emoji="💊"
                title="No medications yet"
                subtitle="Log one to start tracking doses."
                actionLabel="Add medication"
                onAction={() => navigation.navigate('SicknessLog', { tab: 'medic' })}
              />
            ) : activeMeds.map(m => {
              const tag = statusTagColors(m.status);
              const asNeeded = (m.frequency ?? '').toLowerCase().includes('needed');
              return (
                <TouchableOpacity
                  key={m.id}
                  style={s.medCard}
                  activeOpacity={0.85}
                  onPress={() => setSelected({ kind: 'medication', id: m.id, label: m.medication, date: m.date, time: m.time })}
                >
                  <View style={s.medTop}>
                    <View style={s.medIcon}><PillGlyph /></View>
                    <View style={s.medBody}>
                      <View style={s.medTitleRow}>
                        <View style={s.medTitleText}>
                          <AppText style={s.medName} numberOfLines={1}>{m.medication}</AppText>
                          <AppText style={s.medSub} numberOfLines={1}>
                            {[m.dosage, titleCase(m.foodTiming)].filter(Boolean).join(' • ') || '—'}
                          </AppText>
                        </View>
                        <View style={[s.statusChip, { backgroundColor: tag.bg }]}>
                          <AppText style={[s.statusText, { color: tag.text }]}>
                            {m.status.toUpperCase()}
                          </AppText>
                        </View>
                      </View>

                      <View style={s.medFoot}>
                        <View style={s.medFootLeft}>
                          {asNeeded ? <RepeatGlyph /> : <CalendarGlyph />}
                          <AppText style={s.medFootText} numberOfLines={1}>
                            {m.frequency ?? 'Once'} • Started {shortDate(m.date)}
                          </AppText>
                        </View>
                        <AppText style={s.medTime}>{fmtTime(m.time)}</AppText>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        ) : (
          <>
            <AppText style={s.historyTitle}>My sickness</AppText>
            {timeline.length === 0 ? (
              <AppEmptyState
                emoji="🩺"
                title="Nothing logged yet"
                subtitle="Symptoms and medications will show up here."
              />
            ) : timeline.map(item => {
              const isSymptom = item.kind === 'symptom';
              const entry: any = item.entry;
              const label = isSymptom ? entry.symptom : entry.medication;
              const tag = isSymptom ? severityTag(entry.severity) : statusTagColors(entry.status);
              // `duration` is the only free-text detail we store, so it stands
              // in for the mock's "Throbbing" / "Sudden onset" descriptors.
              const tagLabel = isSymptom
                ? [severityTag(entry.severity).label, entry.duration].filter(Boolean).join(', ')
                : entry.status.charAt(0).toUpperCase() + entry.status.slice(1);
              return (
                <TouchableOpacity
                  key={`${item.kind}-${item.id}`}
                  style={s.histRow}
                  activeOpacity={0.85}
                  onPress={() => setSelected({ kind: item.kind, id: item.id, label, date: item.date, time: item.time })}
                >
                  <View style={s.histLeft}>
                    <View style={s.histIcon}>
                      {isSymptom ? <ThermometerGlyph /> : <PillGlyph color="#141414" size={18} />}
                    </View>
                    <View style={s.histText}>
                      <AppText style={s.histName} numberOfLines={1}>{label}</AppText>
                      <AppText style={s.histTime} numberOfLines={1}>
                        {relativeDay(item.date)}, {fmtTime(item.time)}
                      </AppText>
                    </View>
                  </View>
                  <View style={[s.histChip, { backgroundColor: tag.bg }]}>
                    <AppText style={[s.histChipText, { color: tag.text }]} numberOfLines={1}>{tagLabel}</AppText>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        <TouchableOpacity
          style={s.cta}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('SicknessLog', { tab: tab === 'medic' ? 'medic' : 'symptoms' })}
        >
          <PlusGlyph />
          <AppText style={s.ctaText}>Quick log</AppText>
        </TouchableOpacity>
      </ScrollView>

      <EntryActionSheet
        visible={!!selected}
        title={selected?.label}
        subtitle={selected ? `${relativeDay(selected.date)} · ${fmtTime(selected.time)}` : undefined}
        onClose={() => setSelected(null)}
        onEdit={() => selected && navigation.navigate('SicknessLog',
          selected.kind === 'symptom' ? { symptomId: selected.id } : { medicationId: selected.id })}
        onDelete={() => selected && (selected.kind === 'symptom' ? removeSymptom(selected.id) : removeMedication(selected.id))}
        deleteConfirmMessage="Delete this entry? This cannot be undone."
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
const SOFT_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.04,
  shadowRadius: 20,
  elevation: 2,
} as const;

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 24, color: '#141414' },

  toggle: {
    flexDirection: 'row', alignItems: 'stretch', gap: 4,
    marginHorizontal: 20, marginBottom: 12, padding: 5,
    backgroundColor: Colors.white, borderRadius: 30,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  toggleBtn: { flex: 1, paddingVertical: 12, borderRadius: 24, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#141414' },
  toggleText: { fontFamily: 'DMSans-SemiBold', fontSize: 15, letterSpacing: 0.12, color: '#141414' },
  toggleTextOn: { color: Colors.white },

  scroll: { paddingHorizontal: 20, gap: 16 },

  // ── Upcoming dose ──
  upcomingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 24, backgroundColor: '#141414',
    borderWidth: 1, borderColor: 'rgba(221,191,197,0.30)', ...SOFT_SHADOW,
  },
  upcomingText: { flex: 1, minWidth: 0 },
  upcomingKicker: {
    fontFamily: 'DMSans-Bold', fontSize: 12, lineHeight: 16, letterSpacing: 0.6,
    color: Colors.white,
  },
  upcomingTitle: { fontFamily: 'DMSans-Regular', fontSize: 16, lineHeight: 23, color: Colors.white },
  upcomingSub: { fontFamily: 'DMSans-Regular', fontSize: 13, lineHeight: 19, color: '#999999' },

  // ── Active list ──
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sectionTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 20, lineHeight: 28, color: '#141414' },
  sectionCount: { fontFamily: 'DMSans-Bold', fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: '#151515' },

  medCard: {
    padding: 16, borderRadius: 24, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: '#E6E8EB', ...SOFT_SHADOW,
  },
  medTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  medIcon: {
    width: 46, height: 46, borderRadius: 16, backgroundColor: '#141414',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  medBody: { flex: 1, minWidth: 0, gap: 14 },
  medTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  medTitleText: { flex: 1, minWidth: 0 },
  medName: { fontFamily: 'DMSans-SemiBold', fontSize: 16, lineHeight: 23, color: '#141414' },
  medSub: { fontFamily: 'DMSans-Regular', fontSize: 13, lineHeight: 19, color: '#666666' },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, flexShrink: 0 },
  statusText: { fontFamily: 'DMSans-Bold', fontSize: 11, lineHeight: 16, letterSpacing: 0.6 },

  medFoot: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    paddingTop: 14, borderTopWidth: 1, borderTopColor: '#ECEEF1',
  },
  medFootLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  medFootText: { flex: 1, minWidth: 0, fontFamily: 'DMSans-Medium', fontSize: 12, lineHeight: 16, color: '#666666' },
  medTime: { fontFamily: 'DMSans-Bold', fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: '#151515', flexShrink: 0 },

  // ── History ──
  historyTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 17, lineHeight: 24, color: '#191C1E' },
  histRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    padding: 14, borderRadius: 30, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: '#F1F1F1', ...CARD_SHADOW,
  },
  histLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  histIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  histText: { flex: 1, minWidth: 0 },
  histName: { fontFamily: 'DMSans-SemiBold', fontSize: 16, lineHeight: 22, color: '#191C1E' },
  histTime: { fontFamily: 'DMSans-Regular', fontSize: 13, lineHeight: 19, color: '#555555' },
  // Capped so a long descriptor truncates rather than squeezing the name out.
  histChip: { maxWidth: 132, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, flexShrink: 0 },
  histChipText: { fontFamily: 'DMSans-Regular', fontSize: 12, lineHeight: 17 },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 20, borderRadius: 999, backgroundColor: '#141414', marginTop: 6, ...CARD_SHADOW,
  },
  ctaText: { fontFamily: 'DMSans-SemiBold', fontSize: 20, lineHeight: 24, color: Colors.white },
});
