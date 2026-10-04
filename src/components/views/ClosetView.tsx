'use client';

import { useState } from 'react';
import { CATEGORIES, FORMALITY_LABELS, PATTERNS } from '@/lib/domain/catalog';
import type { Item, Kind } from '@/lib/domain/types';
import { useWardrobe } from '@/lib/state/WardrobeProvider';
import { EmptyCloset } from '../EmptyCloset';
import { ItemEditor } from '../ItemEditor';
import { Photo } from '../Photo';

function Hanger() {
  return (
    <svg viewBox="0 0 60 26" className="mx-auto -mb-1 block h-6 w-14 text-ink" aria-hidden="true">
      <path
        d="M30 2 a5 5 0 1 1 5 5 q-5 0 -5 5 L4 22 h52 L30 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Rail({ title, items, onOpen, onAdd }: { title: string; items: Item[]; onOpen: (i: Item) => void; onAdd: () => void }) {
  const headingId = `rail-${title.toLowerCase()}`;
  return (
    <section aria-labelledby={headingId} className="mt-10">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={headingId} className="wide text-3xl font-bold">
          {title} <span className="font-normal text-muted">{items.length}</span>
        </h2>
        <button type="button" className="link-btn" onClick={onAdd}>
          Add {title === 'Tops' ? 'a top' : 'a bottom'}
        </button>
      </div>
      <div className="relative mt-2">
        <div className="rail-rod" aria-hidden="true" />
        {/* Scrollable region is focusable so keyboard users can scroll it. */}
        <ul
          className="rail"
          tabIndex={0}
          aria-label={`${title} rail, scroll sideways`}
        >
          {items.length === 0 && <li className="pt-10 text-muted">Nothing hanging here yet.</li>}
          {items.map((item) => (
            <li key={item.id} className="w-40 shrink-0 sm:w-48">
              <button type="button" className="group block w-full text-left" onClick={() => onOpen(item)}>
                <Hanger />
                <Photo item={item} decorative className="aspect-[5/6] w-full" />
                <span className="mt-2 flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-1 inline-block h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-seam"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-semibold leading-snug group-hover:underline">{item.name}</span>
                </span>
                <span className="mt-0.5 block pl-5.5 text-sm text-muted">
                  {CATEGORIES[item.category].label}, {PATTERNS[item.pattern].label.toLowerCase()},{' '}
                  {FORMALITY_LABELS[item.formality].toLowerCase()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function ClosetView() {
  const { items, tops, bottoms } = useWardrobe();
  const [editing, setEditing] = useState<Item | null>(null);
  const [adding, setAdding] = useState<Kind | null>(null);

  if (items.length === 0) return <EmptyCloset />;

  const close = () => {
    setEditing(null);
    setAdding(null);
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 pt-4">
        <h1 className="display page-title">Closet</h1>
        <button type="button" className="btn btn-solid" onClick={() => setAdding('top')}>
          Add a piece
        </button>
      </div>
      <Rail title="Tops" items={tops} onOpen={setEditing} onAdd={() => setAdding('top')} />
      <Rail title="Bottoms" items={bottoms} onOpen={setEditing} onAdd={() => setAdding('bottom')} />
      <ItemEditor open={Boolean(editing || adding)} item={editing} defaultKind={adding ?? 'top'} onClose={close} />
    </>
  );
}
