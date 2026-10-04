import type { NewItem } from '../domain/types';
import type { WardrobeRepository } from '../storage/repository';
import { garmentSvg } from './flats';

/** A believable closet: a few workhorses, a couple of statement pieces, something for a wedding. */
export const SAMPLE_ITEMS: NewItem[] = [
  { kind: 'top', category: 'shirt', name: 'Navy oxford shirt', color: '#26324f', pattern: 'solid', formality: 3 },
  { kind: 'top', category: 'tee', name: 'White linen tee', color: '#f4f2ec', pattern: 'solid', formality: 2 },
  { kind: 'top', category: 'sweater', name: 'Rust ribbed sweater', color: '#a4502e', pattern: 'solid', formality: 3 },
  { kind: 'top', category: 'tee', name: 'Breton stripe top', color: '#f3f1ea', pattern: 'stripes', formality: 2 },
  { kind: 'top', category: 'blouse', name: 'Sage silk blouse', color: '#a3b495', pattern: 'solid', formality: 4 },
  { kind: 'top', category: 'kurta', name: 'Indigo block-print kurta', color: '#34436e', pattern: 'print', formality: 3 },
  { kind: 'top', category: 'hoodie', name: 'Grey marl hoodie', color: '#9a9ca1', pattern: 'solid', formality: 1 },
  { kind: 'top', category: 'polo', name: 'Black knit polo', color: '#1d1d1d', pattern: 'solid', formality: 3 },
  { kind: 'bottom', category: 'jeans', name: 'Mid-wash straight jeans', color: '#4a6b93', pattern: 'solid', formality: 2 },
  { kind: 'bottom', category: 'trousers', name: 'Camel pleated trousers', color: '#b38556', pattern: 'solid', formality: 4 },
  { kind: 'bottom', category: 'trousers', name: 'Black tailored trousers', color: '#1b1b1b', pattern: 'solid', formality: 5 },
  { kind: 'bottom', category: 'trousers', name: 'Cream wide-leg trousers', color: '#ece3cf', pattern: 'solid', formality: 4 },
  { kind: 'bottom', category: 'chinos', name: 'Olive cargo chinos', color: '#67683a', pattern: 'solid', formality: 2 },
  { kind: 'bottom', category: 'skirt', name: 'Navy floral midi skirt', color: '#2c3a5c', pattern: 'floral', formality: 3 },
  { kind: 'bottom', category: 'joggers', name: 'Charcoal joggers', color: '#3c3d40', pattern: 'solid', formality: 1 },
];

export async function loadSampleWardrobe(repo: WardrobeRepository): Promise<void> {
  // Sequential so createdAt order matches the list above.
  for (const item of [...SAMPLE_ITEMS].reverse()) {
    const svg = garmentSvg(item.category, item.color, item.pattern);
    await repo.addItem(item, new Blob([svg], { type: 'image/svg+xml' }));
  }
}
