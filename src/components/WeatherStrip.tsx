'use client';

import { useId, useState, type FormEvent } from 'react';
import type { Forecast, Place } from '@/lib/domain/types';
import { locateMe, type WeatherStatus } from '@/lib/state/useWeather';
import { describeWeather, searchPlaces } from '@/lib/weather/openMeteo';

interface WeatherStripProps {
  forecast: Forecast | null;
  status: WeatherStatus;
  message: string | null;
  location: Place | null;
  onLocation: (p: Place) => Promise<void> | void;
}

function PlacePicker({ onPick, onCancel }: { onPick: (p: Place) => void; onCancel?: () => void }) {
  const inputId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function search(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const found = await searchPlaces(query);
      setResults(found);
      if (!found.length) setError(`No place called “${query.trim()}” found. Try a nearby city.`);
    } catch {
      setError('Place search is unavailable offline.');
    } finally {
      setBusy(false);
    }
  }

  async function useMine() {
    setBusy(true);
    setError(null);
    try {
      onPick(await locateMe());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 max-w-xl">
      <form onSubmit={search} className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={inputId} className="label">
            City
          </label>
          <input
            id={inputId}
            className="field"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pune, Lisbon, Toronto…"
            autoComplete="address-level2"
            required
          />
        </div>
        <button className="btn btn-solid" disabled={busy}>
          Search
        </button>
        <button type="button" className="btn btn-line" onClick={useMine} disabled={busy}>
          Use my location
        </button>
        {onCancel && (
          <button type="button" className="btn btn-line" onClick={onCancel}>
            Cancel
          </button>
        )}
      </form>
      <p role="status" aria-live="polite" className="mt-2 text-sm text-alert">
        {error}
      </p>
      {results && results.length > 0 && (
        <ul className="mt-1 divide-y divide-thread border-y border-thread" aria-label="Matching places">
          {results.map((p) => (
            <li key={`${p.latitude},${p.longitude}`}>
              <button type="button" className="w-full py-2.5 text-left hover:underline" onClick={() => onPick(p)}>
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function WeatherStrip({ forecast, status, message, location, onLocation }: WeatherStripProps) {
  const [editing, setEditing] = useState(false);
  const pick = async (p: Place) => {
    await onLocation(p);
    setEditing(false);
  };

  const today = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <section aria-label="Today's weather" className="border-y-2 border-ink py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="wide text-lg font-bold">{today}</p>
        <div className="flex flex-wrap items-baseline gap-x-4 text-[0.95rem]" aria-live="polite">
          {status === 'ready' && forecast && location && (
            <p>
              <span className="font-semibold">{location.name.split(',')[0]}</span>, {describeWeather(forecast.weatherCode).toLowerCase()},{' '}
              {Math.round(forecast.maxC)}° high, {Math.round(forecast.minC)}° low
              {forecast.precipitationChance >= 30 && `, ${forecast.precipitationChance}% chance of rain`}
            </p>
          )}
          {status === 'loading' && <p className="text-muted">Checking the weather…</p>}
          {status === 'error' && (
            <p className="text-alert">{message ?? 'Weather unavailable'}. Looks below ignore the weather.</p>
          )}
          {status === 'no-location' && !editing && <p className="text-muted">Add your city to dress for the weather.</p>}
          {!editing && (
            <button type="button" className="link-btn" onClick={() => setEditing(true)}>
              {location ? 'Change place' : 'Add city'}
            </button>
          )}
        </div>
      </div>
      {editing && <PlacePicker onPick={pick} onCancel={() => setEditing(false)} />}
    </section>
  );
}
