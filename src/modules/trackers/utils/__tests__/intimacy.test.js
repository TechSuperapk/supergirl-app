/** Intimacy analytics — spec §3.2, §4.3, §6, §7, §8, §14. */
module.exports = ({ intimacyAnalytics: A, describe, eq }) => {
  let n = 0;
  const E = (date, who, o = {}) => ({
    id: o.id ?? `e${++n}`, userId: 'u', date, time: o.time ?? '20:00', who,
    protection: o.protection, feeling: o.feeling, moodAfter: o.moodAfter,
    createdAt: o.createdAt ?? `2026-08-01T00:00:0${n % 10}Z`,
  });
  const P = (date, o = {}) => E(date, 'partner', o);
  const S = (date, o = {}) => E(date, 'self_love', o);
  const REF = new Date(2026, 7, 28);   // Fri 28 Aug 2026

  describe('intimacy · protection counts eligible records only (§6.2)');
  const mixed = [
    P('2026-08-01', { protection: 'protected' }),
    P('2026-08-02', { protection: 'unprotected' }),
    P('2026-08-03'),                       // blank — not eligible
    S('2026-08-04'),                       // self love — never counted
  ];
  const ps = A.protectionStats(mixed);
  eq('partner count', ps.partnerCount, 3);
  eq('eligible excludes the blank', ps.eligibleCount, 2);
  eq('rate is 1 of 2, not 1 of 3', ps.ratePct, 50);
  eq('unrecorded surfaced', ps.unrecordedCount, 1);
  eq('protected count', ps.protectedCount, 1);
  eq('unprotected count', ps.unprotectedCount, 1);
  eq('a blank partner entry is not unprotected',
    A.protectionStats([P('2026-08-01', { protection: 'protected' }), P('2026-08-02')]).ratePct, 100);
  eq('self love is never classed unprotected',
    A.protectionStats([P('2026-08-01', { protection: 'protected' }), S('2026-08-02')]).ratePct, 100);
  eq('self love only → no rate at all', A.protectionStats([S('2026-08-01'), S('2026-08-02')]).ratePct, null);
  eq('nothing eligible → null, not 0%', A.protectionStats([P('2026-08-01')]).ratePct, null);
  eq('nothing at all', A.protectionStats([]).ratePct, null);
  eq('all protected', A.protectionStats([P('2026-08-01', { protection: 'protected' })]).ratePct, 100);
  eq('all unprotected', A.protectionStats([P('2026-08-01', { protection: 'unprotected' })]).ratePct, 0);

  describe('intimacy · overview (§6.1)');
  const ov = A.overviewOf(mixed);
  eq('total', ov.totalEntries, 4);
  eq('partner', ov.partnerCount, 3);
  eq('self love', ov.selfLoveCount, 1);
  eq('protected percentage mirrors eligible-only', ov.protectedPct, 50);
  eq('empty overview', A.overviewOf([]), {
    totalEntries: 0, partnerCount: 0, selfLoveCount: 0, protectedPct: null,
    protectedCount: 0, unprotectedCount: 0, eligibleCount: 0, unrecordedCount: 0,
  });

  describe('intimacy · mood denominator is records carrying a mood (§6.3)');
  const moods = [
    P('2026-08-01', { moodAfter: 'amazing' }),
    P('2026-08-02', { moodAfter: 'good' }),
    P('2026-08-03'), P('2026-08-04'),      // no mood — excluded (§14)
  ];
  const ms = A.moodStats(moods);
  eq('only moods counted', ms.total, 2);
  eq('amazing is half of moods, not a quarter of records',
    ms.rows.find(r => r.key === 'amazing').pct, 50);
  eq('good likewise', ms.rows.find(r => r.key === 'good').pct, 50);
  eq('unrecorded moods are 0%', ms.rows.find(r => r.key === 'low').pct, 0);
  eq('all four moods always present', ms.rows.length, 4);
  eq('no moods → 0%, never NaN', A.moodStats([P('2026-08-01')]).rows.every(r => r.pct === 0), true);
  eq('no moods → total 0', A.moodStats([P('2026-08-01')]).total, 0);
  eq('empty set', A.moodStats([]).total, 0);

  describe('intimacy · feeling denominator is records carrying a feeling (§6.5)');
  // 10 records, 3 carry a feeling, 2 of them "loved" → 67%, not 20%.
  const feelings = [
    ...Array.from({ length: 7 }, (_, i) => P(`2026-08-0${i + 1}`)),
    P('2026-08-08', { feeling: 'loved' }),
    P('2026-08-09', { feeling: 'loved' }),
    P('2026-08-10', { feeling: 'happy' }),
  ];
  const fs = A.feelingStats(feelings);
  eq('top feeling', fs.top, 'loved');
  eq('count', fs.topCount, 2);
  eq('denominator is feelings recorded', fs.total, 3);
  eq('67%, not 20%', fs.topPct, 67);
  eq('not divided by all records', fs.topPct !== 20, true);
  eq('ranked excludes unrecorded feelings', fs.ranked.map(r => r.feeling), ['loved', 'happy']);
  eq('no feelings → null top', A.feelingStats([P('2026-08-01')]).top, null);
  eq('no feelings → null percentage, distinct from 0%', A.feelingStats([P('2026-08-01')]).topPct, null);
  eq('empty set', A.feelingStats([]).top, null);

  const tieA = [P('2026-08-01', { feeling: 'happy' }), P('2026-08-02', { feeling: 'loved' })];
  const tieB = [P('2026-08-01', { feeling: 'loved' }), P('2026-08-02', { feeling: 'happy' })];
  eq('ties break to the declared order', A.feelingStats(tieA).top, 'loved');
  eq('tie-break is insertion-order independent', A.feelingStats(tieA).top, A.feelingStats(tieB).top);
  eq('a three-way tie is stable',
    A.feelingStats([P('2026-08-01', { feeling: 'neutral' }), P('2026-08-02', { feeling: 'relaxed' }),
                    P('2026-08-03', { feeling: 'happy' })]).top, 'happy');

  describe('intimacy · ordering by date and time (§3.2, §7)');
  const sameDay = [
    P('2026-08-28', { time: '09:00', id: 'morning' }),
    P('2026-08-28', { time: '22:30', id: 'night' }),
    P('2026-08-27', { time: '23:00', id: 'yesterday' }),
  ];
  eq('same-day entries ordered by time, newest first',
    A.sortEntries(sameDay).map(e => e.id), ['night', 'morning', 'yesterday']);
  eq('latest entry respects time, not just date', A.latestEntry(sameDay).id, 'night');
  eq('latest of nothing', A.latestEntry([]), null);
  eq('identical timestamps still order stably',
    A.sortEntries([P('2026-08-28', { time: '20:00', id: 'a', createdAt: 'x' }),
                   P('2026-08-28', { time: '20:00', id: 'b', createdAt: 'x' })]).map(e => e.id), ['b', 'a']);
  eq('entries on a date', A.entriesOn(sameDay, '2026-08-28').map(e => e.id), ['night', 'morning']);
  eq('entries on an empty date', A.entriesOn(sameDay, '2026-08-01'), []);
  eq('marked dates', [...A.markedDates(sameDay)].sort(), ['2026-08-27', '2026-08-28']);

  describe('intimacy · monthly frequency (§6.4)');
  const freq = A.monthlyFrequency([P('2026-08-01'), P('2026-08-02'), P('2026-06-15')], 6, REF);
  eq('six points', freq.length, 6);
  eq('oldest first', freq[0].key, '2026-03');
  eq('newest is the current month', freq[5].key, '2026-08');
  eq('current month counted', freq[5].value, 2);
  eq('June counted', freq.find(m => m.key === '2026-06').value, 1);
  eq('empty months included as zero', freq.find(m => m.key === '2026-07').value, 0);
  eq('labels are month names', freq[5].label, 'Aug');
  eq('no entries → all zeros', A.monthlyFrequency([], 6, REF).every(m => m.value === 0), true);
  eq('crosses the year boundary', A.monthlyFrequency([], 6, new Date(2026, 1, 15))[0].key, '2025-09');
  eq('month key is local, not UTC', A.monthKeyOf(new Date(2026, 7, 1, 0, 30)), '2026-08');

  describe('intimacy · history grouping (§7)');
  const grouped = A.groupByMonth([P('2026-08-28'), P('2026-08-01'), P('2026-07-15')]);
  eq('two month groups', grouped.length, 2);
  eq('newest month first', grouped[0].key, '2026-08');
  eq('label spelled out', grouped[0].label, 'August 2026');
  eq('entries within a month newest first', grouped[0].entries.map(e => e.date), ['2026-08-28', '2026-08-01']);
  eq('no entries → no groups', A.groupByMonth([]), []);

  describe('intimacy · ranges');
  const spread = [P('2026-08-10'), P('2026-03-10'), P('2025-08-10')];
  eq('month', A.inPeriod(spread, 'month', REF).length, 1);
  eq('year', A.inPeriod(spread, 'year', REF).length, 2);
  eq('all', A.inPeriod(spread, 'all', REF).length, 3);
  const st = A.statsFor(mixed, 'month', REF);
  eq('statsFor scopes and computes', st.overview.totalEntries, 4);
  eq('statsFor protection', st.protection.ratePct, 50);
  eq('statsFor entries sorted', st.entries[0].date, '2026-08-04');

  describe('intimacy · validation (§4.3)');
  const V = (o = {}) => A.validateEntry({
    date: o.date ?? '2026-08-28', time: o.time ?? '20:00',
    who: 'who' in o ? o.who : 'partner',
    protection: 'protection' in o ? o.protection : 'protected',
    notes: o.notes,
  }, REF);
  eq('valid partner entry', V(), null);
  eq('self love needs no protection', V({ who: 'self_love', protection: undefined }), null);
  eq('partner requires protection', V({ protection: undefined }), 'Select a protection status.');
  eq('who is required', V({ who: null }), 'Choose who it was with.');
  eq('future date rejected', V({ date: '2026-08-29' }), "You can't log an entry for a future date.");
  eq('today allowed', V({ date: '2026-08-28' }), null);
  eq('past allowed', V({ date: '2020-01-01' }), null);
  eq('malformed date', !!V({ date: '28/08/2026' }), true);
  eq('malformed time', !!V({ time: '8pm' }), true);
  eq('notes over the cap', !!V({ notes: 'x'.repeat(501) }), true);
  eq('notes at the cap', V({ notes: 'x'.repeat(500) }), null);
};
