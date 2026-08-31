/** Mood analytics — spec §9, §12–§18, §20–§22. */
module.exports = ({ moodAnalytics: A, describe, eq }) => {
  let n = 0;
  /** M(date, mood, intensity, {influencers, time, notes}) */
  const M = (date, mood, intensity = 7, o = {}) => ({
    id: o.id ?? `m${++n}`, userId: 'u', date, time: o.time ?? '20:00',
    mood, intensity, influencers: o.influencers ?? [], activities: [],
    notes: o.notes, createdAt: '',
  });
  const REF = new Date(2026, 7, 28);   // Fri 28 Aug 2026

  describe('mood · local calendar dates');
  eq('late evening stays on the day', A.toISO(new Date(2026, 7, 28, 23, 45)), '2026-08-28');
  eq('just after midnight', A.toISO(new Date(2026, 7, 29, 0, 15)), '2026-08-29');
  eq('addDays across a month', A.addDays('2026-08-31', 1), '2026-09-01');
  eq('addDays backwards', A.addDays('2026-03-01', -1), '2026-02-28');
  eq('daysBetween', A.daysBetween('2026-08-01', '2026-08-28'), 27);

  describe('mood · period windows (§20)');
  eq('7 days', A.periodDays('7d'), 7);
  eq('30 days', A.periodDays('30d'), 30);
  eq('90 days', A.periodDays('3m'), 90);
  eq('a year', A.periodDays('1y'), 365);
  eq('all time has no length', A.periodDays('all'), null);
  eq('30d window ends today and spans 30 days',
    A.periodWindow('30d', 0, REF), { start: '2026-07-30', end: '2026-08-28' });
  eq('the previous 30d window sits immediately before it',
    A.periodWindow('30d', 1, REF), { start: '2026-06-30', end: '2026-07-29' });
  eq('7d window', A.periodWindow('7d', 0, REF), { start: '2026-08-22', end: '2026-08-28' });
  eq('all time is unbounded', A.periodWindow('all', 0, REF), null);
  eq('everything is in the all-time window', A.inWindow('1999-01-01', null), true);

  describe('mood · scoring blends mood with intensity (§9)');
  // Kept deliberately: intensity is the strength of the mood, so a fierce
  // "angry" must score low, not high.
  eq('angry at high intensity scores low', A.dailyScores([M('2026-08-28', 'angry', 9)])[0].score < 3, true);
  eq('happy at high intensity scores high', A.dailyScores([M('2026-08-28', 'happy', 9)])[0].score > 8, true);
  eq('angry never outscores happy at the same intensity',
    A.dailyScores([M('2026-08-28', 'angry', 9)])[0].score
    < A.dailyScores([M('2026-08-28', 'happy', 9)])[0].score, true);
  eq('score stays within 1–10',
    A.dailyScores([M('2026-08-28', 'overwhelmed', 10)])[0].score >= 1, true);

  describe('mood · one score per day (§21, §22)');
  const twoInADay = [M('2026-08-28', 'happy', 8), M('2026-08-28', 'sad', 2)];
  eq('two logs collapse to one day', A.dailyScores(twoInADay).length, 1);
  eq('the day averages them',
    A.dailyScores(twoInADay)[0].score,
    Math.round(((A.dailyScores([twoInADay[0]])[0].score + A.dailyScores([twoInADay[1]])[0].score) / 2) * 10) / 10);
  eq('both logs kept on the day', A.dailyScores(twoInADay)[0].logs.length, 2);
  eq('days come out oldest first',
    A.dailyScores([M('2026-08-28', 'happy'), M('2026-08-26', 'calm')]).map(d => d.date),
    ['2026-08-26', '2026-08-28']);
  eq('average is over days, not logs',
    A.averageScore([...twoInADay, M('2026-08-27', 'neutral', 5)]),
    Math.round(((A.dailyScores(twoInADay)[0].score + A.dailyScores([M('2026-08-27', 'neutral', 5)])[0].score) / 2) * 10) / 10);
  eq('nothing logged → null, not 0', A.averageScore([]), null);

  describe('mood · best day (§13)');
  const week = [M('2026-08-24', 'neutral', 5), M('2026-08-26', 'amazing', 9), M('2026-08-27', 'sad', 4)];
  eq('picks the highest day', A.bestDay(week).date, '2026-08-26');
  eq('ties resolve to the most recent',
    A.bestDay([M('2026-08-24', 'happy', 8), M('2026-08-26', 'happy', 8)]).date, '2026-08-26');
  eq('no logs → null', A.bestDay([]), null);
  eq('weekday name', A.weekdayName('2026-08-29'), 'Saturday');

  describe('mood · comparison uses the previous window (§12, §26)');
  const current = [M('2026-08-20', 'happy', 8), M('2026-08-21', 'happy', 8)];       // in 30d
  const prior   = [M('2026-07-10', 'neutral', 5), M('2026-07-11', 'neutral', 5)];   // in previous 30d
  const cmp = A.periodComparison([...current, ...prior], '30d', REF);
  eq('current average from this window', cmp.current, A.averageScore(current));
  eq('previous average from the window before it', cmp.previous, A.averageScore(prior));
  eq('change is the difference',
    cmp.change, Math.round((A.averageScore(current) - A.averageScore(prior)) * 10) / 10);
  eq('improvement is positive', cmp.change > 0, true);
  eq('no previous data → null change, not 0',
    A.periodComparison(current, '30d', REF).change, null);
  eq('no current data → null change',
    A.periodComparison(prior, '30d', REF).change, null);
  eq('all-time has no previous window', A.periodComparison(current, 'all', REF).previous, null);
  eq('and so no change', A.periodComparison(current, 'all', REF).change, null);
  // The old implementation compared halves of the same window, which is a
  // different question and can't be labelled "vs last 30 days".
  eq('not measured within the window',
    A.periodComparison([M('2026-08-01', 'sad', 3), M('2026-08-27', 'amazing', 9)], '30d', REF).change, null);

  describe('mood · distribution (§17)');
  const dist = A.distribution([
    M('2026-08-01', 'happy'), M('2026-08-02', 'happy'),
    M('2026-08-03', 'calm'), M('2026-08-04', 'sad'),
  ]);
  eq('ranked by count', dist.map(d => d.mood), ['happy', 'calm', 'sad']);
  eq('happy is half', dist[0].pct, 50);
  eq('calm is a quarter', dist[1].pct, 25);
  eq('percentages total about 100', dist.reduce((s, d) => s + d.pct, 0), 100);
  eq('unlogged moods are omitted', dist.length, 3);
  eq('counted per record', dist[0].count, 2);
  eq('empty set', A.distribution([]), []);
  eq('most common mood', A.mostCommonMood([M('2026-08-01', 'anxious')]), 'anxious');
  eq('no logs → no common mood', A.mostCommonMood([]), null);
  eq('equal counts break deterministically',
    A.distribution([M('2026-08-01', 'sad'), M('2026-08-02', 'happy')]).map(d => d.mood),
    ['happy', 'sad']);

  describe('mood · triggers ranked by frequency (§18)');
  const trig = A.triggers([
    M('2026-08-01', 'happy', 8, { influencers: ['Work', 'Friends'] }),
    M('2026-08-02', 'sad', 6, { influencers: ['Work'] }),
    M('2026-08-03', 'calm', 7, { influencers: ['Sleep'] }),
  ]);
  eq('most frequent first', trig[0].key, 'Work');
  eq('counted across records', trig[0].count, 2);
  eq('one record contributes to several', trig.length, 3);
  eq('average score carried along', typeof trig[0].avgScore, 'number');
  eq('a duplicate within one record counts once',
    A.triggers([M('2026-08-01', 'happy', 8, { influencers: ['Work', 'Work'] })])[0].count, 1);
  eq('no influences → no triggers', A.triggers([M('2026-08-01', 'happy')]), []);
  eq('empty set', A.triggers([]), []);

  describe('mood · streak counts days, not logs (§22)');
  eq('three consecutive days',
    A.streak([M('2026-08-28', 'happy'), M('2026-08-27', 'calm'), M('2026-08-26', 'sad')], REF), 3);
  eq('three logs in one day is a one-day streak',
    A.streak([M('2026-08-28', 'happy', 7, { id: 'a' }), M('2026-08-28', 'sad', 4, { id: 'b' }),
              M('2026-08-28', 'calm', 6, { id: 'c' })], REF), 1);
  eq('today unlogged counts back from yesterday',
    A.streak([M('2026-08-27', 'happy'), M('2026-08-26', 'happy')], REF), 2);
  eq('a gap ends it', A.streak([M('2026-08-28', 'happy'), M('2026-08-26', 'happy')], REF), 1);
  eq('a negative mood still counts as logged',
    A.streak([M('2026-08-28', 'angry'), M('2026-08-27', 'overwhelmed')], REF), 2);
  eq('nothing logged', A.streak([], REF), 0);

  describe('mood · trend (§14)');
  const tr = A.trend(week);
  eq('one point per logged day', tr.length, 3);
  eq('oldest first', tr[0].date, '2026-08-24');
  eq('missing days are absent, not zero', tr.some(p => p.date === '2026-08-25'), false);
  eq('never plots a zero', tr.every(p => p.value > 0), true);
  eq('carries the mood', tr[1].mood, 'amazing');
  eq('empty set', A.trend([]), []);

  describe('mood · heatmap (§15)');
  const hm = A.heatmap([M('2026-08-26', 'happy')], 6, REF);
  eq('six week columns', hm.length, 6);
  eq('seven days each', hm[0].days.length, 7);
  eq('columns run oldest to newest', hm[0].weekStart < hm[5].weekStart, true);
  eq('weeks start on Sunday', new Date(hm[0].weekStart + 'T00:00:00').getDay(), 0);
  eq('the last column contains today',
    hm[5].days.some(d => d.date === '2026-08-28'), true);
  eq('a logged day carries its log',
    hm.flatMap(c => c.days).find(d => d.date === '2026-08-26').log !== null, true);
  eq('an unlogged day is null',
    hm.flatMap(c => c.days).find(d => d.date === '2026-08-25').log, null);

  describe('mood · calendar map (§10)');
  const cal = A.calendarMap([
    M('2026-08-28', 'sad', 4, { time: '08:00' }),
    M('2026-08-28', 'happy', 8, { time: '21:00' }),
  ]);
  eq('one entry per date', cal.size, 1);
  eq('the day shows its latest mood', cal.get('2026-08-28').mood, 'happy');

  describe('mood · validation (§7)');
  const V = (o = {}) => A.validateLog({
    mood: 'mood' in o ? o.mood : 'happy',
    intensity: o.intensity ?? 7,
    date: o.date ?? '2026-08-28',
    notes: o.notes,
  }, REF);
  eq('valid log', V(), null);
  eq('mood is required', !!V({ mood: null }), true);
  eq('intensity 0 rejected', !!V({ intensity: 0 }), true);
  eq('intensity 11 rejected', !!V({ intensity: 11 }), true);
  eq('intensity 1 accepted', V({ intensity: 1 }), null);
  eq('intensity 10 accepted', V({ intensity: 10 }), null);
  eq('future date rejected', !!V({ date: '2026-08-29' }), true);
  eq('today accepted', V({ date: '2026-08-28' }), null);
  eq('malformed date rejected', !!V({ date: '28/08/2026' }), true);
  eq('notes over the cap', !!V({ notes: 'x'.repeat(501) }), true);
  eq('notes at the cap', V({ notes: 'x'.repeat(500) }), null);

  describe('mood · rollup keeps screens in step (§30)');
  const stats = A.statsFor([...current, ...prior], '30d', REF);
  eq('scoped to the window', stats.logs.length, 2);
  eq('average matches', stats.averageScore, A.averageScore(current));
  eq('comparison reaches back a window', stats.comparison.previous, A.averageScore(prior));
  eq('best day inside the window', stats.best.date, '2026-08-21');
  eq('streak spans all history, not just the window', stats.streak, A.streak([...current, ...prior], REF));
  const empty = A.statsFor([], '30d', REF);
  eq('empty average', empty.averageScore, null);
  eq('empty best day', empty.best, null);
  eq('empty distribution', empty.distribution, []);
  eq('empty streak', empty.streak, 0);
};
