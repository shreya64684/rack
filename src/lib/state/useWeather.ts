'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Forecast, Place } from '../domain/types';
import {
  cacheKey,
  freshCache,
  getForecast,
  readForecastCache,
  WeatherError,
  writeForecastCache,
} from '../weather/openMeteo';
import { useWardrobe } from './WardrobeProvider';

export type WeatherStatus = 'no-location' | 'loading' | 'ready' | 'error';

interface Result {
  key: string;
  forecast: Forecast | null;
  error: string | null;
}

export function useWeather() {
  const { settings, saveSettings } = useWardrobe();
  const location = settings.location;
  const key = location ? cacheKey(location) : null;
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!location || !key) return;
    let live = true;
    const fresh = freshCache(readForecastCache(), location, Date.now()); // FR-18
    const request = fresh ? Promise.resolve(fresh) : getForecast(location.latitude, location.longitude);
    request
      .then((forecast) => {
        if (!live) return;
        if (!fresh) writeForecastCache(location, forecast, Date.now());
        setResult({ key, forecast, error: null });
      })
      .catch((err) => {
        if (live) {
          setResult({
            key,
            forecast: null,
            error: err instanceof WeatherError ? err.message : 'Weather is unavailable right now.',
          });
        }
      });
    return () => {
      live = false;
    };
    // `key` identifies the location; the object itself changes identity on every settings save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = result?.key === key ? result : null;
  const status: WeatherStatus = !location ? 'no-location' : !current ? 'loading' : current.forecast ? 'ready' : 'error';
  const setLocation = useCallback((place: Place) => saveSettings({ location: place }), [saveSettings]);

  return { forecast: current?.forecast ?? null, status, message: current?.error ?? null, location, setLocation };
}

/** Browser geolocation as a Place; rejects with a readable message. */
export function locateMe(): Promise<Place> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('This browser cannot share your location.'));
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          name: 'Your location',
          latitude: Number(pos.coords.latitude.toFixed(3)),
          longitude: Number(pos.coords.longitude.toFixed(3)),
        }),
      () => reject(new Error('Location is blocked. Search for your city instead.')),
      { timeout: 10_000, maximumAge: 30 * 60_000 },
    );
  });
}
