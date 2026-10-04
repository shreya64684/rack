'use client';

import type { Item } from '@/lib/domain/types';
import { usePhotoUrl } from '@/lib/state/WardrobeProvider';

interface PhotoProps {
  item: Item;
  className?: string;
  /** Decorative when the item name is already next to it. */
  decorative?: boolean;
}

/** A garment on its white mount. Falls back to a swatch while loading. */
export function Photo({ item, className = '', decorative = false }: PhotoProps) {
  const url = usePhotoUrl(item.photoId);
  return (
    <div className={`relative overflow-hidden bg-mat ${className}`} style={{ backgroundColor: url ? undefined : item.color }}>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- blob: URLs can't go through next/image
        <img
          src={url}
          alt={decorative ? '' : item.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain"
          draggable={false}
        />
      )}
    </div>
  );
}
