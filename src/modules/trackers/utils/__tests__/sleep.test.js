/** Sleep analytics — spec §5, §6, §8, §10, §13, §15. */
module.exports = ({ sleepAnalytics: A, describe, eq }) => {
  let n = 0;
  /** An entry on `date` built from local wall-clock bed/wake times. */
  const E = (date, bed, wake) => {
    const mins = A.durationMinutes(bed, wake);
    const [bh, bm] = bed.split(':').map(Number);
    const bedD = new Date(`${date}T00:00:00`);
    bedD.setHours(bh, bm, 0, 0);
    return {
      id: `s${++n}`, userId: 'u', date,
      bedtime: bedD.toISOString(),
      wakeTime: new Date(bedD.getTime() + mins * 60000).toISOString(),
      durationMins: mins, quality: 3, createdAt: '',
    };
  };
  const REF = new Date(2026, 7, 28);          // Fri 28 Aug 2026
  const good = d => E(d, '23:00', '07:00');   // 8h  — meets the goal
  const short = d => E(d, '01:00', '05:00');  // 4h  — misses it

  describe('sleep · duration (§10.5–§10.7)');
  eq('spec example 11:30PM→06:45AM', A.durationMinutes('23:30', '06:45'), 435);
  eq('overnight 10:30PM→06:30AM', A.durationMinutes('22:30', '06:30'), 480);
  eq('same-day nap 2PM→4PM', A.durationMinutes('14:00', '16:00'), 120);
  eq('one minute before midnight', A.durationMinutes('23:59', '00:00'), 1);
  eq('identical times read as a full day', A.durationMinutes('22:00', '22:00'), 1440);
  eq('unparseable input is 0, not NaN', A.durationMinutes('xx', '06:00'), 0);

  describe('sleep · goal band (§5.3)');
  eq('6h59 below', A.goalStatus(419), 'below');
  eq('7h00 met, inclusive', A.goalStatus(420), 'met');
  eq('9h00 met, inclusive', A.goalStatus(540), 'met');
  eq('9h01 above', A.goalStatus(541), 'above');

  describe('sleep · circular clock average (§6.1)');
  eq('23:30 and 00:30 average to midnight', A.circularAvgMinutes([1410, 30]), 0);
  eq('and not to the naive mean of noon', A.circularAvgMinutes([1410, 30]) === 720, false);
  eq('22:00 and 23:00 → 22:30', A.circularAvgMinutes([1320, 1380]), 1350);
  eq('empty set → null', A.circularAvgMinutes([]), null);
  eq('formats without NaN', A.fmtMinutesClock(A.circularAvgMinutes([1368])), '10:48 PM');
  eq('fmtClock takes HH:MM', A.fmtClock('22:48'), '10:48 PM');
  eq('and rejects an already-formatted string', A.fmtClock('10:48 PM'), '—');
  eq('midnight prints 12 AM', A.fmtMinutesClock(0), '12:00 AM');
  eq('noon prints 12 PM', A.fmtMinutesClock(720), '12:00 PM');

  describe('sleep · consistency (§5.4)');
  const tight = ['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27']
    .map((d, i) => E(d, i % 2 ? '22:45' : '22:55', '06:45'));
  const wild = [E('2026-08-24', '20:00', '04:00'), E('2026-08-25', '01:00', '09:00'),
                E('2026-08-26', '23:00', '07:00'), E('2026-08-27', '17:00', '01:00')];
  eq('tight bedtimes → excellent', A.bedtimeConsistency(tight).level, 'excellent');
  eq('scattered bedtimes → inconsistent', A.bedtimeConsistency(wild).level, 'inconsistent');
  eq('one night has no spread to measure', A.bedtimeConsistency([tight[0]]).level, 'unknown');
  eq('no entries → unknown', A.bedtimeConsistency([]).level, 'unknown');

  describe('sleep · streak counts goal-achieved nights (§6.3)');
  eq('three good nights', A.goalStreak([good('2026-08-28'), good('2026-08-27'), good('2026-08-26')], REF), 3);
  eq('a short night breaks it', A.goalStreak([good('2026-08-28'), short('2026-08-27'), good('2026-08-26')], REF), 1);
  eq('logged but short is not a streak', A.goalStreak([short('2026-08-28')], REF), 0);
  eq('today unlogged counts back from yesterday', A.goalStreak([good('2026-08-27'), good('2026-08-26')], REF), 2);
  eq('a gap ends it', A.goalStreak([good('2026-08-28'), good('2026-08-25')], REF), 1);
  eq('no entries', A.goalStreak([], REF), 0);

  describe('sleep · best night (§6.4)');
  eq('ties resolve to the most recent',
    A.bestSleep([E('2026-08-24', '22:00', '06:00'), E('2026-08-26', '22:00', '06:00')]).date, '2026-08-26');
  eq('lowest picks the shortest', A.lowestSleep([good('2026-08-24'), short('2026-08-25')]).date, '2026-08-25');
  eq('best of nothing is null', A.bestSleep([]), null);

  describe('sleep · Monday-anchored weeks');
  eq('week of Fri 28 Aug', A.weekRange(REF, 0), { start: '2026-08-24', end: '2026-08-30' });
  eq('previous week', A.weekRange(REF, 1), { start: '2026-08-17', end: '2026-08-23' });
  eq('Sunday belongs to the week just ending',
    A.weekRange(new Date(2026, 7, 30), 0), { start: '2026-08-24', end: '2026-08-30' });
  eq('Monday starts its own week',
    A.weekRange(new Date(2026, 7, 24), 0), { start: '2026-08-24', end: '2026-08-30' });

  describe('sleep · week comparison is calendar-based (§6.5)');
  const thisWk = [good('2026-08-24'), good('2026-08-25')];
  const lastWk = [E('2026-08-18', '23:00', '06:00'), E('2026-08-19', '23:00', '06:00')];
  eq('up 60 minutes', A.weekComparison([...thisWk, ...lastWk], REF), { differenceMinutes: 60, direction: 'up' });
  eq('no previous week → null, not "no change"', A.weekComparison(thisWk, REF), null);
  eq('no current week → null', A.weekComparison(lastWk, REF), null);
  eq('equal weeks → same', A.weekComparison([good('2026-08-25'), good('2026-08-18')], REF),
    { differenceMinutes: 0, direction: 'same' });

  describe('sleep · week chart (§5.5)');
  const chart = A.weekChart([good('2026-08-26')], REF);
  eq('seven points', chart.length, 7);
  eq('starts Monday', chart[0].label, 'Mon');
  eq('ends Sunday', chart[6].label, 'Sun');
  eq('logged night carries data', chart[2], { label: 'Wed', value: 8, date: '2026-08-26', hasData: true });
  eq('missing night flagged, not zero-valued', chart[0].hasData, false);

  describe('sleep · month summary (§13.2)');
  const aug = A.monthSummary([good('2026-08-26'), short('2026-08-27')], REF);
  eq('August has 31 days', aug.daysInMonth, 31);
  eq('one of two nights hit goal', aug.goalAchieved, 1);
  eq('average of 480 and 240', aug.averageMinutes, 360);
  eq('Feb 2026 has 28', A.monthSummary([], new Date(2026, 1, 15)).daysInMonth, 28);
  eq('Feb 2028 has 29', A.monthSummary([], new Date(2028, 1, 15)).daysInMonth, 29);
  eq('April has 30', A.monthSummary([], new Date(2026, 3, 15)).daysInMonth, 30);
  eq('empty month averages 0, not NaN', A.monthSummary([], REF).averageMinutes, 0);

  describe('sleep · year rolls up by month (§13.3)');
  const yr = A.yearByMonth([good('2026-01-05'), short('2026-01-06'), good('2026-03-05')], REF);
  eq('twelve buckets', yr.length, 12);
  eq('January averages both nights', yr[0], { month: 0, label: 'January', averageMinutes: 360, nights: 2 });
  eq('February empty', yr[1], { month: 1, label: 'February', averageMinutes: 0, nights: 0 });
  eq('March', yr[2].averageMinutes, 480);
  eq('other years excluded', A.yearByMonth([good('2025-01-05')], REF)[0].nights, 0);

  describe('sleep · recommendation (§8)');
  eq('empty → keep logging', A.recommendation([], 0).startsWith('Keep logging'), true);
  eq('below goal', A.recommendation([short('2026-08-26')], 240).includes('under your goal'), true);
  eq('above goal', A.recommendation([E('2026-08-26', '21:00', '08:00')], 660).includes('above your current target'), true);
  eq('inconsistency outranks the healthy message', A.recommendation(wild, 480).startsWith('Your bedtime varies'), true);
  eq('healthy and consistent', A.recommendation(tight, 480).includes('healthy sleep schedule'), true);

  describe('sleep · no fabricated statistics when empty (§15)');
  const empty = A.sleepDashboard([], REF);
  eq('hasData false', empty.hasData, false);
  eq('average 0', empty.averageSleepMinutes, 0);
  eq('streak 0', empty.currentStreak, 0);
  eq('no best night', empty.best, null);
  eq('no comparison', empty.comparison, null);
  eq('bedtime null, renders as a dash', empty.averageBedtimeMinutes, null);
  eq('no recent history', empty.recentHistory.length, 0);

  describe('sleep · dashboard rollup');
  const dash = A.sleepDashboard(
    [good('2026-08-26'), good('2026-08-25'), good('2026-08-24'), E('2026-08-18', '23:00', '06:00')], REF);
  eq('week average excludes last week', dash.averageSleepMinutes, 480);
  eq('recent history capped at 3', dash.recentHistory.length, 3);
  eq('newest first', dash.recentHistory[0].date, '2026-08-26');
  eq('average bedtime', A.fmtMinutesClock(dash.averageBedtimeMinutes), '11:00 PM');
  eq('average wake', A.fmtMinutesClock(dash.averageWakeMinutes), '7:00 AM');

  describe('sleep · local calendar dates');
  eq('late evening stays on the day', A.toISO(new Date(2026, 7, 28, 23, 30)), '2026-08-28');
  eq('early morning too', A.toISO(new Date(2026, 7, 28, 0, 30)), '2026-08-28');
};
