/**
 * openaiService — server-side OpenAI GPT-4o Vision client for the AI Digital
 * Wardrobe. Holds the API key (never shipped to the RN client) and exposes:
 *   - detectClothing(imageUrl)      → structured metadata from a garment photo
 *   - suggestOutfits(wardrobe, ctx) → outfit combinations built ONLY from the
 *                                     user's own wardrobe, each with a reason
 *   - generateOutfitOfTheDay(...)   → a single "OOTD" pick
 *
 * All calls are fail-typed: on any upstream error an AppError(502) is thrown so
 * the route layer returns a clean 502 and the client falls back to manual entry.
 */
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
// Generation is the slowest thing we call; this is a ceiling to stop a hung
// request holding the invocation open, not a target.
const OPENAI_TIMEOUT_MS = 25_000;

// The controlled taxonomy the model must map every garment onto.
const CATEGORIES = [
  'tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories',
  'bags', 'jewelry', 'sportswear', 'sleepwear', 'traditional', 'swimwear',
];
const SEASONS   = ['spring', 'summer', 'autumn', 'winter', 'all'];
const OCCASIONS = ['casual', 'office', 'party', 'wedding', 'vacation', 'gym', 'traditional', 'festival', 'date', 'travel'];

export interface DetectedColor { hex: string; name: string; }
export interface DetectedClothing {
  name: string;
  category: string;
  subCategory: string | null;
  colors: DetectedColor[];
  pattern: string | null;
  material: string | null;
  seasons: string[];
  occasions: string[];
  gender: 'male' | 'female' | 'unisex' | null;
  sleeveLength: 'sleeveless' | 'short' | 'half' | 'full' | null;
  fitType: 'slim' | 'regular' | 'loose' | 'oversized' | null;
  brand: string | null;
  confidence: number; // 0..1
}

interface ChatMessage { role: 'system' | 'user'; content: any; }

async function chat(messages: ChatMessage[], opts: { maxTokens?: number; jsonObject?: boolean } = {}): Promise<string> {
  if (!env.openaiApiKey) throw new AppError(503, 'OpenAI is not configured on the server');
  let res: Response;
  try {
    res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: env.openaiModel,
        messages,
        temperature: 0.4,
        max_tokens: opts.maxTokens ?? 900,
        ...(opts.jsonObject ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
    });
  } catch (e: any) {
    throw new AppError(502, `OpenAI request failed: ${e?.message ?? 'network error'}`);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new AppError(502, `OpenAI error ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data: any = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new AppError(502, 'OpenAI returned an empty response');
  return content;
}

// Tolerant JSON parse — strips ```json fences the model sometimes adds.
function parseJson<T>(raw: string): T {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first !== -1 && last !== -1) return JSON.parse(cleaned.slice(first, last + 1)) as T;
    throw new AppError(502, 'Could not parse AI response as JSON');
  }
}

// ── 1. Detect a single garment from its photo ─────────────────────────────────
export async function detectClothing(imageUrl: string): Promise<DetectedClothing> {
  const system =
    'You are a fashion cataloguing assistant. Given one clothing product photo, ' +
    'return STRICT JSON describing it. Use ONLY these categories: ' + CATEGORIES.join(', ') + '. ' +
    'seasons must be a subset of: ' + SEASONS.join(', ') + '. ' +
    'occasions must be a subset of: ' + OCCASIONS.join(', ') + '. ' +
    'colors is an array of {hex,name}. If a field is unknown use null (or [] for arrays). ' +
    'confidence is 0..1. Respond with a JSON object of exactly these keys: ' +
    'name, category, subCategory, colors, pattern, material, seasons, occasions, gender, sleeveLength, fitType, brand, confidence.';

  const raw = await chat(
    [
      { role: 'system', content: system },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Catalogue this garment.' },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    { jsonObject: true, maxTokens: 700 },
  );

  const d = parseJson<Partial<DetectedClothing>>(raw);
  // Normalise / guard against out-of-taxonomy values.
  const category = CATEGORIES.includes(String(d.category)) ? String(d.category) : 'tops';
  return {
    name: d.name?.toString().slice(0, 80) || 'Clothing item',
    category,
    subCategory: d.subCategory ?? null,
    colors: Array.isArray(d.colors) ? d.colors.slice(0, 6) : [],
    pattern: d.pattern ?? null,
    material: d.material ?? null,
    seasons: Array.isArray(d.seasons) ? d.seasons.filter(s => SEASONS.includes(s)) : [],
    occasions: Array.isArray(d.occasions) ? d.occasions.filter(o => OCCASIONS.includes(o)) : [],
    gender: (['male', 'female', 'unisex'].includes(String(d.gender)) ? d.gender : null) as any,
    sleeveLength: (['sleeveless', 'short', 'half', 'full'].includes(String(d.sleeveLength)) ? d.sleeveLength : null) as any,
    fitType: (['slim', 'regular', 'loose', 'oversized'].includes(String(d.fitType)) ? d.fitType : null) as any,
    brand: d.brand ?? null,
    confidence: typeof d.confidence === 'number' ? Math.max(0, Math.min(1, d.confidence)) : 0.6,
  };
}

// ── 2. Suggest outfits from the user's wardrobe only ──────────────────────────
export interface WardrobeItemLite { id: string; name: string; category: string; colors?: string[]; occasions?: string[]; seasons?: string[]; }
export interface OutfitSuggestion { itemIds: string[]; reason: string; occasion: string; }
export interface SuggestContext { occasion?: string; weather?: string; mood?: string; season?: string; avoidItemIds?: string[]; count?: number; }

export async function suggestOutfits(wardrobe: WardrobeItemLite[], ctx: SuggestContext = {}): Promise<OutfitSuggestion[]> {
  if (!wardrobe.length) return [];
  const count = Math.max(1, Math.min(ctx.count ?? 3, 8));
  const system =
    'You are a personal stylist. Build outfits using ONLY the item ids provided — never invent items. ' +
    'Each outfit should be a sensible, non-clashing combination (e.g. a top + bottom + shoes, or a dress + shoes). ' +
    'Do not reuse the exact same set twice. Respond with JSON: { "outfits": [ { "itemIds": string[], "reason": string, "occasion": string } ] }.';
  const user = JSON.stringify({
    wardrobe: wardrobe.map(w => ({ id: w.id, name: w.name, category: w.category, colors: w.colors ?? [], occasions: w.occasions ?? [], seasons: w.seasons ?? [] })),
    context: { occasion: ctx.occasion, weather: ctx.weather, mood: ctx.mood, season: ctx.season, avoidItemIds: ctx.avoidItemIds ?? [], howMany: count },
  });

  const raw = await chat(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { jsonObject: true, maxTokens: 1100 },
  );
  const parsed = parseJson<{ outfits?: OutfitSuggestion[] }>(raw);
  const valid = new Set(wardrobe.map(w => w.id));
  return (parsed.outfits ?? [])
    .map(o => ({ ...o, itemIds: (o.itemIds ?? []).filter(id => valid.has(id)) }))
    .filter(o => o.itemIds.length >= 1)
    .slice(0, count);
}

// ── 3. Outfit of the Day (single pick) ────────────────────────────────────────
export async function generateOutfitOfTheDay(wardrobe: WardrobeItemLite[], ctx: SuggestContext = {}): Promise<OutfitSuggestion | null> {
  const [first] = await suggestOutfits(wardrobe, { ...ctx, count: 1 });
  return first ?? null;
}
