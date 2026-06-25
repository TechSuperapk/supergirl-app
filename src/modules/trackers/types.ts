export type MoodLevel = 1 | 2 | 3 | 4 | 5;
export type FlowLevel = 'none' | 'spotting' | 'light' | 'medium' | 'heavy';
export type ExpenseCategory =
  | 'food' | 'shopping' | 'transport' | 'health'
  | 'entertainment' | 'beauty' | 'education' | 'other';

export interface MoodEntry {
  id:        string;
  userId:    string;
  date:      string;          // YYYY-MM-DD
  mood:      MoodLevel;
  emoji:     string;
  notes?:    string;
  energy:    MoodLevel;
  createdAt: string;
}

export interface SleepEntry {
  id:           string;
  userId:       string;
  date:         string;       // YYYY-MM-DD (night date)
  bedtime:      string;       // ISO datetime
  wakeTime:     string;       // ISO datetime
  durationMins: number;
  quality:      MoodLevel;
  notes?:       string;
  createdAt:    string;
}

export interface Habit {
  id:          string;
  userId:      string;
  name:        string;
  icon:        string;        // emoji
  color:       string;
  frequency:   'daily' | 'weekly';
  targetDays?: number[];      // 0=Sun, 1=Mon ... (for weekly)
  streak:      number;
  createdAt:   string;
}

export interface HabitLog {
  id:        string;
  habitId:   string;
  userId:    string;
  date:      string;          // YYYY-MM-DD
  completed: boolean;
}

export interface PeriodEntry {
  id:        string;
  userId:    string;
  startDate: string;
  endDate?:  string;
  flow:      FlowLevel;
  symptoms:  string[];
  notes?:    string;
  createdAt: string;
}

export interface HealthEntry {
  id:          string;
  userId:      string;
  date:        string;
  weight?:     number;        // kg
  steps?:      number;
  waterMl?:    number;
  calories?:   number;
  notes?:      string;
  createdAt:   string;
}

export interface ExpenseEntry {
  id:        string;
  userId:    string;
  date:      string;
  amount:    number;
  currency:  string;
  category:  ExpenseCategory;
  note?:     string;
  createdAt: string;
}

export interface Milestone {
  id:          string;
  userId:      string;
  type:        string;        // e.g. 'journal_7_day_streak'
  title:       string;
  description: string;
  emoji:       string;
  earnedAt:    string;
}
