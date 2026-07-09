// A small rotating set of gentle journaling quotes; one is chosen per calendar day.
export const DAILY_QUOTES = [
  'Today is a gift — that’s why it’s called the present.',
  'Small steps every day add up to big change.',
  'Your feelings are valid. Write them down.',
  'Progress, not perfection.',
  'You are exactly where you need to be.',
  'Breathe in calm, breathe out worry.',
  'One honest line is enough for today.',
  'Be gentle with yourself.',
  'Every entry is a gift to your future self.',
  'Growth begins at the edge of your comfort zone.',
];

export const quoteOfTheDay = (d: Date = new Date()): string => {
  const start = new Date(d.getFullYear(), 0, 0);
  const day = Math.floor((d.getTime() - start.getTime()) / 86400000);
  return DAILY_QUOTES[day % DAILY_QUOTES.length];
};
