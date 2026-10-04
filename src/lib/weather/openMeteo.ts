import type { Forecast, Place, WeatherCache } from '../domain/types';

export class WeatherError extends Error {
  code = 'WEATHER';
}

type Fetch = typeof fetch;

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
export const CACHE_MS = 60 * 60 * 1000;

async function getJson(url: string, fetchImpl: Fetch): Promise<unknown> {
  let res: Response;
  try {
    res = await fetchImpl(url);
  } catch {
    throw new WeatherError('Weather is unavailable offline.');
  }
  if (!res.ok) throw new WeatherError(`Weather service answered ${res.status}.`);
  try {
    return await res.json();
  } catch {
    throw new WeatherError('Weather service sent an unreadable answer.');
  }
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export async function getForecast(latitude: number, longitude: number, fetchImpl: Fetch = fetch): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(3),
    longitude: longitude.toFixed(3),
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',
    timezone: 'auto',
    forecast_days: '1',
  });
  const data = (await getJson(`${FORECAST_URL}?${params}`, fetchImpl)) as { daily?: Record<string, unknown[]> };
  const d = data?.daily;
  const maxC = num(d?.temperature_2m_max?.[0]);
  const minC = num(d?.temperature_2m_min?.[0]);
  const date = d?.time?.[0];
  if (maxC === null || minC === null || typeof date !== 'string') {
    throw new WeatherError('Weather service sent an unreadable answer.');
  }
  return {
    date,
    maxC,
    minC,
    precipitationChance: num(d?.precipitation_probability_max?.[0]) ?? 0,
    weatherCode: num(d?.weather_code?.[0]) ?? 0,
  };
}

export async function searchPlaces(query: string, fetchImpl: Fetch = fetch): Promise<Place[]> {
  const q = query.trim();
  if (!q) return [];
  const params = new URLSearchParams({ name: q, count: '5', language: 'en', format: 'json' });
  const data = (await getJson(`${GEOCODE_URL}?${params}`, fetchImpl)) as {
    results?: { name: string; latitude: number; longitude: number; admin1?: string; country?: string }[];
  };
  return (data.results ?? []).map((r) => ({
    name: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

export const cacheKey = (p: Pick<Place, 'latitude' | 'longitude'>) => `${p.latitude.toFixed(2)},${p.longitude.toFixed(2)}`;

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** FR-18: reuse a forecast for the same place for up to an hour — and never past midnight. */
export function freshCache(cache: WeatherCache | null, place: Place, nowMs: number): Forecast | null {
  if (!cache || cache.key !== cacheKey(place)) return null;
  if (cache.forecast.date !== ymd(new Date(nowMs))) return null;
  return nowMs - cache.fetchedAt < CACHE_MS ? cache.forecast : null;
}

/** The cache is per device (it never syncs), so it lives in localStorage rather than the repository. */
const STORAGE_KEY = 'rack:forecast';

export function readForecastCache(): WeatherCache | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WeatherCache) : null;
  } catch {
    return null; // blocked storage or a corrupt entry: just refetch
  }
}

export function writeForecastCache(place: Place, forecast: Forecast, nowMs: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ key: cacheKey(place), fetchedAt: nowMs, forecast }));
  } catch {
    /* caching is an optimisation only */
  }
}

/** WMO weather interpretation codes, in plain words. */
export function describeWeather(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code <= 48) return 'Fog';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Snow showers';
  return 'Thunderstorms';
}
