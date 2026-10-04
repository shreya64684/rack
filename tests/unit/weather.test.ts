import { describe, expect, it, vi } from 'vitest';
import {
  CACHE_MS,
  cacheKey,
  describeWeather,
  freshCache,
  getForecast,
  readForecastCache,
  searchPlaces,
  writeForecastCache,
  WeatherError,
} from '@/lib/weather/openMeteo';
import type { Forecast } from '@/lib/domain/types';

const ok = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })) as unknown as typeof fetch;

const FORECAST_BODY = {
  daily: {
    time: ['2026-10-04'],
    temperature_2m_max: [27.2],
    temperature_2m_min: [18.1],
    precipitation_probability_max: [65],
    weather_code: [61],
  },
};

describe('Open-Meteo forecast (FR-17)', () => {
  it('requests the keyless forecast endpoint and parses today', async () => {
    const f = ok(FORECAST_BODY);
    const forecast = await getForecast(18.5204, 73.8567, f);
    const url = String((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(url).toMatch(/^https:\/\/api\.open-meteo\.com\/v1\/forecast\?/);
    expect(url).toContain('latitude=18.520');
    expect(url).not.toMatch(/key/i);
    expect(forecast).toEqual({
      date: '2026-10-04',
      maxC: 27.2,
      minC: 18.1,
      precipitationChance: 65,
      weatherCode: 61,
    });
  });

  it('EC-5: a network failure becomes a WeatherError', async () => {
    const f = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    await expect(getForecast(0, 0, f)).rejects.toBeInstanceOf(WeatherError);
  });

  it('EC-5: a non-200 answer becomes a WeatherError', async () => {
    const f = vi.fn(async () => new Response('busy', { status: 503 })) as unknown as typeof fetch;
    await expect(getForecast(0, 0, f)).rejects.toThrow(/503/);
  });

  it('EC-5: malformed JSON or missing fields become a WeatherError', async () => {
    const bad = vi.fn(async () => new Response('<html>', { status: 200 })) as unknown as typeof fetch;
    await expect(getForecast(0, 0, bad)).rejects.toBeInstanceOf(WeatherError);
    await expect(getForecast(0, 0, ok({ daily: {} }))).rejects.toBeInstanceOf(WeatherError);
  });

  it('defaults missing rain chance to 0', async () => {
    const body = { daily: { ...FORECAST_BODY.daily, precipitation_probability_max: [null] } };
    expect((await getForecast(0, 0, ok(body))).precipitationChance).toBe(0);
  });
});

describe('place search', () => {
  it('maps geocoding results to readable names', async () => {
    const places = await searchPlaces(
      'Pune',
      ok({ results: [{ name: 'Pune', admin1: 'Maharashtra', country: 'India', latitude: 18.52, longitude: 73.86 }] }),
    );
    expect(places).toEqual([{ name: 'Pune, Maharashtra, India', latitude: 18.52, longitude: 73.86 }]);
  });

  it('EC-6: no results gives an empty list; blank queries never hit the network', async () => {
    expect(await searchPlaces('Xyzzyville', ok({}))).toEqual([]);
    const f = ok({});
    expect(await searchPlaces('   ', f)).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });
});

describe('forecast cache (FR-18)', () => {
  const place = { name: 'Pune', latitude: 18.52, longitude: 73.86 };
  const forecast: Forecast = { date: '2026-10-04', maxC: 27, minC: 18, precipitationChance: 10, weatherCode: 1 };
  const now = new Date(2026, 9, 4, 12, 0).getTime(); // local noon on the forecast's day

  it('AC-16: a forecast fetched 30 minutes ago for the same place is reused', () => {
    const cache = { key: cacheKey(place), fetchedAt: now - 30 * 60_000, forecast };
    expect(freshCache(cache, place, now)).toBe(forecast);
  });

  it("never serves yesterday's forecast after midnight, even within the hour", () => {
    const lateNight = new Date(2026, 9, 4, 23, 50).getTime();
    const cache = { key: cacheKey(place), fetchedAt: lateNight, forecast };
    expect(freshCache(cache, place, lateNight + 5 * 60_000)).toBe(forecast);
    expect(freshCache(cache, place, lateNight + 20 * 60_000)).toBeNull();
  });

  it('expires after an hour or when the place changes', () => {
    expect(freshCache({ key: cacheKey(place), fetchedAt: now - CACHE_MS, forecast }, place, now)).toBeNull();
    expect(freshCache({ key: '0.00,0.00', fetchedAt: now, forecast }, place, now)).toBeNull();
    expect(freshCache(null, place, now)).toBeNull();
  });

  it('persists the cache per device in localStorage, tolerating junk', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    });
    expect(readForecastCache()).toBeNull();
    writeForecastCache(place, forecast, now);
    expect(freshCache(readForecastCache(), place, now + 60_000)).toEqual(forecast);
    store.set('rack:forecast', '{not json');
    expect(readForecastCache()).toBeNull();
    vi.unstubAllGlobals();
  });

  it('describes WMO codes in plain words', () => {
    expect(describeWeather(0)).toBe('Clear');
    expect(describeWeather(3)).toBe('Overcast');
    expect(describeWeather(61)).toBe('Rain');
    expect(describeWeather(95)).toBe('Thunderstorms');
  });
});
