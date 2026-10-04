import { colorDistance, hexToRgb } from '../color/color';
import { CATEGORIES, OCCASIONS } from '../domain/catalog';
import { autoName } from '../domain/naming';
import type { Category, Formality, Item, Kind } from '../domain/types';
import { evaluatePrepared, prepare } from './evaluate';

export interface GapSuggestion {
  kind: Kind;
  category: Category;
  color: string;
  name: string;
  formality: Formality;
  /** Number of new outfits (valid for ≥ 1 occasion) this piece would create. */
  unlocks: number;
  /** Ids of existing pieces it pairs with. */
  pairsWith: string[];
}

/** Curated basics, most versatile first; order is the tie-breaker. */
export const GAP_PALETTE = [
  '#161616', // black
  '#f7f7f5', // white
  '#1f2a44', // navy
  '#8e9095', // grey
  '#d8c3a5', // beige
  '#b7895a', // camel
  '#6b6b3a', // olive
  '#a9c4e0', // light blue
  '#6d1f2f', // burgundy
  '#9caf88', // sage
];

/** Closer than this (redmean) to an existing piece of the same category counts as a duplicate. */
const DUPLICATE_DISTANCE = 80;

/** Every candidate basic, built once: category × its palette, plain weave, default formality. */
const CANDIDATES: Item[] = (Object.entries(CATEGORIES) as [Category, (typeof CATEGORIES)[Category]][]).flatMap(
  ([category, info]) =>
    (info.gapPalette ?? GAP_PALETTE).map((color) => ({
      id: `gap:${category}:${color}`,
      kind: info.kind,
      category,
      name: autoName(color, category),
      color,
      pattern: 'solid' as const,
      formality: info.defaultFormality,
      photoId: '',
      createdAt: '',
    })),
);
const CANDIDATE_RGB = new Map(CANDIDATES.map((c) => [c, hexToRgb(c.color)]));
const BY_OCCASION = OCCASIONS.map((o) => prepare({ occasion: o.id }));

/** FR-19: the single purchase that unlocks the most new outfits, plus runners-up. */
export function findGaps(items: Item[], limit = 3): GapSuggestion[] {
  const owned = items.map((i) => ({ item: i, rgb: hexToRgb(i.color) }));
  const pairs = (candidate: Item, other: Item) => {
    const [top, bottom] = candidate.kind === 'top' ? [candidate, other] : [other, candidate];
    return BY_OCCASION.some((p) => evaluatePrepared(top, bottom, p).ok);
  };

  // Best colour per category, so runners-up are different kinds of piece rather than the same trousers in navy.
  const bestPerCategory = new Map<Category, GapSuggestion>();
  for (const c of CANDIDATES) {
    const rgb = CANDIDATE_RGB.get(c)!;
    if (owned.some((o) => o.item.category === c.category && colorDistance(o.rgb, rgb) < DUPLICATE_DISTANCE)) continue;
    const partners = items.filter((i) => i.kind !== c.kind && pairs(c, i));
    const current = bestPerCategory.get(c.category);
    if (partners.length === 0 || (current && current.unlocks >= partners.length)) continue;
    bestPerCategory.set(c.category, {
      kind: c.kind,
      category: c.category,
      color: c.color,
      name: c.name.toLowerCase(),
      formality: c.formality,
      unlocks: partners.length,
      pairsWith: partners.map((p) => p.id),
    });
  }
  // Stable sort keeps catalogue order (versatile basics first) on ties.
  return [...bestPerCategory.values()].sort((a, b) => b.unlocks - a.unlocks).slice(0, limit);
}
