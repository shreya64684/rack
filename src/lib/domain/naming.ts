import { nameColor } from '../color/color';
import { CATEGORIES } from './catalog';
import type { Category } from './types';

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** FR-4: "Navy shirt" when the user leaves the name blank. */
export function autoName(color: string, category: Category): string {
  return `${nameColor(color)} ${CATEGORIES[category].label.toLowerCase()}`;
}

export function cleanName(raw: string, color: string, category: Category): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ').slice(0, 60);
  return trimmed || autoName(color, category);
}

/** One identity for a top + bottom pair: outfit ids, favourite ids and wear history all use it. */
export const lookId = (topId: string, bottomId: string) => `${topId}__${bottomId}`;
