/** Measurement analytics — spec §8, §10, §15, §16, §21, §26, §32. */
module.exports = ({ measurementAnalytics: A, describe, eq }) => {
  let n = 0;
  /** M(date, values) — every field optional (§32). */
  const M = (date, values = {}) =>
    ({ id: `m${++n}`, userId: 'u', date, createdAt: '', ...values });
  const REF = new Date(2026, 7, 28);   // Fri 28 Aug 2026

  describe('measurement · local calendar dates');
  eq('late evening stays on the day', A.toISO(new Date(2026, 7, 28, 23, 45)), '2026-08-28');
  eq('addDays backwards', A.addDays('2026-03-01', -1), '2026-02-28');

  describe('measurement · period windows (§10)');
  eq('week is the last 7 days', A.periodStart('week', REF), '2026-08-22');
  eq('month', A.periodStart('month', REF), '2026-07-30');
  eq('year', A.periodStart('year', REF), '2025-08-29');
  eq('all time is unbounded', A.periodStart('all', REF), null);
  eq('filters to the window',
    A.entriesIn([M('2026-08-25'), M('2026-01-01')], 'week', REF).length, 1);
  eq('all time keeps everything',
    A.entriesIn([M('2026-08-25'), M('2020-01-01')], 'all', REF).length, 2);

  describe('measurement · records (§26)');
  const three = [
    M('2026-08-01', { weightKg: 64, waistCm: 70 }),
    M('2026-08-15', { weightKg: 63, waistCm: 69 }),
    M('2026-08-28', { weightKg: 62.4, waistCm: 68 }),
  ];
  eq('sorted oldest first', A.sortEntries(three).map(e => e.date)[0], '2026-08-01');
  eq('latest is the most recent', A.latestEntry(three).date, '2026-08-28');
  eq('latest of nothing', A.latestEntry([]), null);
  eq('finds a record on a date (§8)', A.entryOn(three, '2026-08-15').weightKg, 63);
  eq('no record on that date', A.entryOn(three, '2026-08-02'), null);

  describe('measurement · partial records are normal (§32)');
  const partial = [
    M('2026-08-01', { weightKg: 64 }),
    M('2026-08-10', { waistCm: 70 }),            // no weight logged
    M('2026-08-20', { weightKg: 62 }),
  ];
  eq('a field skips records where it is absent', A.seriesFor(partial, 'weightKg').length, 2);
  // A missing value must never be read as zero — it would crash the trend line.
  eq('and is never treated as zero',
    A.seriesFor(partial, 'weightKg').every(p => p.value > 0), true);
  eq('the other field has its own series', A.seriesFor(partial, 'waistCm').length, 1);
  eq('a field never recorded has no series', A.seriesFor(partial, 'hipCm'), []);
  eq('series is oldest first', A.seriesFor(three, 'weightKg').map(p => p.date)[0], '2026-08-01');

  describe('measurement · extremes and change (§10, §15)');
  const w = A.statsFor(three, 'weightKg');
  eq('first reading', w.first.value, 64);
  eq('latest reading', w.latest.value, 62.4);
  eq('highest', w.highest.value, 64);
  eq('lowest', w.lowest.value, 62.4);
  eq('total change is latest minus first', w.totalChange, -1.6);
  eq('percentage change', w.pctChange, -2.5);
  eq('direction is a direction, not a verdict', w.direction, 'down');
  eq('label and unit carried', [w.label, w.unit], ['Weight', 'kg']);

  const single = A.statsFor([M('2026-08-01', { weightKg: 64 })], 'weightKg');
  // "No change" and "nothing to compare against" are different statements.
  eq('one reading gives null change, not zero', single.totalChange, null);
  eq('and null direction', single.direction, null);
  eq('but still has a latest', single.latest.value, 64);
  eq('and highest equals lowest', [single.highest.value, single.lowest.value], [64, 64]);

  const none = A.statsFor([], 'weightKg');
  eq('nothing recorded', [none.first, none.latest, none.highest, none.totalChange],
    [null, null, null, null]);

  eq('unchanged reads as same',
    A.statsFor([M('2026-08-01', { waistCm: 70 }), M('2026-08-10', { waistCm: 70 })], 'waistCm').direction,
    'same');
  eq('and zero change',
    A.statsFor([M('2026-08-01', { waistCm: 70 }), M('2026-08-10', { waistCm: 70 })], 'waistCm').totalChange, 0);
  eq('increase reads as up',
    A.statsFor([M('2026-08-01', { weightKg: 60 }), M('2026-08-10', { weightKg: 62 })], 'weightKg').direction, 'up');
  eq('highest ties resolve to the most recent',
    A.statsFor([M('2026-08-01', { weightKg: 64 }), M('2026-08-10', { weightKg: 64 })], 'weightKg').highest.date,
    '2026-08-10');
  eq('every field gets stats', A.allFieldStats(three).length, 10);
  eq('chest is among them (§18)', A.allFieldStats(three).some(s => s.field === 'chestCm'), true);

  describe('measurement · comparison with the previous record (§5, §12)');
  const deltas = A.deltasAgainstPrevious(three);
  eq('both recorded fields compared', deltas.length, 2);
  const wd = deltas.find(d => d.field === 'weightKg');
  eq('current', wd.current, 62.4);
  eq('previous', wd.previous, 63);
  eq('difference', wd.diff, -0.6);
  eq('direction', wd.direction, 'down');
  eq('a field with one reading is not compared',
    A.deltasAgainstPrevious([M('2026-08-01', { weightKg: 64 })]), []);
  eq('a field missing from the previous record uses its own last two',
    A.deltasAgainstPrevious(partial).find(d => d.field === 'weightKg').previous, 64);

  describe('measurement · wording is descriptive, never judgmental (§16)');
  const said = A.describeChange(w);
  eq('says lower, not "lost"', said.includes('lower'), true);
  eq('never says lost', /lost/i.test(said), false);
  eq('never says gained', /gained/i.test(said), false);
  eq('never praises', /great|well done|good job|nice|amazing|congrat/i.test(said), false);
  eq('never judges', /better|worse|bad|goal|should|improve/i.test(said), false);
  eq('states the amount', said.includes('1.6'), true);

  const up = A.describeChange(
    A.statsFor([M('2026-08-01', { weightKg: 60 }), M('2026-08-10', { weightKg: 62 })], 'weightKg'));
  eq('an increase says higher', up.includes('higher'), true);
  eq('and is not flagged as a problem', /warn|careful|too much|over/i.test(up), false);
  // The wording for up and down is symmetrical — neither direction is treated
  // as the good one.
  eq('symmetrical with the decrease wording',
    up.replace('higher', 'X').replace('2', 'N'), said.replace('lower', 'X').replace('1.6', 'N'));

  eq('unchanged', A.describeChange(
    A.statsFor([M('2026-08-01', { waistCm: 70 }), M('2026-08-10', { waistCm: 70 })], 'waistCm'))
    .includes('the same'), true);
  eq('one reading invites another', A.describeChange(single).includes('Log again'), true);
  eq('nothing recorded', A.describeChange(none).includes('No weight recorded'), true);

  const dsaid = A.describeDelta(wd);
  eq('delta wording is neutral too', dsaid.includes('lower'), true);
  eq('and never says lost', /lost|gained/i.test(dsaid), false);
  eq('unchanged delta',
    A.describeDelta({ field: 'waistCm', label: 'Waist', unit: 'cm', current: 70, previous: 70, diff: 0, direction: 'same' })
      .includes('unchanged'), true);

  describe('measurement · summary (§16)');
  eq('nothing recorded', A.summarise([]), 'No measurements recorded yet.');
  eq('one record', A.summarise([M('2026-08-01', { weightKg: 64 })]).includes('One measurement'), true);
  eq('identical records', A.summarise([
    M('2026-08-01', { waistCm: 70 }), M('2026-08-10', { waistCm: 70 }),
  ]).includes('stayed the same'), true);
  // Within a centimetre is daily fluctuation, described as consistency.
  eq('tiny movement reads as consistency', A.summarise([
    M('2026-08-01', { waistCm: 70 }), M('2026-08-10', { waistCm: 70.5 }),
  ]).includes('fairly consistent'), true);
  // Waist moved 2 cm against weight's 1.6, so the largest change is waist.
  const bigger = A.summarise(three);
  eq('a real change names the largest-moving field', bigger.toLowerCase().includes('waist'), true);
  eq('states the amount', bigger.includes('2'), true);
  eq('and stays neutral', /lost|gained|great|goal|better/i.test(bigger), false);

  describe('measurement · validation (§8, §32)');
  eq('a blank field is fine — all are optional', A.validateField('weightKg', ''), null);
  eq('non-numeric rejected', !!A.validateField('weightKg', 'heavy'), true);
  eq('zero rejected', !!A.validateField('weightKg', '0'), true);
  eq('negative rejected', !!A.validateField('waistCm', '-5'), true);
  eq('a normal weight', A.validateField('weightKg', '62.4'), null);
  // Bounds are wide on purpose — they catch a wrong unit, not a body.
  eq('a weight in pounds typed into a kg field is caught',
    !!A.validateField('weightKg', '410'), true);
  eq('a very low weight is still accepted', A.validateField('weightKg', '35'), null);
  eq('a very high weight is still accepted', A.validateField('weightKg', '250'), null);
  eq('an implausible waist is caught', !!A.validateField('waistCm', '400'), true);

  const V = (values, date = '2026-08-28') => A.validateEntry(values, date, REF);
  eq('one measurement is enough', V({ weightKg: '62.4' }), null);
  eq('an empty form is rejected', !!V({}), true);
  eq('all-blank is rejected', !!V({ weightKg: '', waistCm: '' }), true);
  eq('future date rejected', !!V({ weightKg: '62' }, '2026-08-29'), true);
  eq('today allowed', V({ weightKg: '62' }, '2026-08-28'), null);
  eq('past allowed', V({ weightKg: '62' }, '2020-01-01'), null);
  eq('malformed date rejected', !!V({ weightKg: '62' }, '28/08/2026'), true);
  eq('a bad value surfaces before the missing-value check',
    !!V({ weightKg: 'x' }), true);

  describe('measurement · units (§21)');
  eq('kg to lb', A.kgToLb(100), 220.5);
  eq('lb to kg', A.lbToKg(220.462), 100);
  eq('cm to in', A.cmToIn(165), 65);
  eq('in to cm', A.inToCm(65), 165.1);
  eq('weight in kg', A.forDisplay('weightKg', 62.4, 'kg', 'cm'), { value: 62.4, unit: 'kg' });
  eq('weight in lb', A.forDisplay('weightKg', 62.4, 'lb', 'cm'), { value: 137.6, unit: 'lb' });
  eq('length in cm', A.forDisplay('waistCm', 68, 'kg', 'cm'), { value: 68, unit: 'cm' });
  eq('length in inches', A.forDisplay('waistCm', 68, 'kg', 'in'), { value: 26.8, unit: 'in' });
  eq('the weight unit does not affect lengths',
    A.forDisplay('waistCm', 68, 'lb', 'cm').unit, 'cm');
};
