'use client';

import type { Item } from '@/lib/domain/types';
import { Photo } from './Photo';

interface LookStackProps {
  top: Item | null | undefined;
  bottom: Item | null | undefined;
  size?: 'hero' | 'card' | 'thumb';
  /** Change to replay the dressing motion. */
  motionKey?: string;
}

const WIDTH = {
  hero: 'mx-auto w-full max-w-[15rem] sm:max-w-[22rem] md:mx-0',
  card: 'w-full',
  thumb: 'w-16',
};

function Piece({ item }: { item: Item | null | undefined }) {
  return item ? (
    <Photo item={item} decorative className="aspect-[5/6]" />
  ) : (
    <div className="grid aspect-[5/6] place-items-center border-2 border-dashed border-seam bg-calico text-xs text-muted">
      Removed
    </div>
  );
}

/** Top laid over bottom like a flat-lay: the core image of the app. Names are given by the caller. */
export function LookStack({ top, bottom, size = 'card', motionKey }: LookStackProps) {
  const animate = size === 'hero';
  return (
    <div className={WIDTH[size]} aria-hidden="true">
      <div key={`t-${motionKey}`} className={`relative z-10 ${animate ? 'dress-top' : ''}`}>
        <Piece item={top} />
      </div>
      <div key={`b-${motionKey}`} className={`relative -mt-[12%] ${animate ? 'dress-bottom' : ''}`}>
        <Piece item={bottom} />
      </div>
    </div>
  );
}
