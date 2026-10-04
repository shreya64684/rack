'use client';

import { useMemo } from 'react';
import { FORMALITY_LABELS } from '@/lib/domain/catalog';
import { capitalize } from '@/lib/domain/naming';
import { findGaps, type GapSuggestion } from '@/lib/engine';
import { garmentSvg } from '@/lib/sample/flats';
import { useWardrobe } from '@/lib/state/WardrobeProvider';
import { EmptyCloset } from '../EmptyCloset';
import { Photo } from '../Photo';

function Flat({ gap, className }: { gap: GapSuggestion; className: string }) {
  // Our own generated SVG, not user input.
  return (
    <div
      role="img"
      aria-label={`Drawing of ${gap.name}`}
      className={`bg-mat [&>svg]:h-full [&>svg]:w-full ${className}`}
      dangerouslySetInnerHTML={{ __html: garmentSvg(gap.category, gap.color, 'solid') }}
    />
  );
}

export function MissingView() {
  const { items, itemById } = useWardrobe();
  const gaps = useMemo(() => findGaps(items), [items]);

  if (items.length === 0) return <EmptyCloset />;

  const [best, ...rest] = gaps;
  if (!best) {
    return (
      <div className="max-w-xl pt-4">
        <h1 className="display page-title">Missing piece</h1>
        <p className="mt-6 text-lg">
          Every basic Rack would suggest is already on your rail. Your closet is well covered.
        </p>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <h1 className="display page-title">Missing piece</h1>
      <section aria-labelledby="best-title" className="mt-8 grid gap-8 md:grid-cols-[minmax(0,20rem)_1fr] md:gap-12">
        <Flat gap={best} className="aspect-[5/6] w-full max-w-[20rem]" />
        <div>
          <p className="text-lg">If you buy one thing, make it</p>
          <h2 id="best-title" className="display mt-2 text-[clamp(2.5rem,6vw,4.5rem)]">
            {capitalize(best.name)}
          </h2>
          <p className="mt-4 text-xl">
            It would add <strong>{best.unlocks} new {best.unlocks === 1 ? 'outfit' : 'outfits'}</strong>, pairing with{' '}
            {best.unlocks === 1 ? 'this piece' : `these ${best.unlocks} pieces`} you already own. Aim for{' '}
            {FORMALITY_LABELS[best.formality].toLowerCase()} and a plain weave.
          </p>
          <ul className="mt-6 flex flex-wrap gap-3" aria-label="Pieces it pairs with">
            {best.pairsWith.map((id) => {
              const item = itemById.get(id);
              return item ? (
                <li key={id} className="w-20">
                  <Photo item={item} className="aspect-[5/6] w-full" />
                  <span className="mt-1 block text-xs leading-tight text-muted">{item.name}</span>
                </li>
              ) : null;
            })}
          </ul>
        </div>
      </section>

      {rest.length > 0 && (
        <section aria-labelledby="also-title" className="mt-14 border-t-2 border-ink pt-6">
          <h2 id="also-title" className="wide text-2xl font-bold">
            Close behind
          </h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2">
            {rest.map((gap) => (
              <li key={gap.name} className="flex items-center gap-4">
                <Flat gap={gap} className="aspect-[5/6] w-24 shrink-0" />
                <p>
                  <span className="block text-xl font-semibold">{capitalize(gap.name)}</span>
                  <span className="text-muted">
                    {gap.unlocks} new {gap.unlocks === 1 ? 'outfit' : 'outfits'}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
