/**
 * SicknessHomeScreen — greeting, today's feeling banner, at-a-glance
 * (active symptoms / medications due), a merged recent-entries timeline,
 * and a quick-log CTA into SicknessLogScreen.
 */
import React from 'react';
import {
  View, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { useSicknessTracker } from '../../hooks/useTrackers';
import { SicknessFeeling } from '../../types';
import { severityTag, statusTagColors } from './sicknessMeta';

type Props = NativeStackScreenProps<any, 'SicknessHome'>;

const FEELING_LABEL: Record<SicknessFeeling, string> = {
  bad: 'Bad', nauseous: 'Nauseous', queasy: 'Queasy', good: 'Good',
};

// ── Glyphs ───────────────────────────────────────────────────────────────────

/** Face that matches the recorded feeling, rather than one generic smiley. */
const FaceGlyph = ({ feeling }: { feeling: SicknessFeeling }) => {
  const st = { stroke: '#141414', strokeWidth: 1.8, fill: 'none' as const, strokeLinecap: 'round' as const };
  const mouth =
    feeling === 'good' ? 'M8.5 14.5c1 1.4 2.2 2 3.5 2s2.5-.6 3.5-2'
    : feeling === 'queasy' ? 'M8.5 15c1.2-1 2.3-1 3.5 0s2.3 1 3.5 0'
    : 'M8.5 16c1-1.4 2.2-2 3.5-2s2.5.6 3.5 2';
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9.2} {...st} />
      <Circle cx={9} cy={10} r={1.1} fill="#141414" />
      <Circle cx={15} cy={10} r={1.1} fill="#141414" />
      <Path d={mouth} {...st} />
    </Svg>
  );
};
const ChevronGlyph = ({ color = '#141414', size = 16 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path d="M6 3 10.5 8 6 13" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const ArrowGlyph = () => (
  <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
    <Path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" stroke="#141414" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const PlusGlyph = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M10 4v12M4 10h12" stroke={Colors.white} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const ThermometerGlyph = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M10 14.8V5.5a2 2 0 1 1 4 0v9.3a4 4 0 1 1-4 0Z" stroke="#141414" strokeWidth={1.6} />
    <Circle cx={12} cy={17.8} r={1.8} fill="#141414" />
    <Path d="M15.5 8h2.5M15.5 11h2.5" stroke="#141414" strokeWidth={1.4} strokeLinecap="round" />
  </Svg>
);
const PillGlyph = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Rect x={3.2} y={8.6} width={17.6} height={6.8} rx={3.4} stroke="#141414" strokeWidth={1.6}
      transform="rotate(-45 12 12)" />
    <Path d="M9.2 9.2 14.8 14.8" stroke="#141414" strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);

export function SicknessHomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const {
    symptoms, medications, loading, refreshing, refresh, error,
    activeSymptoms, dueMedications, timeline, feelingToday,
  } = useSicknessTracker();

  const hasData = symptoms.length > 0 || medications.length > 0;

  const header = (
    <View style={s.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
        <AppText style={s.backArrow}>←</AppText>
      </TouchableOpacity>
      <AppText style={s.headerTitle}>Sickness</AppText>
      <View style={s.hBtn} />
    </View>
  );

  // ── §21 loading — a skeleton beats metrics that aren't loaded yet ──────────
  if (loading && !hasData) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {header}
        <View style={s.centre}>
          <ActivityIndicator color={Colors.trackers} />
          <AppText style={s.centreText}>Loading your health record…</AppText>
        </View>
      </SafeAreaView>
    );
  }

  // ── §21 error — retry rather than a blank dashboard ───────────────────────
  if (error && !hasData) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {header}
        <View style={s.centre}>
          <AppText style={s.centreTitle}>Unable to load your health record.</AppText>
          <AppText style={s.centreText}>Please try again.</AppText>
          <TouchableOpacity style={s.retryBtn} activeOpacity={0.9} onPress={refresh}>
            <AppText style={s.retryText}>Retry</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {header}

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: 24 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.trackers} />}
      >
        {/* ── Feeling (§5.2) ──
            Nothing logged today shows a prompt, not "Good". Asserting a health
            status the user never gave is wrong anywhere, and worse in a
            sickness record where "Good" is a clinical-looking claim. */}
        <View style={s.card}>
          <AppText style={s.cardTitle}>How are you feeling Today?</AppText>
          <TouchableOpacity
            style={s.feelingPill}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('SicknessLog', { tab: 'symptoms' })}
          >
            <View style={s.feelingLeft}>
              <View style={s.feelingIcon}>
                <FaceGlyph feeling={feelingToday ?? 'good'} />
              </View>
              <View style={s.feelingText}>
                <AppText style={[s.feelingLabel, !feelingToday && s.feelingUnset]}>
                  {feelingToday ? FEELING_LABEL[feelingToday] : 'Not set'}
                </AppText>
                <AppText style={s.feelingHint}>
                  {feelingToday ? 'Tap to update' : 'Tap to record how you feel'}
                </AppText>
              </View>
            </View>
            <ChevronGlyph color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* ── At a glance ── */}
        <View style={s.sectionRow}>
          <AppText style={s.sectionTitle}>At a Glance</AppText>
          <TouchableOpacity hitSlop={8} onPress={() => navigation.navigate('HealthHistory', { view: 'timeline' })}>
            <AppText style={s.sectionLink}>View All</AppText>
          </TouchableOpacity>
        </View>

        <View style={s.glanceRow}>
          <TouchableOpacity
            style={s.glanceCard}
            activeOpacity={0.85}
            // §12 — the count opens the symptom history behind it. Landing on
            // an empty logging form after tapping "3 active symptoms" answers
            // a question the user didn't ask.
            onPress={() => navigation.navigate('HealthHistory', { view: 'symptoms' })}
          >
            <View style={s.glanceTop}>
              <AppText style={s.glanceTitle}>Active Symptoms</AppText>
              <AppText style={s.glanceValue}>{activeSymptoms.length}</AppText>
            </View>
            <View style={s.glanceLink}>
              <AppText style={s.glanceLinkText}>View</AppText>
              <ArrowGlyph />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.glanceCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('HealthHistory', { view: 'medication' })}
          >
            <View style={s.glanceTop}>
              <AppText style={s.glanceTitle}>Medications</AppText>
              <View style={s.glanceValueRow}>
                <AppText style={s.glanceValue}>{dueMedications.length}</AppText>
                {dueMedications.length > 0 && <AppText style={s.glanceDue}>Due Soon</AppText>}
              </View>
            </View>
            <View style={s.glanceLink}>
              <AppText style={s.glanceLinkText}>View</AppText>
              <ArrowGlyph />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Recent entries ── */}
        <View style={s.sectionRow}>
          <AppText style={s.sectionTitleSm}>Recent Entries</AppText>
          <TouchableOpacity
            hitSlop={8}
            onPress={() => navigation.navigate('HealthHistory', { view: 'timeline' })}
          >
            <AppText style={s.sectionLink}>View Timeline</AppText>
          </TouchableOpacity>
        </View>

        {timeline.length === 0 ? (
          <View style={s.emptyCard}>
            <AppText style={s.emptyText}>Nothing logged yet — tap Quick log to start.</AppText>
          </View>
        ) : timeline.slice(0, 5).map(item => {
          const isSymptom = item.kind === 'symptom';
          const entry = item.entry as any;
          const label = isSymptom ? entry.symptom : entry.medication;
          const tag = isSymptom ? severityTag(entry.severity) : statusTagColors(entry.status);
          // The mock's "Mild, persistent" pairs severity with a pattern we
          // don't store; `duration` is the closest real field, so it's only
          // appended when the user actually recorded one.
          const tagText = isSymptom
            ? [severityTag(entry.severity).label, entry.duration].filter(Boolean).join(', ')
            : String(entry.status).replace(/^\w/, (c: string) => c.toUpperCase());

          return (
            <TouchableOpacity
              key={`${item.kind}-${item.id}`}
              style={s.entryRow}
              activeOpacity={0.85}
              // SicknessLog keys off symptomId / medicationId, not a generic id.
              onPress={() => navigation.navigate('SicknessLog',
                isSymptom ? { symptomId: item.id } : { medicationId: item.id })}
            >
              <View style={s.entryLeft}>
                <View style={s.entryIcon}>{isSymptom ? <ThermometerGlyph /> : <PillGlyph />}</View>
                <View style={s.entryText}>
                  <AppText style={s.entryTitle} numberOfLines={1}>{label}</AppText>
                  <AppText style={s.entryTime} numberOfLines={1}>
                    {relativeDay(item.date)}, {fmtTime(item.time)}
                  </AppText>
                </View>
              </View>
              <View style={[s.tag, { backgroundColor: tag.bg }]}>
                <AppText style={[s.tagText, { color: tag.text }]} numberOfLines={1}>{tagText}</AppText>
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={s.cta}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('SicknessLog', {})}
        >
          <PlusGlyph />
          <AppText style={s.ctaText}>Quick log</AppText>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function relativeDay(dateISO: string) {
  const today = new Date().toISOString().split('T')[0];
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (dateISO === today) return 'Today';
  if (dateISO === y.toISOString().split('T')[0]) return 'Yesterday';
  return new Date(dateISO + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
function fmtTime(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h)) return '';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
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
  headerTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 24, color: '#141414' },

  scroll: { paddingHorizontal: 20, paddingTop: 4, gap: 16 },

  // ── Feeling ──
  card: {
    padding: 10, borderRadius: 30, gap: 10, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  cardTitle: {
    fontFamily: 'DMSans-SemiBold', fontSize: 20, lineHeight: 26, color: '#141414',
    paddingHorizontal: 10, paddingVertical: 5,
  },
  feelingPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    padding: 14, borderRadius: 30, backgroundColor: '#141414', ...SOFT_SHADOW,
  },
  feelingLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  feelingIcon: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  feelingText: { flex: 1, minWidth: 0 },
  feelingLabel: { fontFamily: 'DMSans-Regular', fontSize: 16, lineHeight: 22, color: Colors.white },
  feelingUnset: { opacity: 0.75 },

  // ── Loading / error (§21) ──
  centre: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, paddingBottom: 60, gap: 12,
  },
  centreTitle: {
    fontFamily: 'DMSans-SemiBold', fontSize: 19, color: '#141414', textAlign: 'center',
  },
  centreText: {
    fontFamily: 'DMSans-Regular', fontSize: 14, lineHeight: 21,
    color: '#6B7280', textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8, paddingVertical: 14, paddingHorizontal: 40,
    backgroundColor: '#141414', borderRadius: 9999,
  },
  retryText: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: Colors.white },
  feelingHint: { fontFamily: 'DMSans-Regular', fontSize: 16, lineHeight: 22, color: Colors.white },

  // ── Sections ──
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 4 },
  sectionTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 20, lineHeight: 26, color: '#191C1E' },
  sectionTitleSm: { fontFamily: 'DMSans-SemiBold', fontSize: 17, lineHeight: 24, color: '#191C1E' },
  sectionLink: { fontFamily: 'DMSans-Regular', fontSize: 15, lineHeight: 22, color: '#999999' },

  // ── At a glance ──
  glanceRow: { flexDirection: 'row', gap: 14 },
  glanceCard: {
    flex: 1, minWidth: 0, minHeight: 124, padding: 16, borderRadius: 30,
    justifyContent: 'space-between', backgroundColor: Colors.white,
    borderWidth: 1.5, borderColor: HAIRLINE, ...SOFT_SHADOW,
  },
  glanceTop: { gap: 4 },
  glanceTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 15, lineHeight: 22, color: '#141414' },
  glanceValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' },
  glanceValue: { fontFamily: 'DMSans-Regular', fontSize: 16, lineHeight: 22, color: '#191C1E' },
  glanceDue: { fontFamily: 'DMSans-Medium', fontSize: 15, lineHeight: 22, color: '#BA1A1A' },
  glanceLink: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  glanceLinkText: { fontFamily: 'DMSans-Regular', fontSize: 15, lineHeight: 22, color: '#141414' },

  // ── Entries ──
  emptyCard: {
    padding: 16, borderRadius: 30, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  emptyText: { fontFamily: 'DMSans-Regular', fontSize: 15, color: '#999999' },
  entryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    padding: 14, borderRadius: 30, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: '#F1F1F1', ...CARD_SHADOW,
  },
  entryLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  entryIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  entryText: { flex: 1, minWidth: 0 },
  entryTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 16, lineHeight: 22, color: '#191C1E' },
  entryTime: { fontFamily: 'DMSans-Regular', fontSize: 13, lineHeight: 19, color: '#555555' },
  // Capped so a long "Moderate, all afternoon" truncates instead of shoving
  // the title off a 375pt screen.
  tag: { maxWidth: 132, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, flexShrink: 0 },
  tagText: { fontFamily: 'DMSans-Regular', fontSize: 12, lineHeight: 17 },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 20, borderRadius: 999, backgroundColor: '#141414', marginTop: 6, ...CARD_SHADOW,
  },
  ctaText: { fontFamily: 'DMSans-SemiBold', fontSize: 20, lineHeight: 24, color: Colors.white },
});
