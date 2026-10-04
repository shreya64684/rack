'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { occasionById } from '@/lib/domain/catalog';
import { commonRejection, generateOutfits, type ScoredOutfit } from '@/lib/engine';
import { localToday, useWardrobe } from '@/lib/state/WardrobeProvider';
import { useWeather } from '@/lib/state/useWeather';
import { EmptyCloset } from '../EmptyCloset';
import { HangTag } from '../HangTag';
import { LookStack } from '../LookStack';
import { OccasionPicker } from '../OccasionPicker';
import { WeatherStrip } from '../WeatherStrip';

const lookNo = (i: number) => String(i + 1).padStart(2, '0');
const GRID_STEP = 12;

interface HeroLookProps {
  look: ScoredOutfit;
  index: number;
  focusOnMount: boolean;
  onWorn: () => void;
}

function HeroLook({ look, index, focusOnMount, onWorn }: HeroLookProps) {
  const { isFavorite, toggleFavorite, logWear, occasion } = useWardrobe();
  const heading = useRef<HTMLHeadingElement>(null);
  const saved = isFavorite(look.top.id, look.bottom.id);

  // When the user picks a look from the grid, the card they clicked disappears; land focus on the new hero.
  useEffect(() => {
    if (focusOnMount) heading.current?.focus();
  }, [focusOnMount]);

  return (
    <article aria-labelledby="hero-title" className="grid gap-8 py-8 md:grid-cols-[1fr_minmax(0,22rem)_auto] md:items-start md:gap-10">
      <div className="flex flex-col gap-6 md:pt-6">
        <h1 id="hero-title" ref={heading} tabIndex={-1} className="display text-[clamp(4.5rem,13vw,9.5rem)] focus:outline-none">
          Look {lookNo(index)}
        </h1>
        <p className="max-w-[22ch] text-xl leading-snug">
          {look.top.name}
          <br />
          {look.bottom.name}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-line"
            aria-pressed={saved}
            onClick={() => toggleFavorite(look.top.id, look.bottom.id)}
          >
            {saved ? 'Saved' : 'Save look'}
          </button>
          <button
            type="button"
            className="btn btn-solid"
            onClick={async () => {
              await logWear({ topId: look.top.id, bottomId: look.bottom.id, date: localToday(), occasion });
              onWorn();
            }}
          >
            Wore this today
          </button>
        </div>
      </div>
      <LookStack top={look.top} bottom={look.bottom} size="hero" motionKey={look.id} />
      <div className="md:pt-16">
        <HangTag notes={look.notes} />
      </div>
    </article>
  );
}

export function TodayView() {
  const { items, tops, bottoms, wearLog, occasion, setOccasion } = useWardrobe();
  const weather = useWeather();
  const [picked, setPicked] = useState<string | null>(null);
  const [shown, setShown] = useState(GRID_STEP);
  // Lives here, not in the hero: wearing a look removes it, so the hero remounts with the next one.
  const [notice, setNotice] = useState('');

  const maxC = weather.forecast?.maxC;
  const rain = weather.forecast?.precipitationChance;
  const ctx = useMemo(
    () => ({
      occasion,
      weather: maxC === undefined ? null : { maxC, precipitationChance: rain ?? 0 },
      wearLog,
      today: localToday(),
    }),
    [occasion, maxC, rain, wearLog],
  );
  const looks = useMemo(() => generateOutfits(tops, bottoms, ctx), [tops, bottoms, ctx]);
  const why = useMemo(
    () => (looks.length || !tops.length || !bottoms.length ? null : commonRejection(tops, bottoms, ctx)),
    [looks.length, tops, bottoms, ctx],
  );

  if (items.length === 0) return <EmptyCloset />;

  // The hero is the picked look while it's still on offer (it leaves once worn), otherwise the best one.
  const heroIndex = Math.max(0, looks.findIndex((l) => l.id === picked));
  const hero = looks[heroIndex];
  const label = occasionById(occasion).label.toLowerCase();

  let empty: string | null = null;
  if (!tops.length) empty = 'Add a top to start building looks.';
  else if (!bottoms.length) empty = 'Add a bottom to start building looks.';
  else if (!hero) {
    empty = `Nothing in your closet works for ${label} yet.${why ? ` The most common snag: ${why.text}` : ''}`;
  }

  return (
    <div>
      <WeatherStrip
        forecast={weather.forecast}
        status={weather.status}
        message={weather.message}
        location={weather.location}
        onLocation={weather.setLocation}
      />
      <p role="status" aria-live="polite" className="mt-3 min-h-[1.5rem] text-sm font-semibold empty:hidden">
        {notice}
      </p>
      <div className="mt-5">
        <OccasionPicker
          value={occasion}
          onChange={(o) => {
            setOccasion(o);
            setPicked(null);
            setShown(GRID_STEP);
          }}
        />
      </div>

      {empty || !hero ? (
        <div className="max-w-xl py-16">
          <h1 className="display text-5xl">No look yet</h1>
          <p className="mt-4 text-lg">{empty}</p>
          <p className="mt-6 flex flex-wrap gap-2">
            <Link href="/closet" className="btn btn-solid">
              Add a piece
            </Link>
            <Link href="/missing" className="btn btn-line">
              See what&apos;s missing
            </Link>
          </p>
        </div>
      ) : (
        <>
          <HeroLook
            key={hero.id}
            look={hero}
            index={heroIndex}
            focusOnMount={hero.id === picked}
            onWorn={() => setNotice(`Logged in your diary. Rack won't suggest that exact look for two weeks.`)}
          />
          {looks.length > 1 && (
            <section aria-labelledby="more-title" className="mt-6 border-t-2 border-ink pt-6">
              <h2 id="more-title" className="wide text-2xl font-bold">
                {looks.length - 1} more {looks.length === 2 ? 'look' : 'looks'} for {label}
              </h2>
              <ol className="mt-6 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
                {looks.slice(0, shown + 1).map((look, i) =>
                  i === heroIndex ? null : (
                    <li key={look.id}>
                      <button type="button" className="group block w-full text-left" onClick={() => setPicked(look.id)}>
                        <LookStack top={look.top} bottom={look.bottom} />
                        <span className="display mt-3 block text-2xl group-hover:underline">Look {lookNo(i)}</span>
                        <span className="mt-1 block text-sm leading-snug text-muted">
                          {look.top.name} with {look.bottom.name.toLowerCase()}
                        </span>
                      </button>
                    </li>
                  ),
                )}
              </ol>
              {looks.length > shown + 1 && (
                <button type="button" className="btn btn-line mt-8" onClick={() => setShown((n) => n + GRID_STEP)}>
                  Show more looks
                </button>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
