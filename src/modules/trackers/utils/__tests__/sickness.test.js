/** Sickness analytics — spec §5, §18, §20. */
module.exports = ({ sicknessAnalytics: A, describe, eq }) => {
  let n = 0;
  /** S(date, symptom, {feeling, time, severity, resolved}) */
  const S = (date, symptom, o = {}) => ({
    id: o.id ?? `s${++n}`, userId: 'u', date, time: o.time, feeling: o.feeling,
    symptom, severity: o.severity ?? 'mild', resolved: o.resolved, createdAt: '',
  });
  /** Med(date, name, {status, time, paused, startDate, endDate}) */
  const Med = (date, medication, o = {}) => ({
    id: o.id ?? `m${++n}`, userId: 'u', date, time: o.time ?? '09:00', medication,
    status: o.status ?? 'due', paused: o.paused,
    startDate: o.startDate, endDate: o.endDate, createdAt: '',
  });
  const REF = new Date(2026, 7, 28);   // Fri 28 Aug 2026
  const TODAY = '2026-08-28';

  describe('sickness · local calendar dates (§5.2)');
  eq('late evening stays on the day', A.toISO(new Date(2026, 7, 28, 23, 45)), '2026-08-28');
  eq('just after midnight', A.toISO(new Date(2026, 7, 29, 0, 15)), '2026-08-29');
  eq('nowHHMM pads', A.nowHHMM(new Date(2026, 7, 28, 9, 5)), '09:05');
  eq('stamp defaults the time', A.stampOf('2026-08-28'), '2026-08-28T00:00');

  describe("sickness · today's feeling (§5.2)");
  eq('nothing logged → null, never a cheerful default',
    A.feelingForToday([], REF), null);
  eq('a symptom without a feeling doesn\'t supply one',
    A.feelingForToday([S(TODAY, 'Fever')], REF), null);
  eq('yesterday\'s feeling is not today\'s',
    A.feelingForToday([S('2026-08-27', 'Fever', { feeling: 'bad' })], REF), null);
  eq('today\'s feeling is used',
    A.feelingForToday([S(TODAY, 'Fever', { feeling: 'queasy' })], REF), 'queasy');
  eq('the latest of the day wins',
    A.feelingForToday([
      S(TODAY, 'Fever', { feeling: 'bad', time: '08:00' }),
      S(TODAY, 'Headache', { feeling: 'good', time: '20:00' }),
    ], REF), 'good');

  describe('sickness · active symptoms (§5.3)');
  eq('unresolved only',
    A.activeSymptoms([S(TODAY, 'Fever'), S(TODAY, 'Cough', { resolved: true })]).length, 1);
  eq('none logged', A.activeSymptoms([]).length, 0);
  eq('all resolved', A.activeSymptoms([S(TODAY, 'Fever', { resolved: true })]).length, 0);

  describe('sickness · medication due status (§5.4)');
  eq('a due medication is due', A.isDue(Med(TODAY, 'Paracetamol'), REF), true);
  eq('taken is not due', A.isDue(Med(TODAY, 'Paracetamol', { status: 'taken' }), REF), false);
  eq('skipped is not due', A.isDue(Med(TODAY, 'Paracetamol', { status: 'skipped' }), REF), false);
  eq('missed is not due', A.isDue(Med(TODAY, 'Paracetamol', { status: 'missed' }), REF), false);
  eq('a paused course is not due', A.isDue(Med(TODAY, 'Paracetamol', { paused: true }), REF), false);
  eq('a finished course is not due',
    A.isDue(Med(TODAY, 'Paracetamol', { endDate: '2026-08-01' }), REF), false);
  eq('a course ending today is still due',
    A.isDue(Med(TODAY, 'Paracetamol', { endDate: TODAY }), REF), true);
  eq('a course starting tomorrow is not yet due',
    A.isDue(Med(TODAY, 'Paracetamol', { startDate: '2026-09-01' }), REF), false);
  eq('a course starting today is due',
    A.isDue(Med(TODAY, 'Paracetamol', { startDate: TODAY }), REF), true);
  eq('the dashboard count excludes paused and ended',
    A.dueMedications([
      Med(TODAY, 'A'),
      Med(TODAY, 'B', { paused: true }),
      Med(TODAY, 'C', { endDate: '2026-01-01' }),
      Med(TODAY, 'D', { status: 'taken' }),
    ], REF).length, 1);

  describe('sickness · upcoming dose (§6.2)');
  eq('soonest first',
    A.upcomingDose([
      Med(TODAY, 'Evening', { time: '20:00' }),
      Med(TODAY, 'Morning', { time: '08:00' }),
    ], REF).medication, 'Morning');
  eq('a paused medication is never the next dose',
    A.upcomingDose([
      Med(TODAY, 'Paused', { time: '06:00', paused: true }),
      Med(TODAY, 'Real', { time: '09:00' }),
    ], REF).medication, 'Real');
  eq('nothing due → null', A.upcomingDose([Med(TODAY, 'A', { status: 'taken' })], REF), null);
  eq('no medications', A.upcomingDose([], REF), null);

  describe('sickness · adherence');
  const adh = A.adherence([
    Med(TODAY, 'A', { status: 'taken' }), Med(TODAY, 'B', { status: 'taken' }),
    Med(TODAY, 'C', { status: 'missed' }), Med(TODAY, 'D', { status: 'due' }),
  ]);
  eq('taken counted', adh.taken, 2);
  eq('missed counted', adh.missed, 1);
  eq('an unanswered dose is excluded, not counted as a miss', adh.pct, 67);
  eq('nothing resolved → null, not 0%',
    A.adherence([Med(TODAY, 'A', { status: 'due' })]).pct, null);
  eq('no medications at all', A.adherence([]).pct, null);
  eq('perfect adherence', A.adherence([Med(TODAY, 'A', { status: 'taken' })]).pct, 100);

  describe('sickness · timeline merges both record types (§20)');
  const tl = A.timeline(
    [S('2026-08-27', 'Fever', { time: '10:00' }), S(TODAY, 'Headache', { time: '14:00' })],
    [Med(TODAY, 'Paracetamol', { time: '09:00' })],
  );
  eq('all events present', tl.length, 3);
  eq('newest first', tl[0].date, TODAY);
  eq('and by time within the day', tl.map(i => i.time), ['14:00', '09:00', '10:00']);
  eq('kinds preserved', tl[0].kind, 'symptom');
  eq('medication kind too', tl[1].kind, 'medication');
  eq('empty input', A.timeline([], []), []);
  // §20 warns against showing the same underlying event twice.
  eq('a shared id across kinds does not collide',
    A.timeline([S(TODAY, 'Fever', { id: 'x', time: '09:00' })],
               [Med(TODAY, 'Paracetamol', { id: 'x', time: '09:00' })]).length, 2);
  eq('and the tie-break is deterministic',
    A.timeline([S(TODAY, 'Fever', { id: 'x', time: '09:00' })],
               [Med(TODAY, 'Paracetamol', { id: 'x', time: '09:00' })]).map(i => i.kind),
    ['medication', 'symptom']);

  describe('sickness · symptom frequency');
  const top = A.topSymptoms([S(TODAY, 'Fever'), S(TODAY, 'Fever'), S(TODAY, 'Cough')]);
  eq('most frequent first', top[0], { symptom: 'Fever', count: 2 });
  eq('then the rest', top[1], { symptom: 'Cough', count: 1 });
  eq('ties break alphabetically',
    A.topSymptoms([S(TODAY, 'Nausea'), S(TODAY, 'Cough')]).map(t => t.symptom), ['Cough', 'Nausea']);
  eq('limit respected', A.topSymptoms([S(TODAY, 'A'), S(TODAY, 'B')], 1).length, 1);
  eq('no symptoms', A.topSymptoms([]), []);

  describe('sickness · None side effect is exclusive (§18)');
  eq('selecting a specific effect', A.toggleSideEffect([], 'Nausea'), ['Nausea']);
  eq('adding another', A.toggleSideEffect(['Nausea'], 'Headache'), ['Nausea', 'Headache']);
  eq('deselecting one', A.toggleSideEffect(['Nausea', 'Headache'], 'Nausea'), ['Headache']);
  eq('selecting None clears the specifics',
    A.toggleSideEffect(['Nausea', 'Headache'], 'None'), ['None']);
  eq('a specific effect clears None',
    A.toggleSideEffect(['None'], 'Nausea'), ['Nausea']);
  eq('None never coexists with a specific effect',
    A.toggleSideEffect(['None'], 'Nausea').includes('None'), false);
  eq('tapping None again clears it', A.toggleSideEffect(['None'], 'None'), []);
  eq('None from empty', A.toggleSideEffect([], 'None'), ['None']);

  describe('sickness · validation (§18)');
  eq('blank temperature is fine — it is optional', A.validateTemperature('', 'C'), null);
  eq('whitespace only is fine', A.validateTemperature('   ', 'C'), null);
  eq('non-numeric rejected', !!A.validateTemperature('hot', 'C'), true);
  eq('a normal celsius reading', A.validateTemperature('37.2', 'C'), null);
  eq('celsius out of range', !!A.validateTemperature('200', 'C'), true);
  eq('the same number is valid in F but not C',
    [A.validateTemperature('99', 'F'), !!A.validateTemperature('99', 'C')], [null, true]);
  eq('fahrenheit in range', A.validateTemperature('98.6', 'F'), null);
  eq('blank dosage is fine', A.validateDosage(''), null);
  eq('undefined dosage is fine', A.validateDosage(undefined), null);
  eq('zero dose rejected', !!A.validateDosage('0 mg'), true);
  eq('negative dose rejected', !!A.validateDosage('-5 mg'), true);
  eq('a real dose accepted', A.validateDosage('650 mg'), null);

  describe('sickness · dashboard rollup (§5, §32)');
  const dash = A.sicknessDashboard(
    [S(TODAY, 'Fever', { feeling: 'bad', time: '08:00' }), S(TODAY, 'Cough', { resolved: true })],
    [Med(TODAY, 'Paracetamol'), Med(TODAY, 'Paused', { paused: true })],
    REF,
  );
  eq('has data', dash.hasData, true);
  eq('feeling from today', dash.feelingToday, 'bad');
  eq('active symptoms exclude resolved', dash.active.length, 1);
  eq('due excludes paused', dash.due.length, 1);
  eq('next dose', dash.next.medication, 'Paracetamol');
  eq('recent capped at five', dash.recent.length <= 5, true);
  const empty = A.sicknessDashboard([], [], REF);
  eq('empty hasData', empty.hasData, false);
  eq('empty feeling is null, not "good"', empty.feelingToday, null);
  eq('empty active', empty.active, []);
  eq('empty due', empty.due, []);
  eq('empty next', empty.next, null);
  eq('empty adherence', empty.adherence.pct, null);
};
