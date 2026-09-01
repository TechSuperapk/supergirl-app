/**
 * WaterHomeScreen — today's goal ring, quick-add glasses, today's progress as a
 * droplet row, the next reminder, and the set-intake CTA.
 */
import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { useWaterTracker } from '../../hooks/useTrackers';
import { fmtL, nextReminderLabel } from '../../utils/waterAnalytics';
import GlassIcon from '../../components/GlassIcon';

type Props = NativeStackScreenProps<any, 'WaterHome'>;

const QUICK_ADD = [250, 500, 750, 1000];
/** One droplet per glass; the row is sized to the goal, not a fixed count. */
const ML_PER_DROPLET = 250;

const fmtDate = (d: Date) =>
  `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' }).toLowerCase()} ${d.getFullYear()}`;

// ── Glyphs ───────────────────────────────────────────────────────────────────


function DropletGlyph({ filled, size = 26 }: { filled: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <LinearGradient id="dropFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#7FC3F7" />
          <Stop offset="1" stopColor="#2E90FA" />
        </LinearGradient>
      </Defs>
      <Path
        d="M12 2.6c2.6 2 7 5.9 7 10.1a7 7 0 0 1-14 0c0-4.2 4.4-8.1 7-10.1Z"
        fill={filled ? 'url(#dropFill)' : '#E3E6EA'}
      />
    </Svg>
  );
}

const PencilGlyph = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M14.2 2.3a1.9 1.9 0 0 1 2.7 2.7l-9 9-3.6.9.9-3.6 9-9Z"
      stroke="#141414" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);
const HandTapGlyph = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M6.5 7V3.2a1.2 1.2 0 0 1 2.4 0V8m0-1.2a1.1 1.1 0 0 1 2.2 0v1.4m0-.8a1.1 1.1 0 0 1 2.2 0v3.1a4 4 0 0 1-4 4H8.4a3.4 3.4 0 0 1-2.6-1.2L3.3 10.4a1.2 1.2 0 0 1 1.8-1.5l1.4 1.3"
      stroke="#141414" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);
const CalendarGlyph = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Rect x={4} y={5} width={16} height={15} rx={2.5} stroke="#999999" strokeWidth={1.5} />
    <Path d="M4 10h16M8.5 3v4M15.5 3v4" stroke="#999999" strokeWidth={1.5} strokeLinecap="round" />
    {[8.5, 12, 15.5].map(cx => [13.5, 16.5].map(cy => (
      <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={0.9} fill="#999999" />
    )))}
  </Svg>
);
const AlarmGlyph = () => (
  <Svg width={30} height={30} viewBox="0 0 32 32" fill="none">
    <Circle cx={16} cy={18} r={10} fill="#FF6B6B" />
    <Circle cx={16} cy={18} r={7.5} fill="#FFE3E3" />
    <Path d="M16 14v4.2l2.8 1.6" stroke="#FF4242" strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M6.5 8.5 10 5.5M25.5 8.5 22 5.5" stroke="#FF6B6B" strokeWidth={2.4} strokeLinecap="round" />
  </Svg>
);

/**
 * Progress ring.
 *
 * `fraction` drives the arc and is capped at a full lap — there's nowhere for
 * overshoot to go visually. `percentage` is the real, uncapped figure, so a
 * 2.7 L day against a 2.5 L goal reads 108% rather than silently flattening to
 * 100% (§16).
 */
function GoalRing({
  fraction, percentage, size = 139, stroke = 14,
}: {
  fraction: number; percentage: number; size?: number; stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, fraction));
  const exceeded = percentage > 100;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#CEDDFA" strokeWidth={stroke} fill="none" />
        {p > 0 ? (
          <Circle
            cx={size / 2} cy={size / 2} r={r}
            stroke={exceeded ? '#12B76A' : '#3A80FA'} strokeWidth={stroke} fill="none"
            strokeDasharray={c} strokeDashoffset={c * (1 - p)}
            // A round cap at a full lap overshoots the start and leaves a bulge.
            strokeLinecap={p >= 0.999 ? 'butt' : 'round'}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, s.ringCentre]}>
        <View style={s.ringPctRow}>
          <AppText style={[s.ringPct, exceeded && s.ringPctOver]} numberOfLines={1}>
            {percentage}
          </AppText>
          <AppText style={[s.ringPctSign, exceeded && s.ringPctOver]}>%</AppText>
        </View>
        <AppText style={s.ringLabel}>Goal</AppText>
      </View>
    </View>
  );
}

export function WaterHomeScreen({ navigation }: Props) {
  const {
    loading, refreshing, refresh, error, logWater,
    goalMl, todayTotalMl, todayPct, todayPctValue, nextReminderAt, dashboard,
  } = useWaterTracker();
  const [adding, setAdding] = useState<number | null>(null);

  /**
   * A preset tile logs its amount straight away against today, at the current
   * time — one tap, and the ring moves. Anything that needs a different time,
   * date or note goes through Custom or "Set water intake".
   */
  const quickAdd = async (ml: number) => {
    if (adding !== null) return;          // §28 — no double-writes on a fast double-tap
    setAdding(ml);
    try { await logWater(ml); } finally { setAdding(null); }
  };

  const totalDroplets = Math.max(8, Math.ceil(goalMl / ML_PER_DROPLET));
  const filledDroplets = Math.floor(todayTotalMl / ML_PER_DROPLET);
  const openLog = () => navigation.navigate('LogWater', {});

  // ── §30 loading ────────────────────────────────────────────────────────────
  if (loading && !dashboard.hasData) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <Header onBack={() => navigation.goBack()} />
        <View style={s.centre}>
          <ActivityIndicator color="#3A80FA" />
          <AppText style={s.centreText}>Loading water data…</AppText>
        </View>
      </SafeAreaView>
    );
  }

  // ── §31 error ──────────────────────────────────────────────────────────────
  if (error && !dashboard.hasData) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <Header onBack={() => navigation.goBack()} />
        <View style={s.centre}>
          <AppText style={s.centreTitle}>Unable to load your water data.</AppText>
          <AppText style={s.centreText}>Please try again.</AppText>
          <TouchableOpacity style={s.retryBtn} activeOpacity={0.9} onPress={refresh}>
            <AppText style={s.retryText}>Retry</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── §29 empty ──────────────────────────────────────────────────────────────
  if (!dashboard.hasData) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <Header onBack={() => navigation.goBack()} />
        <View style={s.centre}>
          <GlassIcon width={68} height={102} />
          <AppText style={s.centreTitle}>No water intake logged today.</AppText>
          <AppText style={s.centreText}>
            Start tracking your water{'\n'}to reach your daily goal.
          </AppText>
        </View>

        {/* The tiles sit in the empty state too, so the first glass is one tap
            away rather than behind the CTA and a form. */}
        <View style={s.emptyActions}>
          <QuickAddRow adding={adding} onAdd={quickAdd} onCustom={openLog} />
          <TouchableOpacity style={s.cta} activeOpacity={0.9} onPress={openLog}>
            <View style={s.ctaPlus}>
              <View style={s.ctaPlusH} />
              <View style={s.ctaPlusV} />
            </View>
            <AppText style={s.ctaText}>Set water intake</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Header onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#3A80FA" />
        }
      >
        {/* Today's figures are already on screen, so this is a failed refresh
            rather than a dead end — inline, with a retry. */}
        {error ? (
          <View style={s.errorBanner}>
            <AppText variant="caption" color={Colors.error}>{error}</AppText>
            <TouchableOpacity onPress={refresh} hitSlop={8}>
              <AppText style={s.errorRetry}>Retry</AppText>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Goal ── */}
        <View style={s.goalCard}>
          <View style={s.goalTop}>
            <View style={s.goalText}>
              <AppText style={s.goalTitle}>Today's Goal</AppText>
              <View>
                <AppText style={s.goalValue}>{fmtL(todayTotalMl)}</AppText>
                <AppText style={s.goalOf}>of {fmtL(goalMl)}</AppText>
              </View>
            </View>

            <GoalRing fraction={todayPct} percentage={todayPctValue} />
          </View>

          <TouchableOpacity
            style={s.historyRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('WaterHistory')}
          >
            <HandTapGlyph />
            <AppText style={s.historyText}>Tap to view history</AppText>
          </TouchableOpacity>
        </View>

        {/* ── Quick add ── */}
        <View style={s.sectionHead}>
          <AppText style={s.sectionTitle}>Quick add</AppText>
          <View style={s.dateChip}>
            <CalendarGlyph />
            <AppText style={s.dateText}>{fmtDate(new Date())}</AppText>
          </View>
        </View>

        <QuickAddRow adding={adding} onAdd={quickAdd} onCustom={openLog} />

        {/* ── Today's progress ── */}
        <View style={s.progressCard}>
          <View style={s.progressHead}>
            <AppText style={s.sectionTitle}>Today's Progress</AppText>
            <AppText style={s.progressTotals}>{fmtL(todayTotalMl)} / {fmtL(goalMl)}</AppText>
          </View>

          {/* Horizontal: a goal of 4 L is 16 droplets, which won't fit a row. */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.dropletRow}
          >
            {Array.from({ length: totalDroplets }, (_, i) => (
              <View key={i} style={s.dropletCol}>
                <DropletGlyph filled={i < filledDroplets} />
                <AppText style={s.dropletNum}>{i + 1}</AppText>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ── Reminder (§5.7) ──
            Shows the next occurrence the reminder will actually fire, not the
            stored time — a weekdays reminder set for 8am reads "Mon, 8:00 AM"
            on a Saturday, and reads "Off" when reminders are disabled rather
            than displaying a time that will never arrive. */}
        <View style={s.reminderCard}>
          <View style={s.reminderLeft}>
            <AlarmGlyph />
            <View style={{ flexShrink: 1 }}>
              <AppText style={s.reminderLabel}>
                {nextReminderAt ? 'Next reminder' : 'Reminders'}
              </AppText>
              <AppText
                style={[s.reminderTime, !nextReminderAt && s.reminderOff]}
                numberOfLines={1}
              >
                {nextReminderAt ? nextReminderLabel(nextReminderAt) : 'Off'}
              </AppText>
            </View>
          </View>
          <TouchableOpacity style={s.editReminderBtn} activeOpacity={0.85} onPress={openLog}>
            <AppText style={s.editReminderText}>
              {nextReminderAt ? 'Edit reminder' : 'Set reminder'}
            </AppText>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.cta} activeOpacity={0.9} onPress={openLog}>
          <View style={s.ctaPlus}>
            <View style={s.ctaPlusH} />
            <View style={s.ctaPlusV} />
          </View>
          <AppText style={s.ctaText}>Set water intake</AppText>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Preset tiles plus Custom.
 *
 * Shared with the empty state: quick-add is the fastest way to log, and a
 * brand-new user is exactly who benefits most from one tap — sending them
 * through a form first would be the wrong way round.
 */
function QuickAddRow({
  adding, onAdd, onCustom,
}: {
  adding: number | null;
  onAdd: (ml: number) => void;
  onCustom: () => void;
}) {
  return (
    <View style={s.quickRow}>
      {QUICK_ADD.map(ml => (
        <TouchableOpacity
          key={ml}
          style={[s.quickTile, adding === ml && s.quickTileBusy]}
          activeOpacity={0.85}
          disabled={adding !== null}
          onPress={() => onAdd(ml)}
        >
          {/* Same glass on every tile — the label carries the amount. */}
          <GlassIcon width={34} height={51} />
          <AppText style={s.quickLabel}>
            {ml >= 1000 ? `${ml / 1000} L` : `${ml} ML`}
          </AppText>
        </TouchableOpacity>
      ))}

      {/* Custom is the only tile that opens the form — it's the one that needs
          a number typing in. */}
      <TouchableOpacity style={s.customTile} activeOpacity={0.85} onPress={onCustom}>
        <View style={s.customCircle}><PencilGlyph /></View>
        <AppText style={s.quickLabel}>Custom</AppText>
      </TouchableOpacity>
    </View>
  );
}

/** Shared across the loading, error, empty and populated states. */
function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={s.header}>
      <TouchableOpacity onPress={onBack} style={s.hBtn} hitSlop={8}>
        <AppText style={s.backArrow}>←</AppText>
      </TouchableOpacity>
      <AppText style={s.headerTitle}>Water tracker</AppText>
      <View style={s.hBtn} />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

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

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 24, color: '#141414' },
  headerTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 24, color: '#141414' },

  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 20 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    backgroundColor: '#FDE7EA', borderRadius: 12, padding: 12,
  },
  errorRetry: { fontFamily: 'DMSans-Bold', fontSize: 13, color: '#141414' },

  // ── Loading / error / empty (§29–§31) ──
  centre: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, paddingBottom: 60, gap: 12,
  },
  centreTitle: {
    fontFamily: 'DMSans-SemiBold', fontSize: 20, color: '#141414',
    textAlign: 'center', marginTop: 8,
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
  emptyActions: { paddingHorizontal: 20, paddingBottom: 32, gap: 20 },

  // ── Goal card ──
  goalCard: {
    backgroundColor: Colors.white, borderRadius: 20, paddingTop: 15,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  // Two children now the drop art is gone: the text block takes the space it
  // needs and the ring sits hard right, rather than three items sharing the
  // row via space-between (which left the ring floating mid-card).
  goalTop: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 4, gap: 16,
  },
  goalText: { flex: 1, minWidth: 0, gap: 10 },
  goalTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: '#000000' },
  goalValue: { fontFamily: 'DMSans-SemiBold', fontSize: 34, lineHeight: 40, color: '#141414' },
  goalOf: { fontFamily: 'DMSans-Medium', fontSize: 17, color: '#7C7C7C' },
  goalNote: { fontFamily: 'DMSans-Medium', fontSize: 12, color: '#9CA3AF' },

  ringCentre: { alignItems: 'center', justifyContent: 'center' },
  ringPctRow: { flexDirection: 'row', alignItems: 'baseline' },
  ringPct: { fontFamily: 'DMSans-SemiBold', fontSize: 32, lineHeight: 38, color: '#141414' },
  ringPctSign: { fontFamily: 'DMSans-SemiBold', fontSize: 22, color: '#141414' },
  ringPctOver: { color: '#12B76A' },
  ringLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 17, color: '#141414' },

  historyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 15, marginTop: 10,
    borderTopWidth: 1, borderTopColor: '#C5C5C5',
  },
  historyText: { fontFamily: 'DMSans-Medium', fontSize: 16, color: '#000000' },

  // ── Section heads ──
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 22, color: 'rgba(0,0,0,0.20)' },
  dateChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateText: { fontFamily: 'DMSans-Medium', fontSize: 15, color: '#999999' },

  // ── Quick add ──
  quickRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  quickTile: {
    flex: 1, minWidth: 0, padding: 10, gap: 5, alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: 20,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  quickTileBusy: { opacity: 0.5 },
  quickLabel: {
    fontFamily: 'DMSans-Medium', fontSize: 13, color: '#000000', textAlign: 'center',
  },
  customTile: { width: 62, alignItems: 'center', gap: 12, paddingBottom: 10 },
  customCircle: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },

  // ── Progress ──
  progressCard: {
    backgroundColor: Colors.white, borderRadius: 20, paddingVertical: 16, gap: 20,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  progressHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  progressTotals: { fontFamily: 'DMSans-Medium', fontSize: 15, color: '#999999' },
  dropletRow: { paddingHorizontal: 12, gap: 4 },
  dropletCol: { width: 34, alignItems: 'center', gap: 5 },
  dropletNum: { fontFamily: 'DMSans-SemiBold', fontSize: 15, color: '#141414' },

  // ── Reminder ──
  reminderCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: Colors.white, borderRadius: 30,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  reminderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  reminderLabel: { fontFamily: 'DMSans-Medium', fontSize: 14, color: '#000000' },
  reminderTime: { fontFamily: 'DMSans-SemiBold', fontSize: 18, color: '#000000' },
  reminderOff: { color: '#9CA3AF' },
  editReminderBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 40,
    backgroundColor: '#141414', flexShrink: 0,
  },
  editReminderText: { fontFamily: 'DMSans-Medium', fontSize: 14, color: Colors.white },

  // ── Below the fold ──
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginTop: 4, paddingVertical: 20, paddingHorizontal: 30,
    backgroundColor: '#141414', borderRadius: 999,
  },
  ctaPlus: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  ctaPlusH: { position: 'absolute', width: 14, height: 2.2, borderRadius: 2, backgroundColor: Colors.white },
  ctaPlusV: { position: 'absolute', width: 2.2, height: 14, borderRadius: 2, backgroundColor: Colors.white },
  ctaText: { fontFamily: 'DMSans-Bold', fontSize: 16, lineHeight: 24, color: Colors.white },
});
