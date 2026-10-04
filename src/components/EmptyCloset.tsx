'use client';

import { useState } from 'react';
import { RepositoryError } from '@/lib/storage';
import { useWardrobe } from '@/lib/state/WardrobeProvider';
import { ItemEditor } from './ItemEditor';

/** A bare clothes rail: rod, two brackets and three empty hangers, one still swinging. */
function EmptyRail() {
  const hanger = 'M0 0 a9 9 0 1 1 9 9 q-9 0 -9 9 L-42 50 h84 L0 18';
  return (
    <svg viewBox="0 0 420 300" className="w-full max-w-md text-ink" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 40 H400" strokeWidth="8" />
        <path d="M30 40 V290 M390 40 V290 M10 290 H50 M370 290 H410" />
        <path d={hanger} transform="translate(110 22)" />
        <path d={hanger} transform="translate(210 22)" />
        <path d={hanger} transform="translate(310 22) rotate(9)" />
      </g>
    </svg>
  );
}

export function EmptyCloset() {
  const { loadSamples } = useWardrobe();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  return (
    <section className="grid gap-10 py-12 md:grid-cols-[1.2fr_1fr] md:items-end">
      <div>
        <h1 className="display page-title">An empty rail</h1>
        <p className="mt-6 max-w-[46ch] text-lg">
          Photograph a few tops and bottoms against a plain wall or bed sheet. Rack reads each colour on your device,
          then puts looks together for the day, the weather and wherever you&apos;re headed.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" className="btn btn-solid" onClick={() => setAdding(true)}>
            Add your first piece
          </button>
          <button
            type="button"
            className="btn btn-line"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await loadSamples();
              } catch (err) {
                setError(err instanceof RepositoryError ? err.message : 'The samples could not be saved. Try again.');
                setBusy(false);
              }
            }}
          >
            {busy ? 'Hanging up samples…' : 'Load sample wardrobe'}
          </button>
        </div>
        <p role="alert" aria-live="assertive" className="mt-3 text-sm font-semibold text-alert empty:hidden">
          {error}
        </p>
        <p className="mt-4 max-w-[46ch] text-sm text-muted">
          The sample closet has 8 tops and 7 bottoms, from a navy oxford to a floral midi skirt. Delete them any time.
        </p>
      </div>
      <EmptyRail />
      <ItemEditor open={adding} onClose={() => setAdding(false)} />
    </section>
  );
}
