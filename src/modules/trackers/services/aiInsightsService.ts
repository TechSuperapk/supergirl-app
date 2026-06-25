/**
 * aiInsightsService.ts
 *
 * Generates weekly wellness insights using OpenAI GPT-4o.
 * Falls back to rule-based insights if no API key.
 */
import { MoodEntry, SleepEntry, HabitLog, Habit, ExpenseEntry } from '../types';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';

interface InsightData {
  mood:     MoodEntry[];
  sleep:    SleepEntry[];
  habits:   Habit[];
  logs:     HabitLog[];
  expenses: ExpenseEntry[];
}

async function callOpenAI(prompt: string): Promise<string> {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model:       'gpt-4o',
      max_tokens:  600,
      temperature: 0.5,
      messages: [
        { role: 'system', content: 'You are a wellness coach. Give warm, practical, data-driven insights.' },
        { role: 'user',   content: prompt },
      ],
    }),
  });
  if (!resp.ok) throw new Error(`OpenAI error ${resp.status}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// ── Rule-based fallback ───────────────────────────────────────────────────────
function ruleBasedInsights(data: InsightData): string[] {
  const insights: string[] = [];

  // Mood
  if (data.mood.length >= 3) {
    const avg = data.mood.reduce((s, e) => s + e.mood, 0) / data.mood.length;
    if (avg >= 4)      insights.push('😊 Your mood has been consistently positive this week. Keep up whatever you\'re doing!');
    else if (avg <= 2) insights.push('💙 Your mood has been low lately. Consider adding a short walk or calling a friend.');
    else               insights.push('😌 Your mood has been stable. Small daily routines help keep it that way.');
  }

  // Sleep
  if (data.sleep.length >= 3) {
    const avgMins = data.sleep.reduce((s, e) => s + e.durationMins, 0) / data.sleep.length;
    const avgHrs  = avgMins / 60;
    if (avgHrs < 6)      insights.push(`😴 You've been averaging ${avgHrs.toFixed(1)}h of sleep — less than the recommended 7–9h. Try an earlier bedtime tonight.`);
    else if (avgHrs >= 8) insights.push(`🌙 Great sleep! You're averaging ${avgHrs.toFixed(1)}h this week, which supports energy and focus.`);
    else                  insights.push(`😴 You're averaging ${avgHrs.toFixed(1)}h of sleep. Consistency in bedtime helps quality.`);
  }

  // Habits
  if (data.habits.length > 0 && data.logs.length > 0) {
    const today     = new Date().toISOString().split('T')[0];
    const last7     = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    });
    const completed = data.logs.filter(l => l.completed && last7.includes(l.date)).length;
    const total     = data.habits.length * 7;
    const rate      = total > 0 ? Math.round((completed / total) * 100) : 0;
    if (rate >= 80)      insights.push(`🏆 You completed ${rate}% of your habits this week. Amazing consistency!`);
    else if (rate >= 50) insights.push(`📈 You hit ${rate}% of your habits this week. You're building momentum!`);
    else                 insights.push(`🌱 You completed ${rate}% of habits this week. Start with just one habit today.`);
  }

  // Expenses
  if (data.expenses.length > 0) {
    const total = data.expenses.reduce((s, e) => s + e.amount, 0);
    const cats  = data.expenses.reduce((acc: Record<string, number>, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount;
      return acc;
    }, {});
    const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
    if (topCat) {
      insights.push(`💸 Your top spend this period is ${topCat[0]} (₹${topCat[1].toFixed(0)}), out of ₹${total.toFixed(0)} total.`);
    }
  }

  if (insights.length === 0) {
    insights.push('📊 Keep logging your trackers daily — insights get more accurate as we learn your patterns!');
  }

  return insights;
}

// ── AI insights ───────────────────────────────────────────────────────────────
export async function generateWeeklyInsights(data: InsightData): Promise<string[]> {
  if (!OPENAI_API_KEY || (data.mood.length + data.sleep.length + data.logs.length) < 5) {
    return ruleBasedInsights(data);
  }

  const moodAvg  = data.mood.length
    ? (data.mood.reduce((s, e) => s + e.mood, 0) / data.mood.length).toFixed(1)
    : 'no data';
  const sleepAvg = data.sleep.length
    ? ((data.sleep.reduce((s, e) => s + e.durationMins, 0) / data.sleep.length) / 60).toFixed(1) + 'h'
    : 'no data';
  const habitRate = data.habits.length && data.logs.length
    ? Math.round((data.logs.filter(l => l.completed).length / (data.habits.length * 7)) * 100) + '%'
    : 'no data';
  const totalSpend = data.expenses.length
    ? '₹' + data.expenses.reduce((s, e) => s + e.amount, 0).toFixed(0)
    : 'no data';

  const prompt = `Weekly wellness summary for a user:
- Average mood (1-5 scale): ${moodAvg}
- Average sleep: ${sleepAvg}
- Habit completion rate (7 days): ${habitRate}
- Total expenses tracked: ${totalSpend}
- Active habits: ${data.habits.map(h => h.name).join(', ') || 'none'}

Give exactly 3 short, warm, actionable insights (1-2 sentences each).
Format as a JSON array of strings. No markdown, no extra text.
Example: ["insight 1", "insight 2", "insight 3"]`;

  try {
    const raw    = await callOpenAI(prompt);
    const clean  = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return ruleBasedInsights(data);
  } catch {
    return ruleBasedInsights(data);
  }
}

// ── Period prediction ─────────────────────────────────────────────────────────
export function predictNextPeriod(entries: import('../types').PeriodEntry[]): {
  nextStart: string | null;
  cycleLength: number;
} {
  if (entries.length < 2) return { nextStart: null, cycleLength: 28 };

  const sorted = [...entries].sort((a, b) =>
    new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
  );

  const cycles: number[] = [];
  for (let i = 0; i < Math.min(sorted.length - 1, 3); i++) {
    const diff =
      (new Date(sorted[i].startDate).getTime() - new Date(sorted[i + 1].startDate).getTime()) /
      (1000 * 60 * 60 * 24);
    if (diff > 15 && diff < 45) cycles.push(diff);
  }

  const avgCycle = cycles.length
    ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length)
    : 28;

  const lastStart = new Date(sorted[0].startDate);
  const nextStart = new Date(lastStart);
  nextStart.setDate(lastStart.getDate() + avgCycle);

  return {
    nextStart:   nextStart.toISOString().split('T')[0],
    cycleLength: avgCycle,
  };
}

// ── Milestone checker ─────────────────────────────────────────────────────────
export interface MilestoneCheck {
  type:        string;
  title:       string;
  description: string;
  emoji:       string;
}

export function checkMilestones(
  habitLogs: HabitLog[],
  habits:    Habit[],
  moodEntries: MoodEntry[],
  sleepEntries: SleepEntry[],
  existingTypes: string[],
): MilestoneCheck[] {
  const earned: MilestoneCheck[] = [];
  const add = (m: MilestoneCheck) => {
    if (!existingTypes.includes(m.type)) earned.push(m);
  };

  // First log ever
  if (habitLogs.length >= 1) add({ type: 'first_habit_log', emoji: '🌱', title: 'First Step', description: 'Logged your first habit!' });

  // 7-day mood streak
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });
  const moodDates = new Set(moodEntries.map(e => e.date));
  if (last7.every(d => moodDates.has(d)))
    add({ type: 'mood_7_day_streak', emoji: '😊', title: 'Mood Maestro', description: 'Logged mood 7 days in a row!' });

  // 30-day mood streak
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });
  if (last30.every(d => moodDates.has(d)))
    add({ type: 'mood_30_day_streak', emoji: '🌟', title: 'Mood Master', description: 'Logged mood for 30 days straight!' });

  // Perfect habit week
  if (habits.length > 0) {
    const completed = habitLogs.filter(l => l.completed && last7.includes(l.date)).length;
    if (completed >= habits.length * 7)
      add({ type: 'perfect_habit_week', emoji: '🏆', title: 'Perfect Week', description: 'Completed every habit for 7 days!' });
  }

  // Sleep consistency
  const sleepDates = new Set(sleepEntries.slice(0, 7).map(e => e.date));
  if (sleepDates.size >= 7)
    add({ type: 'sleep_7_days', emoji: '🌙', title: 'Sleep Tracker', description: 'Tracked sleep for 7 consecutive days!' });

  return earned;
}
