/** Water analytics — spec §5, §9, §11, §15, §16, §19, §28. */
module.exports = ({ waterAnalytics: A, describe, eq }) => {
  let n = 0;
  const L = (date, ml, time = '09:00') =>
    ({ id: `w${++n}`, userId: 'u', date, time, amountMl: ml, createdAt: '' });
  const REF = new Date(2026, 7, 28);   // Fri 28 Aug 2026
  const GOAL = 2500;
  const met = d => L(d, 2500);

  describe('water · percentage is uncapped (§16)');
  eq('spec example 2000/2500', A.goalPercentage(2000, 2500), 80);
  eq('over goal reports the real figure', A.goalPercentage(2700, 2500), 108);
  eq('2675/2500 → 107', A.goalPercentage(2675, 2500), 107);
  eq('double goal → 200', A.goalPercentage(5000, 2500), 200);
  eq('zero goal never divides by zero', A.goalPercentage(1000, 0), 0);
  eq('nothing drunk', A.goalPercentage(0, 2500), 0);
  eq('but the arc still caps at 1', A.goalFraction(5000, 2500), 1);
  eq('arc partial', A.goalFraction(1250, 2500), 0.5);
  eq('arc floors at 0', A.goalFraction(-100, 2500), 0);

  describe('water · four goal states (§16)');
  eq('0% empty', A.goalState(0, 2500), 'empty');
  eq('1–99% partial', A.goalState(1200, 2500), 'partial');
  eq('exactly 100 achieved', A.goalState(2500, 2500), 'achieved');
  eq('over goal exceeded', A.goalState(2600, 2500), 'exceeded');
  eq('remaining never negative', A.remainingMl(3000, 2500), 0);
  eq('remaining', A.remainingMl(2000, 2500), 500);

  describe('water · units (§15, §19)');
  eq('below a litre stays ml', A.fmtAmount(300), '300 ml');
  eq('a litre becomes L', A.fmtAmount(1000), '1.0 L');
  eq('2500 → 2.5 L', A.fmtAmount(2500), '2.5 L');
  eq('999 ml stays ml', A.fmtAmount(999), '999 ml');
  eq('fmtL always litres', A.fmtL(300), '0.3 L');

  describe('water · daily totals');
  const day = [L('2026-08-28', 250), L('2026-08-28', 500), L('2026-08-27', 750)];
  eq('sums a day', A.totalFor(day, '2026-08-28'), 750);
  eq('unlogged day is 0', A.totalFor(day, '2026-08-01'), 0);
  eq('groups by date', A.totalsByDate(day), { '2026-08-28': 750, '2026-08-27': 750 });
  eq('logsFor is newest first',
    A.logsFor([L('2026-08-28', 100, '07:00'), L('2026-08-28', 200, '19:00')], '2026-08-28').map(l => l.time),
    ['19:00', '07:00']);

  describe('water · calendar windows (§9.1)');
  const w = A.periodWindow('week', 0, REF);
  eq('week is Monday-anchored', { start: w.start, end: w.end, days: w.days },
    { start: '2026-08-24', end: '2026-08-30', days: 7 });
  eq('previous week steps back 7', A.periodWindow('week', -1, REF).start, '2026-08-17');
  const m = A.periodWindow('month', 0, REF);
  eq('August is 31 days', { start: m.start, end: m.end, days: m.days },
    { start: '2026-08-01', end: '2026-08-31', days: 31 });
  eq('Feb 2026 is 28', A.periodWindow('month', 0, new Date(2026, 1, 10)).days, 28);
  eq('Feb 2028 is 29', A.periodWindow('month', 0, new Date(2028, 1, 10)).days, 29);
  eq('offset crosses the year boundary', A.periodWindow('month', -8, REF).start, '2025-12-01');
  eq('year window', A.periodWindow('year', 0, REF).start, '2026-01-01');
  eq('year is 365 days', A.periodWindow('year', 0, REF).days, 365);
  eq('leap year is 366', A.periodWindow('year', 0, new Date(2028, 5, 1)).days, 366);
  eq('all time is unbounded', A.periodWindow('all', 0, REF).start, '0000-01-01');

  describe('water · period statistics (§9.2)');
  const month = [L('2026-08-24', 2000), L('2026-08-25', 2800), L('2026-08-26', 2200), L('2026-08-27', 2500)];
  const ms = A.periodStats(month, 'month', GOAL, 0, REF);
  eq('total', ms.totalMl, 9500);
  eq('average divides by days logged, not days in the month', ms.averageMl, 2375);
  eq('day count is the whole month', ms.periodDays, 31);
  eq('logged days counted separately', ms.loggedDays, 4);
  eq('best day', ms.bestDate, '2026-08-25');
  eq('best day amount', ms.bestDayMl, 2800);
  eq('days meeting goal', ms.daysMet, 2);
  eq('average as % of goal', ms.goalPercentage, 95);
  eq('daily series oldest first', ms.daily[0].date, '2026-08-24');
  eq('met flags', ms.daily.map(d => d.met), [false, true, false, true]);
  const emptyStats = A.periodStats([], 'month', GOAL, 0, REF);
  eq('empty average is 0, not NaN', emptyStats.averageMl, 0);
  eq('empty best is null', emptyStats.bestDate, null);
  eq('empty month still reports 31 days', emptyStats.periodDays, 31);
  eq('best day ties resolve to most recent',
    A.periodStats([L('2026-08-24', 2000), L('2026-08-26', 2000)], 'month', GOAL, 0, REF).bestDate, '2026-08-26');
  eq('other months excluded',
    A.periodStats([...month, L('2026-07-15', 9000)], 'month', GOAL, 0, REF).totalMl, 9500);
  eq('all-time spans first to last log',
    A.periodStats([L('2026-08-01', 100), L('2026-08-31', 100)], 'all', GOAL, 0, REF).periodDays, 31);

  describe('water · year rolls up by month (§11)');
  const yr = A.yearByMonth([L('2026-01-05', 2000), L('2026-01-06', 3000), L('2026-03-05', 1500)], 0, REF);
  eq('twelve buckets', yr.length, 12);
  eq('January totals both days', yr[0], { month: 0, label: 'Jan', totalMl: 5000, averageMl: 2500, loggedDays: 2 });
  eq('February empty', yr[1].loggedDays, 0);
  eq('March', yr[2].totalMl, 1500);
  eq('best month by total', A.bestMonth(yr).label, 'Jan');
  eq('no data → no best month', A.bestMonth(A.yearByMonth([], 0, REF)), null);
  eq('other years excluded', A.yearByMonth([L('2025-01-05', 2000)], 0, REF)[0].loggedDays, 0);

  describe('water · streak');
  eq('three met days', A.goalStreak([met('2026-08-28'), met('2026-08-27'), met('2026-08-26')], GOAL, REF), 3);
  eq('a short day breaks it', A.goalStreak([met('2026-08-28'), L('2026-08-27', 500), met('2026-08-26')], GOAL, REF), 1);
  eq('today not yet met counts back from yesterday',
    A.goalStreak([L('2026-08-28', 500), met('2026-08-27'), met('2026-08-26')], GOAL, REF), 2);
  eq('several logs add up to the goal', A.goalStreak([L('2026-08-28', 1500), L('2026-08-28', 1000)], GOAL, REF), 1);
  eq('no goal, no streak', A.goalStreak([met('2026-08-28')], 0, REF), 0);
  eq('nothing logged', A.goalStreak([], GOAL, REF), 0);

  describe('water · consistency message reflects performance (§9.5)');
  const msg = logs => A.consistencyMessage(A.periodStats(logs, 'month', GOAL, 0, REF)).title;
  eq('empty period', msg([]), 'Nothing logged yet');
  eq('all days met', msg([met('2026-08-24'), met('2026-08-25')]), 'Consistency is the key!');
  eq('half met', msg([met('2026-08-24'), L('2026-08-25', 500)]), "You're over halfway there");
  eq('one of four', msg([met('2026-08-24'), L('2026-08-25', 100), L('2026-08-26', 100), L('2026-08-27', 100)]),
    'Every glass counts');
  eq('none met', msg([L('2026-08-24', 100), L('2026-08-25', 100)]), 'Small steps first');

  describe('water · next reminder (§5.7)');
  const NOON = new Date(2026, 7, 28, 12, 0);          // Friday noon
  const R = o => A.nextReminder(o, NOON);
  eq('off when disabled', R({ reminderEnabled: false, reminderTime: '18:00' }), null);
  eq('off when frequency is none', R({ reminderEnabled: true, reminderFrequency: 'none', reminderTime: '18:00' }), null);
  eq('null settings', A.nextReminder(null, NOON), null);
  eq('bad time string', R({ reminderEnabled: true, reminderTime: 'nonsense' }), null);
  eq('later today', A.toISO(R({ reminderEnabled: true, reminderFrequency: 'daily', reminderTime: '18:00' })), '2026-08-28');
  eq('already passed → tomorrow',
    A.toISO(R({ reminderEnabled: true, reminderFrequency: 'daily', reminderTime: '08:00' })), '2026-08-29');
  eq('weekdays on Friday evening skips the weekend',
    A.toISO(R({ reminderEnabled: true, reminderFrequency: 'weekdays', reminderTime: '08:00' })), '2026-08-31');
  eq('weekends from Friday → Saturday',
    A.toISO(R({ reminderEnabled: true, reminderFrequency: 'weekends', reminderTime: '08:00' })), '2026-08-29');
  eq('label for today',
    A.nextReminderLabel(R({ reminderEnabled: true, reminderFrequency: 'daily', reminderTime: '18:00' }), NOON), '6:00 PM');
  eq('label for tomorrow',
    A.nextReminderLabel(R({ reminderEnabled: true, reminderFrequency: 'daily', reminderTime: '08:00' }), NOON),
    'Tomorrow, 8:00 AM');
  eq('label when off', A.nextReminderLabel(null, NOON), 'Off');
  eq('clock at midnight', A.fmtClock('00:15'), '12:15 AM');
  eq('clock at noon', A.fmtClock('12:00'), '12:00 PM');

  describe('water · validation (§28)');
  eq('zero rejected', A.validateEntry(0, '2026-08-28', REF), 'Enter an amount greater than 0.');
  eq('negative rejected', !!A.validateEntry(-50, '2026-08-28', REF), true);
  eq('over maximum rejected', !!A.validateEntry(6000, '2026-08-28', REF), true);
  eq('future date rejected', A.validateEntry(250, '2026-08-29', REF), "You can't log water for a future date.");
  eq('today allowed', A.validateEntry(250, '2026-08-28', REF), null);
  eq('past allowed', A.validateEntry(250, '2020-01-01', REF), null);
  eq('malformed date rejected', !!A.validateEntry(250, 'nope', REF), true);
  eq('goal of zero rejected', !!A.validateGoal(0), true);
  eq('goal over maximum rejected', !!A.validateGoal(20000), true);
  eq('sane goal accepted', A.validateGoal(2500), null);

  describe('water · dashboard (§21)');
  const dash = A.waterDashboard([L('2026-08-28', 2000), L('2026-08-27', 2500)], GOAL,
    { reminderEnabled: true, reminderFrequency: 'daily', reminderTime: '18:00' }, NOON);
  eq('consumed today only', dash.consumedMl, 2000);
  eq('percentage', dash.percentage, 80);
  eq('remaining', dash.remainingMl, 500);
  eq('state', dash.state, 'partial');
  eq('streak from yesterday', dash.streak, 1);
  eq('next reminder set', dash.next !== null, true);
  const over = A.waterDashboard([L('2026-08-28', 2700)], GOAL, null, NOON);
  eq('over goal keeps the real percentage', over.percentage, 108);
  eq('but the arc is capped', over.fraction, 1);
  eq('state exceeded', over.state, 'exceeded');
  const none = A.waterDashboard([], GOAL, null, NOON);
  eq('empty hasData', none.hasData, false);
  eq('empty consumed', none.consumedMl, 0);
  eq('empty percentage', none.percentage, 0);
  eq('empty remaining is the whole goal', none.remainingMl, 2500);
  eq('empty reminder', none.next, null);

  describe('water · local calendar dates');
  eq('late evening stays on the day', A.toISO(new Date(2026, 7, 28, 23, 45)), '2026-08-28');
  eq('just after midnight', A.toISO(new Date(2026, 7, 29, 0, 15)), '2026-08-29');
  eq('daysBetween is inclusive', A.daysBetween('2026-08-01', '2026-08-31'), 31);
  eq('same day is 1', A.daysBetween('2026-08-01', '2026-08-01'), 1);
  eq('nowHHMM pads', A.nowHHMM(new Date(2026, 7, 28, 9, 5)), '09:05');
};
