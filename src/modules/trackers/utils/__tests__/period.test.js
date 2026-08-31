/** Period analytics — spec §3.3, §3.4, §5, §11. */
module.exports = ({ periodAnalytics: A, describe, eq }) => {
  let n = 0;
  const C = (startDate, endDate, extra = {}) =>
    ({ id: `c${++n}`, userId: 'u', startDate, endDate, flow: 'medium', symptoms: [], createdAt: '', ...extra });
  const D = (date, symptoms = [], mood) =>
    ({ id: `d${++n}`, userId: 'u', date, flow: 'none', symptoms, mood, createdAt: '' });

  const REF = new Date(2026, 7, 28);   // Fri 28 Aug 2026
  // Three completed cycles 28 days apart.
  const three = [C('2026-06-01', '2026-06-05'), C('2026-06-29', '2026-07-03'), C('2026-07-27', '2026-07-31')];

  describe('period · dates');
  eq('local date at 11pm', A.toISO(new Date(2026, 7, 28, 23, 45)), '2026-08-28');
  eq('local date after midnight', A.toISO(new Date(2026, 7, 29, 0, 15)), '2026-08-29');
  eq('addDays across a month', A.addDays('2026-08-31', 1), '2026-09-01');
  eq('addDays backwards', A.addDays('2026-03-01', -1), '2026-02-28');
  eq('leap day', A.addDays('2028-02-28', 1), '2028-02-29');
  eq('daysBetween', A.daysBetween('2026-08-01', '2026-08-28'), 27);
  eq('daysBetween negative', A.daysBetween('2026-08-28', '2026-08-01'), -27);
  eq('addMonths', A.addMonths('2026-08-28', -6), '2026-02-28');

  describe('period · cycle day, day 1 is the start date (§5)');
  const one = [C('2026-08-24')];
  eq('start date is day 1', A.cycleDayOn(one, '2026-08-24'), 1);
  eq('next day is day 2', A.cycleDayOn(one, '2026-08-25'), 2);
  eq('five days later', A.cycleDayOn(one, '2026-08-28'), 5);
  eq('before any cycle is null', A.cycleDayOn(one, '2026-08-01'), null);
  eq('no cycles at all', A.cycleDayOn([], '2026-08-28'), null);
  eq('anchors on the most recent start', A.cycleDayOn([C('2026-06-01'), C('2026-08-24')], '2026-08-28'), 5);

  describe('period · measured lengths');
  eq('two measured cycles', A.measuredCycleLengths(three), [28, 28]);
  eq('one cycle measures nothing', A.measuredCycleLengths([C('2026-08-01')]), []);
  eq('implausible gaps excluded', A.measuredCycleLengths([C('2026-01-01'), C('2026-06-01')]), []);
  eq('a 10-day gap excluded', A.measuredCycleLengths([C('2026-08-01'), C('2026-08-11')]), []);
  eq('60 days is the inclusive upper bound', A.measuredCycleLengths([C('2026-06-01'), C('2026-07-31')]), [60]);
  eq('average cycle', A.averageCycleLength(three), 28);
  eq('average of none is null', A.averageCycleLength([C('2026-08-01')]), null);
  eq('period lengths from ended cycles', A.measuredPeriodLengths([C('2026-08-01', '2026-08-05')]), [5]);
  eq('ongoing period excluded', A.measuredPeriodLengths([C('2026-08-01')]), []);
  eq('average period', A.averagePeriodLength([C('2026-08-01', '2026-08-05'), C('2026-07-01', '2026-07-04')]), 5);

  describe('period · configured length wins over measured (§3.4)');
  eq('nothing logged → 28-day default', A.effectiveCycleLength([]), { length: 28, source: 'default' });
  eq('measured when available', A.effectiveCycleLength(three), { length: 28, source: 'measured' });
  eq('user configuration beats measurement',
    A.effectiveCycleLength([...three, C('2026-08-24', undefined, { cycleLength: 31 })]),
    { length: 31, source: 'configured' });
  eq('configuration on an older cycle is ignored',
    A.effectiveCycleLength([C('2026-07-27', '2026-07-31', { cycleLength: 35 }), C('2026-08-24')]).source, 'measured');
  eq('period length default', A.effectivePeriodLength([]), { length: 5, source: 'default' });
  eq('period length configured',
    A.effectivePeriodLength([C('2026-08-24', undefined, { periodLength: 7 })]), { length: 7, source: 'configured' });

  describe('period · prediction (§5)');
  const p3 = A.predict(three);
  eq('next start is last start plus cycle length', p3.nextStart, '2026-08-24');
  eq('next end spans the period length', p3.nextEnd, '2026-08-28');
  eq('grounded in measurement', p3.grounded, true);
  const p1 = A.predict([C('2026-08-24')]);
  eq('a single cycle still predicts', p1.nextStart, '2026-09-21');
  eq('but is flagged ungrounded', p1.grounded, false);
  eq('no data, no prediction', A.predict([]).nextStart, null);
  eq('configured length drives the estimate',
    A.predict([C('2026-08-24', undefined, { cycleLength: 30 })]).nextStart, '2026-09-23');

  describe('period · ovulation and fertile window');
  eq('ovulation is 14 days before the next start',
    A.ovulationDate([C('2026-08-24', undefined, { cycleLength: 28 })]), '2026-09-07');
  eq('fertile window is −5/+1 around ovulation',
    A.fertileWindow([C('2026-08-24', undefined, { cycleLength: 28 })]), { start: '2026-09-02', end: '2026-09-08' });
  eq('no history, no window', A.fertileWindow([]), null);

  describe('period · phase (§5)');
  const cyc = [C('2026-08-24', '2026-08-28', { cycleLength: 28, periodLength: 5 })];
  eq('a bleeding day is menstrual', A.phaseOn(cyc, '2026-08-26'), 'menstrual');
  eq('the last bleeding day too', A.phaseOn(cyc, '2026-08-28'), 'menstrual');
  eq('the day after is follicular', A.phaseOn(cyc, '2026-08-29'), 'follicular');
  eq('ovulation day', A.phaseOn(cyc, '2026-09-07'), 'ovulation');
  eq('either side is ovulation', A.phaseOn(cyc, '2026-09-06'), 'ovulation');
  eq('after ovulation is luteal', A.phaseOn(cyc, '2026-09-12'), 'luteal');
  eq('no history → null, never a guess', A.phaseOn([], '2026-08-28'), null);
  eq('before the first cycle → null', A.phaseOn(cyc, '2026-08-01'), null);

  describe('period · calendar day sets');
  eq('logged period days', [...A.loggedPeriodDays([C('2026-08-24', '2026-08-27')])],
    ['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27']);
  eq('single-day period', [...A.loggedPeriodDays([C('2026-08-24')])], ['2026-08-24']);
  eq('predicted days follow the configured period length',
    [...A.predictedPeriodDays([C('2026-08-24', undefined, { cycleLength: 28, periodLength: 3 })])],
    ['2026-09-21', '2026-09-22', '2026-09-23']);
  eq('no prediction → empty set', A.predictedPeriodDays([]).size, 0);

  describe('period · regularity (§5)');
  const varied = [C('2026-05-01'), C('2026-06-01'), C('2026-06-25'), C('2026-07-28')];
  eq('identical cycles score 100', A.cycleRegularity(three), 100);
  eq('one measured cycle is not enough', A.cycleRegularity([C('2026-07-27'), C('2026-08-24')]), null);
  eq('no history', A.cycleRegularity([]), null);
  eq('varied cycles score below 100', A.cycleRegularity(varied) < 100, true);
  eq('stays within 0–100', A.cycleRegularity(varied) >= 0 && A.cycleRegularity(varied) <= 100, true);
  eq('no cycles → null extremes', [A.shortestCycle([]), A.longestCycle([])], [null, null]);

  describe('period · symptom prevalence (§5)');
  // Cramps on all 10 tracked days alongside bloating: both 100%, not 50%.
  const tenDays = Array.from({ length: 10 }, (_, i) =>
    D(`2026-08-${String(i + 1).padStart(2, '0')}`, ['cramps', 'bloating']));
  const st = A.symptomStats(tenDays);
  eq('cramps every tracked day is 100%', st.find(x => x.symptom === 'cramps').pct, 100);
  eq('bloating likewise', st.find(x => x.symptom === 'bloating').pct, 100);
  eq('not share-of-mentions, which would be 50', st[0].pct !== 50, true);
  eq('denominator is tracked days', st[0].trackedDays, 10);

  const mixed = [D('2026-08-01', ['cramps']), D('2026-08-02', ['cramps']),
                 D('2026-08-03', ['headache']), D('2026-08-04', [])];
  const ms = A.symptomStats(mixed);
  eq('cramps on 2 of 4 tracked days', ms.find(x => x.symptom === 'cramps').pct, 50);
  eq('headache on 1 of 4', ms.find(x => x.symptom === 'headache').pct, 25);
  eq('a tracked day with no symptoms still counts in the denominator', ms[0].trackedDays, 4);
  eq('the same symptom twice in a day counts once', A.symptomStats([D('2026-08-01', ['cramps', 'cramps'])])[0].days, 1);
  eq('untracked days are excluded, not counted symptom-free',
    A.symptomStats([D('2026-08-01', ['cramps'])])[0].pct, 100);
  eq('no logs → no stats', A.symptomStats([]), []);
  eq('ranked by days descending', ms.map(x => x.symptom), ['cramps', 'headache']);
  eq('limit respected', A.symptomStats(mixed, 1).length, 1);

  describe('period · moods');
  const moods = [D('2026-08-01', [], 'happy'), D('2026-08-02', [], 'happy'), D('2026-08-03', [], 'sad')];
  const mo = A.moodStats(moods);
  eq('happy leads', mo[0].mood, 'happy');
  eq('happy is 67%', mo[0].pct, 67);
  eq('all five moods present', mo.length, 5);
  eq('days without a mood excluded', A.moodStats([D('2026-08-01', [])])[0].pct, 0);

  describe('period · logging streak');
  eq('three consecutive days', A.loggingStreak([D('2026-08-28'), D('2026-08-27'), D('2026-08-26')], REF), 3);
  eq('today unlogged counts back from yesterday', A.loggingStreak([D('2026-08-27'), D('2026-08-26')], REF), 2);
  eq('a gap ends it', A.loggingStreak([D('2026-08-28'), D('2026-08-26')], REF), 1);
  eq('nothing logged', A.loggingStreak([], REF), 0);
  eq('only old logs', A.loggingStreak([D('2026-01-01')], REF), 0);

  describe('period · insight ranges (§3.3)');
  eq('6 months is the default cutoff', A.rangeStart('6m', REF), '2026-02-28');
  eq('3 months', A.rangeStart('3m', REF), '2026-05-28');
  eq('12 months', A.rangeStart('12m', REF), '2025-08-28');
  eq('all time', A.rangeStart('all', REF), '0000-01-01');

  describe('period · cycle history chart');
  const hist = A.cycleHistory(three, REF);
  eq('two completed plus the running cycle', hist.length, 3);
  eq('oldest first', hist[0].label, 'Jun');
  eq('completed are not in progress', hist[0].inProgress, false);
  eq('the running cycle is flagged', hist[hist.length - 1].inProgress, true);
  eq('an ongoing period suppresses the running point',
    A.cycleHistory([C('2026-06-01', '2026-06-05'), C('2026-06-29')], REF).every(p => !p.inProgress), true);
  eq('no entries → empty chart', A.cycleHistory([], REF), []);
  eq('prediction accuracy needs two cycles', A.predictionAccuracy([C('2026-08-01')]), null);
  eq('identical cycles are 100% accurate', A.predictionAccuracy(three), 100);

  describe('period · cycle edit validation (§11)');
  const V = (o = {}) => A.validateCycleEdit(
    o.entries ?? [], o.id ?? null, o.start ?? '2026-08-24', o.end ?? null,
    o.cycle ?? 28, o.period ?? 5, REF);
  eq('valid edit', V(), null);
  eq('future start rejected', V({ start: '2026-09-01' }), "A period can't start in the future.");
  eq('end before start', V({ start: '2026-08-24', end: '2026-08-20' }), 'The end date is before the start date.');
  eq('period over 15 days', !!V({ start: '2026-08-01', end: '2026-08-20' }), true);
  eq('cycle length too short', !!V({ cycle: 10 }), true);
  eq('cycle length too long', !!V({ cycle: 90 }), true);
  eq('lower bound accepted', V({ cycle: 15 }), null);
  eq('upper bound accepted', V({ cycle: 60 }), null);
  eq('period length of zero rejected', !!V({ period: 0 }), true);
  eq('period length of 16 rejected', !!V({ period: 16 }), true);
  eq('period length must match the dates', !!V({ start: '2026-08-24', end: '2026-08-28', period: 3 }), true);
  eq('matching dates and length accepted', V({ start: '2026-08-24', end: '2026-08-28', period: 5 }), null);
  eq('clashing start date rejected',
    V({ entries: [C('2026-08-24')], start: '2026-08-24' }), 'Another cycle already starts on that date.');
  eq('editing that same cycle is fine',
    (() => { const e = C('2026-08-24'); return V({ entries: [e], id: e.id, start: '2026-08-24' }); })(), null);
};
