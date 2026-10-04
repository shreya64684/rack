import type { Category, Formality, Item, Pattern, WearEntry } from '@/lib/domain/types';
import { CATEGORIES } from '@/lib/domain/catalog';

let n = 0;

/** Build an item with sensible defaults; category decides kind. */
export function item(
  category: Category,
  color: string,
  opts: { pattern?: Pattern; formality?: Formality; name?: string; id?: string } = {},
): Item {
  n += 1;
  return {
    id: opts.id ?? `i${n}`,
    kind: CATEGORIES[category].kind,
    category,
    name: opts.name ?? `${color} ${category}`,
    color,
    pattern: opts.pattern ?? 'solid',
    formality: opts.formality ?? CATEGORIES[category].defaultFormality,
    photoId: `p${n}`,
    createdAt: new Date(2026, 0, n).toISOString(),
  };
}

export function worn(top: Item, bottom: Item, date: string): WearEntry {
  return { id: `w-${top.id}-${date}`, topId: top.id, bottomId: bottom.id, date, occasion: 'everyday', createdAt: `${date}T08:00:00Z` };
}

export const C = {
  navy: '#1f2a44',
  grey: '#8e9095',
  white: '#f7f7f5',
  cream: '#efe6d2',
  black: '#161616',
  camel: '#b7895a',
  denim: '#3f5f86',
  orange: '#e8772e', // ~24°
  green: '#4caf2a', // ~100°
  rust: '#a9512c',
  red: '#c62828',
  pink: '#e9a3b6',
  teal: '#1f7373',
  cobalt: '#1f4fbf',
} as const;
