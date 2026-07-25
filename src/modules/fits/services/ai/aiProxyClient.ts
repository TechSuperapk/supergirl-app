/**
 * aiProxyClient — the app's typed gateway to the wardrobe AI/weather proxy.
 *
 * Reuses the shared `apiClient` (attaches the session JWT + handles 401), so
 * there is no duplicated auth here. Every method is a thin, typed call to the
 * Milestone-2 backend routes. Callers (hooks/services) get clean typed results
 * and can catch `ApiError` for fail-soft fallbacks (e.g. manual entry when
 * detection fails).
 */
import { apiClient } from '../../../../services/apiClient';
import { FitsEndpoints } from '../../config/endpoints';

// Mirrors the server's DetectedClothing shape (openaiService.ts).
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
  confidence: number;
}

export interface OutfitSuggestion { itemIds: string[]; reason: string; occasion: string; }

export interface WardrobeItemLite {
  id: string;
  name: string;
  category: string;
  colors?: string[];
  occasions?: string[];
  seasons?: string[];
}

export interface SuggestContext {
  occasion?: string;
  weather?: string;
  mood?: string;
  season?: string;
  avoidItemIds?: string[];
  count?: number;
}

export interface CurrentWeather {
  city: string; country: string; tempC: number; feelsLikeC: number;
  humidity: number; condition: string; description: string; icon: string;
  bucket: 'hot' | 'warm' | 'mild' | 'cool' | 'cold' | 'rainy';
}
export interface DailyForecast {
  date: string; minC: number; maxC: number; condition: string;
  bucket: CurrentWeather['bucket']; icon: string;
}

/** Detect a garment's metadata from its (already-uploaded) image URL. */
export function detectClothing(imageUrl: string): Promise<DetectedClothing> {
  return apiClient.post<DetectedClothing>(FitsEndpoints.ai.detect, { imageUrl });
}

/** Remove the background; returns a base64 PNG data URL to upload as the
 *  item's transparent image. */
export async function removeBackground(imageUrl: string): Promise<string> {
  const { pngDataUrl } = await apiClient.post<{ pngDataUrl: string }>(FitsEndpoints.ai.removeBg, { imageUrl });
  return pngDataUrl;
}

/** Outfit suggestions built only from the passed wardrobe. */
export async function suggestOutfits(wardrobe: WardrobeItemLite[], ctx: SuggestContext = {}): Promise<OutfitSuggestion[]> {
  const { outfits } = await apiClient.post<{ outfits: OutfitSuggestion[] }>(FitsEndpoints.ai.suggest, { wardrobe, ...ctx });
  return outfits ?? [];
}

/** Single "Outfit of the Day" pick. */
export async function outfitOfTheDay(wardrobe: WardrobeItemLite[], ctx: SuggestContext = {}): Promise<OutfitSuggestion | null> {
  const { outfit } = await apiClient.post<{ outfit: OutfitSuggestion | null }>(FitsEndpoints.ai.ootd, { wardrobe, ...ctx });
  return outfit ?? null;
}

export function currentWeather(params: { lat: number; lon: number } | { city: string }): Promise<CurrentWeather> {
  const qs = 'city' in params
    ? `?city=${encodeURIComponent(params.city)}`
    : `?lat=${params.lat}&lon=${params.lon}`;
  return apiClient.get<CurrentWeather>(`${FitsEndpoints.weather.current}${qs}`);
}

export function weatherForecast(lat: number, lon: number): Promise<DailyForecast[]> {
  return apiClient.get<DailyForecast[]>(`${FitsEndpoints.weather.forecast}?lat=${lat}&lon=${lon}`);
}
