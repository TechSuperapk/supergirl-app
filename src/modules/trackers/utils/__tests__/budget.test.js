/** Budget analytics — spec §11, §19, §21. */
module.exports = ({ budgetAnalytics: A, describe, eq }) => {
  let n = 0;
  /** T(date, amount, {category, type, transferId}) */
  const T = (date, amount, o = {}) => ({
    id: `t${++n}`, userId: 'u', date, amount, currency: 'INR',
    type: o.type ?? 'expense', category: o.category ?? 'food',
    transferId: o.transferId, createdAt: '',
  });
  /** B({categoryKey, limit, period, startDay, alertThreshold, paused}) */
  const B = (o = {}) => ({
    id: o.id ?? `b${++n}`, userId: 'u', categoryKey: o.categoryKey,
    limit: o.limit ?? 10000, period: o.period ?? 'monthly',
    startDay: o.startDay, alertThreshold: o.alertThreshold, paused: o.paused,
    createdAt: '',
  });
  const REF = new Date(2026, 7, 28);   // Fri 28 Aug 2026

  describe('budget · local calendar dates');
  eq('late evening stays on the day', A.toISO(new Date(2026, 7, 28, 23, 45)), '2026-08-28');
  eq('just after midnight', A.toISO(new Date(2026, 7, 29, 0, 15)), '2026-08-29');
  eq('addDays across a month', A.addDays('2026-08-31', 1), '2026-09-01');
  eq('daysBetween', A.daysBetween('2026-08-01', '2026-08-28'), 27);

  describe('budget · monthly window honours the start day (§14)');
  eq('default starts on the 1st',
    A.periodWindow('monthly', 1, REF), { start: '2026-08-01', end: '2026-08-31', days: 31 });
  // A budget resetting on payday must run 25th→24th, not 1st→31st.
  eq('a 25th start, after the 25th, runs into next month',
    A.periodWindow('monthly', 25, REF), { start: '2026-08-25', end: '2026-09-24', days: 31 });
  eq('a 25th start, before the 25th, is still last month\'s window',
    A.periodWindow('monthly', 25, new Date(2026, 7, 10)),
    { start: '2026-07-25', end: '2026-08-24', days: 31 });
  eq('on the anchor day itself the new window has begun',
    A.periodWindow('monthly', 25, new Date(2026, 7, 25)).start, '2026-08-25');
  eq('February is shorter', A.periodWindow('monthly', 1, new Date(2026, 1, 10)).days, 28);
  eq('leap February', A.periodWindow('monthly', 1, new Date(2028, 1, 10)).days, 29);
  eq('crossing the year boundary',
    A.periodWindow('monthly', 25, new Date(2026, 0, 10)).start, '2025-12-25');
  // 29–31 don't exist in every month, so they're clamped rather than skipping February.
  eq('a 31st start is clamped to 28', A.periodWindow('monthly', 31, REF).start, '2026-08-28');
  eq('a 0 start is clamped to 1', A.periodWindow('monthly', 0, REF).start, '2026-08-01');

  describe('budget · weekly and yearly windows');
  eq('weekly defaults to Monday',
    A.periodWindow('weekly', 0, REF), { start: '2026-08-24', end: '2026-08-30', days: 7 });
  eq('a Sunday-start week', A.periodWindow('weekly', 6, REF).start, '2026-08-23');
  eq('on the anchor weekday the window begins',
    A.periodWindow('weekly', 0, new Date(2026, 7, 24)).start, '2026-08-24');
  eq('yearly', A.periodWindow('yearly', 1, REF), { start: '2026-01-01', end: '2026-12-31', days: 365 });
  eq('leap year', A.periodWindow('yearly', 1, new Date(2028, 5, 1)).days, 366);
  eq('budgetWindow reads the budget\'s own start day',
    A.budgetWindow(B({ period: 'monthly', startDay: 25 }), REF).start, '2026-08-25');

  describe('budget · spend counts only spending (§21)');
  const w = A.periodWindow('monthly', 1, REF);
  eq('expenses count', A.spendFor([T('2026-08-05', 500)], B(), w), 500);
  eq('income never offsets a budget',
    A.spendFor([T('2026-08-05', 500), T('2026-08-06', 50000, { type: 'income' })], B(), w), 500);
  eq('transfers between own accounts are not spending',
    A.spendFor([T('2026-08-05', 500), T('2026-08-06', 9000, { transferId: 'x' })], B(), w), 500);
  eq('outside the window excluded',
    A.spendFor([T('2026-07-31', 500), T('2026-08-05', 200)], B(), w), 200);
  eq('the window start is inclusive', A.spendFor([T('2026-08-01', 100)], B(), w), 100);
  eq('the window end is inclusive', A.spendFor([T('2026-08-31', 100)], B(), w), 100);
  eq('a category budget only counts its category',
    A.spendFor([T('2026-08-05', 500, { category: 'food' }), T('2026-08-06', 900, { category: 'transport' })],
      B({ categoryKey: 'food' }), w), 500);
  eq('an overall budget counts every category',
    A.spendFor([T('2026-08-05', 500, { category: 'food' }), T('2026-08-06', 900, { category: 'transport' })],
      B(), w), 1400);
  eq('a missing type defaults to expense',
    A.spendFor([{ id: 'x', userId: 'u', date: '2026-08-05', amount: 300, currency: 'INR', category: 'food', createdAt: '' }],
      B(), w), 300);
  eq('nothing spent', A.spendFor([], B(), w), 0);

  describe('budget · progress and states (§11, §19)');
  const under = A.progressFor(B({ limit: 10000 }), [T('2026-08-05', 2000)], REF);
  eq('spent', under.spent, 2000);
  eq('remaining', under.remaining, 8000);
  eq('percentage', under.pct, 20);
  eq('state under', under.state, 'under');
  eq('default threshold is 80', under.threshold, 80);

  const warn = A.progressFor(B({ limit: 10000 }), [T('2026-08-05', 8500)], REF);
  eq('past the threshold warns', warn.state, 'warning');
  eq('but is not yet exceeded', warn.pct, 85);
  eq('exactly at the threshold warns',
    A.progressFor(B({ limit: 10000 }), [T('2026-08-05', 8000)], REF).state, 'warning');
  eq('just under the threshold does not',
    A.progressFor(B({ limit: 10000 }), [T('2026-08-05', 7999)], REF).state, 'under');
  eq('a custom threshold is respected',
    A.progressFor(B({ limit: 10000, alertThreshold: 50 }), [T('2026-08-05', 5000)], REF).state, 'warning');

  const over = A.progressFor(B({ limit: 10000 }), [T('2026-08-05', 13200)], REF);
  eq('over the limit', over.state, 'exceeded');
  // §11 wants the overspend visible, so the percentage is not capped.
  eq('the real percentage is shown, not 100', over.pct, 132);
  eq('remaining goes negative', over.remaining, -3200);
  eq('but the progress bar still caps at 1', over.fraction, 1);
  eq('exactly at the limit is not yet exceeded',
    A.progressFor(B({ limit: 10000 }), [T('2026-08-05', 10000)], REF).state, 'warning');
  eq('a paused budget never warns',
    A.progressFor(B({ limit: 10000, paused: true }), [T('2026-08-05', 99999)], REF).state, 'paused');
  eq('a zero limit never divides by zero',
    A.progressFor(B({ limit: 0 }), [T('2026-08-05', 500)], REF).pct, 0);

  describe('budget · projection is held back until it means something');
  // 28 days elapsed of 31, 2800 spent -> 100/day -> ~3100 projected.
  const proj = A.progressFor(B({ limit: 10000 }), [T('2026-08-01', 2800)], REF);
  eq('daily rate over elapsed days', Math.round(proj.dailyRate), 100);
  eq('projected to the end of the window', proj.projected, 3100);
  eq('days left', proj.daysLeft, 3);
  // One day in, a single purchase would extrapolate to nonsense.
  const dayOne = A.progressFor(B({ limit: 10000 }), [T('2026-08-01', 5000)], new Date(2026, 7, 1));
  eq('no projection on day one', dayOne.projected, null);
  eq('but the spend is still counted', dayOne.spent, 5000);

  describe('budget · scope helpers');
  const set = [B({ id: 'all' }), B({ id: 'food', categoryKey: 'food' }), B({ id: 'tx', categoryKey: 'transport' })];
  eq('the overall budget', A.overallBudget(set).id, 'all');
  eq('none set → null', A.overallBudget([B({ categoryKey: 'food' })]), null);
  eq('category budgets', A.categoryBudgets(set).map(b => b.id), ['food', 'tx']);
  eq('progress for all', A.progressForAll(set, [T('2026-08-05', 100)], REF).length, 3);

  describe('budget · alerts, most urgent first');
  const txns = [T('2026-08-05', 9500, { category: 'food' }), T('2026-08-06', 500, { category: 'transport' })];
  const budgets = [
    B({ id: 'food', categoryKey: 'food', limit: 10000 }),        // 95% → warning
    B({ id: 'tx', categoryKey: 'transport', limit: 400 }),       // 125% → exceeded
    B({ id: 'ok', categoryKey: 'shopping', limit: 5000 }),       // 0% → silent
  ];
  const al = A.alerts(budgets, txns, REF);
  eq('only budgets needing attention', al.length, 2);
  eq('worst first', al[0].budget.id, 'tx');
  eq('then the warning', al[1].budget.id, 'food');
  eq('an on-track budget is silent', al.some(p => p.budget.id === 'ok'), false);
  eq('a paused budget never alerts',
    A.alerts([B({ categoryKey: 'food', limit: 100, paused: true })], txns, REF).length, 0);
  eq('nothing to alert on', A.alerts([], txns, REF), []);

  describe('budget · messages reflect the actual state');
  const money = n => `₹${Math.round(n)}`;
  eq('paused', A.budgetMessage(A.progressFor(B({ paused: true }), [], REF), money).title, 'Paused');
  eq('exceeded', A.budgetMessage(over, money).title, 'Over budget');
  eq('warning', A.budgetMessage(warn, money).title, 'Close to the limit');
  eq('on track', A.budgetMessage(under, money).title, 'On track');
  eq('the message names the period',
    A.budgetMessage(under, money).body.includes('month'), true);
  // Only reachable early in a window: 5 days in, 2000 spent against a 10000
  // limit is 20% (well under the 80% threshold) but projects to 12400.
  const drifting = A.progressFor(B({ limit: 10000 }), [T('2026-08-01', 2000)], new Date(2026, 7, 5));
  eq('still under the alert threshold', drifting.state, 'under');
  eq('but projecting past the limit', drifting.projected > 10000, true);
  eq('so the message says so',
    A.budgetMessage(drifting, money).title, 'On track to overspend');

  describe('budget · validation (§11)');
  const V = (o = {}) => A.validateBudget({
    limit: o.limit ?? 5000,
    period: o.period ?? 'monthly',
    alertThreshold: o.alertThreshold,
    startDay: o.startDay,
    categoryKey: o.categoryKey,
    existing: o.existing,
    editingId: o.editingId,
  });
  eq('a sane budget', V(), null);
  eq('zero rejected', !!V({ limit: 0 }), true);
  eq('negative rejected', !!V({ limit: -100 }), true);
  eq('absurdly large rejected', !!V({ limit: 1e12 }), true);
  eq('threshold 0 rejected', !!V({ alertThreshold: 0 }), true);
  eq('threshold 101 rejected', !!V({ alertThreshold: 101 }), true);
  eq('threshold 100 accepted', V({ alertThreshold: 100 }), null);
  eq('monthly start day 29 rejected', !!V({ startDay: 29 }), true);
  eq('monthly start day 28 accepted', V({ startDay: 28 }), null);
  eq('weekly start day 7 rejected', !!V({ period: 'weekly', startDay: 7 }), true);
  eq('weekly start day 0 accepted', V({ period: 'weekly', startDay: 0 }), null);
  eq('a duplicate overall budget is rejected',
    !!V({ existing: [B({ id: 'all' })] }), true);
  eq('editing that same budget is fine',
    V({ existing: [B({ id: 'all' })], editingId: 'all' }), null);
  eq('a duplicate category budget is rejected',
    !!V({ categoryKey: 'food', existing: [B({ id: 'f', categoryKey: 'food' })] }), true);
  eq('a different category is fine',
    V({ categoryKey: 'transport', existing: [B({ id: 'f', categoryKey: 'food' })] }), null);
  eq('a category budget does not clash with the overall one',
    V({ categoryKey: 'food', existing: [B({ id: 'all' })] }), null);
};
