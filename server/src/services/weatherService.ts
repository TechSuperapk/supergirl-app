/**
 * weatherService — server-side OpenWeather proxy for the wardrobe (Home weather
 * card, AI suggestions, trip packing). Keeps the API key off the client.
 */
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

const BASE = 'https://api.openweathermap.org/data/2.5';

export interface CurrentWeather {
  city: string;
  country: string;
  tempC: number;
  feelsLikeC: number;
  humidity: number;
  condition: string;   // 'Clouds' | 'Rain' | 'Clear' …
  description: string;
  icon: string;
  // A coarse bucket the styling logic can key off directly.
  bucket: 'hot' | 'warm' | 'mild' | 'cool' | 'cold' | 'rainy';
}

function bucketFor(tempC: number, condition: string): CurrentWeather['bucket'] {
  if (/rain|drizzle|thunder/i.test(condition)) return 'rainy';
  if (tempC >= 30) return 'hot';
  if (tempC >= 24) return 'warm';
  if (tempC >= 17) return 'mild';
  if (tempC >= 8) return 'cool';
  return 'cold';
}

async function get(path: string, params: Record<string, string | number>): Promise<any> {
  if (!env.openWeatherApiKey) throw new AppError(503, 'Weather is not configured on the server');
  const qs = new URLSearchParams({ ...params, appid: env.openWeatherApiKey, units: 'metric' } as any);
  const res = await fetch(`${BASE}/${path}?${qs.toString()}`);
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new AppError(502, `Weather error ${res.status}: ${detail.slice(0, 200)}`);
  }
  return res.json();
}

function normalizeCurrent(d: any): CurrentWeather {
  const tempC = Math.round(d.main?.temp ?? 0);
  const condition = d.weather?.[0]?.main ?? 'Clear';
  return {
    city: d.name ?? '',
    country: d.sys?.country ?? '',
    tempC,
    feelsLikeC: Math.round(d.main?.feels_like ?? tempC),
    humidity: d.main?.humidity ?? 0,
    condition,
    description: d.weather?.[0]?.description ?? '',
    icon: d.weather?.[0]?.icon ?? '01d',
    bucket: bucketFor(tempC, condition),
  };
}

export async function currentByCoords(lat: number, lon: number): Promise<CurrentWeather> {
  return normalizeCurrent(await get('weather', { lat, lon }));
}

export async function currentByCity(city: string): Promise<CurrentWeather> {
  return normalizeCurrent(await get('weather', { q: city }));
}

export interface DailyForecast { date: string; minC: number; maxC: number; condition: string; bucket: CurrentWeather['bucket']; icon: string; }

/** 5-day forecast collapsed to one entry per day (used by the trip planner). */
export async function forecastByCoords(lat: number, lon: number): Promise<DailyForecast[]> {
  const d = await get('forecast', { lat, lon });
  const byDay = new Map<string, { temps: number[]; conditions: string[]; icon: string }>();
  for (const row of d.list ?? []) {
    const date = String(row.dt_txt ?? '').slice(0, 10);
    if (!date) continue;
    const entry = byDay.get(date) ?? { temps: [], conditions: [], icon: row.weather?.[0]?.icon ?? '01d' };
    entry.temps.push(row.main?.temp ?? 0);
    entry.conditions.push(row.weather?.[0]?.main ?? 'Clear');
    byDay.set(date, entry);
  }
  return [...byDay.entries()].map(([date, e]) => {
    const minC = Math.round(Math.min(...e.temps));
    const maxC = Math.round(Math.max(...e.temps));
    const condition = e.conditions.sort((a, b) =>
      e.conditions.filter(c => c === b).length - e.conditions.filter(c => c === a).length)[0] ?? 'Clear';
    return { date, minC, maxC, condition, bucket: bucketFor(maxC, condition), icon: e.icon };
  });
}
