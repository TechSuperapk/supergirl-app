/**
 * aiStylistService.ts
 *
 * Uses OpenAI GPT-4o (or Gemini as fallback) to generate outfit
 * suggestions from the user's wardrobe items.
 *
 * Input:  array of ClothingItem (category, colorTags, name)
 * Output: array of AISuggestion (item IDs, reason, occasion)
 *
 * Set OPENAI_API_KEY in your .env / app.config.js extras.
 */
import { ClothingItem, AISuggestion } from '../types';

// Replace with your actual key via expo Constants / env
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
const OPENAI_MODEL   = 'gpt-4o';

export interface StylistRequest {
  wardrobe:  ClothingItem[];
  occasion?: string;   // 'casual' | 'work' | 'date' | 'party' | 'gym' etc.
  weather?:  string;   // 'hot' | 'cold' | 'rainy' | 'mild'
  count?:    number;   // how many outfits to suggest (default 3)
}

interface RawSuggestion {
  itemIds:  string[];
  reason:   string;
  occasion: string;
}

// ── Build the prompt ──────────────────────────────────────────────────────────
function buildPrompt(req: StylistRequest): string {
  const itemList = req.wardrobe
    .map(
      item =>
        `- ID:${item.id} | ${item.category} | "${item.name}" | colors: ${item.colorTags.join(', ')}`,
    )
    .join('\n');

  return `You are a personal fashion stylist AI. Given the wardrobe below, suggest ${req.count ?? 3} outfit combinations.

RULES:
- Only use item IDs from the wardrobe list below
- Each outfit must include at least a top and bottom (or a dress)
- Vary occasions across suggestions
- Consider color harmony
- If occasion is specified, bias toward it
${req.weather ? `- Weather today: ${req.weather}` : ''}
${req.occasion ? `- Primary occasion: ${req.occasion}` : ''}

WARDROBE:
${itemList}

Respond ONLY with a valid JSON array (no markdown, no explanation):
[
  {
    "itemIds": ["id1", "id2", "id3"],
    "reason": "Why this works — 1-2 sentences",
    "occasion": "casual / work / date / party / gym / etc."
  }
]`;
}

// ── Call OpenAI ───────────────────────────────────────────────────────────────
async function callOpenAI(prompt: string): Promise<string> {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model:       OPENAI_MODEL,
      max_tokens:  800,
      temperature: 0.7,
      messages: [
        {
          role:    'system',
          content: 'You are a personal fashion stylist. Always respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `OpenAI error ${resp.status}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? '[]';
}

// ── Parse response ────────────────────────────────────────────────────────────
function parseResponse(raw: string): RawSuggestion[] {
  const clean = raw
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();
  try {
    return JSON.parse(clean) as RawSuggestion[];
  } catch {
    return [];
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function generateOutfitSuggestions(
  req: StylistRequest,
): Promise<AISuggestion[]> {
  if (!OPENAI_API_KEY) {
    // Return mock suggestions if no key set (dev fallback)
    return generateMockSuggestions(req.wardrobe, req.count ?? 3);
  }

  const prompt  = buildPrompt(req);
  const raw     = await callOpenAI(prompt);
  const parsed  = parseResponse(raw);

  const validWardrobeIds = new Set(req.wardrobe.map(i => i.id));

  return parsed
    .filter(s => s.itemIds.length >= 2 && s.itemIds.every(id => validWardrobeIds.has(id)))
    .map((s, idx) => ({
      id:            `ai_${Date.now()}_${idx}`,
      outfitItemIds: s.itemIds,
      reason:        s.reason,
      occasion:      s.occasion,
      generatedAt:   new Date().toISOString(),
    }));
}

// ── Mock fallback (no API key) ────────────────────────────────────────────────
function generateMockSuggestions(
  wardrobe: ClothingItem[],
  count: number,
): AISuggestion[] {
  const tops    = wardrobe.filter(i => i.category === 'tops');
  const bottoms = wardrobe.filter(i => i.category === 'bottoms');
  const dresses = wardrobe.filter(i => i.category === 'dresses');
  const shoes   = wardrobe.filter(i => i.category === 'shoes');

  const suggestions: AISuggestion[] = [];
  const occasions = ['casual', 'work', 'date night'];

  for (let i = 0; i < Math.min(count, 3); i++) {
    const itemIds: string[] = [];

    if (dresses.length > i) {
      itemIds.push(dresses[i].id);
    } else if (tops.length > i && bottoms.length > i) {
      itemIds.push(tops[i].id, bottoms[i].id);
    }

    if (shoes.length > 0) itemIds.push(shoes[i % shoes.length].id);
    if (itemIds.length < 2) continue;

    suggestions.push({
      id:            `mock_${i}`,
      outfitItemIds: itemIds,
      reason:        `A great ${occasions[i]} look from your wardrobe. The pieces complement each other well in both color and style.`,
      occasion:      occasions[i],
      generatedAt:   new Date().toISOString(),
    });
  }

  return suggestions;
}

// ── Weekly AI insights ────────────────────────────────────────────────────────
export async function generateWardrobeInsights(
  wardrobe: ClothingItem[],
): Promise<string> {
  if (!OPENAI_API_KEY || wardrobe.length === 0) {
    return `You have ${wardrobe.length} items in your wardrobe. Add more items to get personalised style insights!`;
  }

  const categoryCounts: Record<string, number> = {};
  wardrobe.forEach(item => {
    categoryCounts[item.category] = (categoryCounts[item.category] ?? 0) + 1;
  });

  const summary = Object.entries(categoryCounts)
    .map(([cat, n]) => `${n} ${cat}`)
    .join(', ');

  const prompt = `Wardrobe summary: ${summary}. 
Give a 2-sentence style insight: what's working well and one gap to fill. Be encouraging and specific. Max 60 words.`;

  try {
    const raw = await callOpenAI(prompt);
    return raw.replace(/"/g, '').trim();
  } catch {
    return `Your wardrobe has ${wardrobe.length} items across ${Object.keys(categoryCounts).length} categories. Keep building it out for more personalised suggestions!`;
  }
}
