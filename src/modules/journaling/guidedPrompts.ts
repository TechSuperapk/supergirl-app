// Guided-journal prompt sets per journal category. Answers are combined into the
// entry body on save. Morning / Night / Vent share the same "reflection" shape;
// Dream, Quotes, Ideas and Affirmation have their own.
export interface GuidedPrompt { id: string; label: string; placeholder?: string; }

export const GUIDED_PROMPTS: Record<string, GuidedPrompt[]> = {
  morning: [
    { id: 'feel',      label: 'How are you feeling this morning?', placeholder: 'A word or two…' },
    { id: 'grateful',  label: 'What are you grateful for today?' },
    { id: 'intention', label: "What's your main intention for today?" },
    { id: 'looking',   label: 'What are you looking forward to?' },
  ],
  night: [
    { id: 'day',      label: 'How did today go?' },
    { id: 'well',     label: 'What went well?' },
    { id: 'better',   label: 'What could have gone better?' },
    { id: 'grateful', label: 'What are you grateful for tonight?' },
  ],
  vent: [
    { id: 'mind',    label: "What's on your mind?" },
    { id: 'trigger', label: 'What triggered this feeling?' },
    { id: 'need',    label: 'What do you need right now?' },
    { id: 'help',    label: 'What would help you feel better?' },
  ],
  dream: [
    { id: 'about',   label: 'What did you dream about?' },
    { id: 'feel',    label: 'How did the dream make you feel?' },
    { id: 'symbols', label: 'Any symbols or themes you noticed?' },
    { id: 'meaning', label: 'What might it mean to you?' },
  ],
  quotes: [
    { id: 'quote', label: 'The quote' },
    { id: 'why',   label: 'Why it resonates with you' },
  ],
  ideas: [
    { id: 'idea', label: 'Your idea' },
    { id: 'next', label: 'A next step to explore it' },
  ],
  affirm: [
    { id: 'affirm', label: "Today's affirmation" },
    { id: 'why',    label: 'Why this matters to you' },
  ],
};

export const promptsFor = (cat?: string): GuidedPrompt[] =>
  GUIDED_PROMPTS[cat ?? ''] ?? GUIDED_PROMPTS.morning;
