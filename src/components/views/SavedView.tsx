'use client';

import Link from 'next/link';
import { useState } from 'react';
import { localToday, useWardrobe } from '@/lib/state/WardrobeProvider';
import { LookStack } from '../LookStack';

export function SavedView() {
  const { favorites, itemById, toggleFavorite, logWear, occasion } = useWardrobe();
  const [message, setMessage] = useState('');

  return (
    <div className="pt-4">
      <h1 className="display page-title">Saved</h1>
      <p role="status" aria-live="polite" className="mt-2 min-h-[1.5rem] text-muted">
        {message}
      </p>
      {favorites.length === 0 ? (
        <div className="max-w-xl py-8">
          <p className="text-lg">
            Looks you save appear here, ready for mornings when you don&apos;t want to think.
          </p>
          <Link href="/" className="btn btn-solid mt-6">
            Browse today&apos;s looks
          </Link>
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
          {favorites.map((fav) => {
            const top = itemById.get(fav.topId);
            const bottom = itemById.get(fav.bottomId);
            if (!top || !bottom) return null;
            return (
              <li key={fav.id}>
                <LookStack top={top} bottom={bottom} />
                <p className="mt-3 font-semibold leading-snug">{top.name}</p>
                <p className="leading-snug text-muted">{bottom.name}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <button
                    type="button"
                    className="link-btn"
                    onClick={async () => {
                      await logWear({ topId: top.id, bottomId: bottom.id, date: localToday(), occasion });
                      setMessage(`Logged ${top.name.toLowerCase()} with ${bottom.name.toLowerCase()} in your diary.`);
                    }}
                  >
                    Wore this today
                  </button>
                  <button
                    type="button"
                    className="link-btn"
                    aria-label={`Remove ${top.name} with ${bottom.name} from saved`}
                    onClick={() => toggleFavorite(top.id, bottom.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
