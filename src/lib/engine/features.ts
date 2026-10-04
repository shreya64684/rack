import { hexToHsl, nameColor, type Hsl } from '../color/color';
import { CATEGORIES } from '../domain/catalog';
import { autoName } from '../domain/naming';
import type { Category, Item, Warmth } from '../domain/types';

export interface Features {
  hsl: Hsl;
  colorName: string;
  neutral: boolean;
  vivid: boolean;
  whiteish: boolean;
  warmth: Warmth;
  /** "navy shirt" — used inside sentences */
  phrase: string;
}

/** Items are immutable (updates replace the object), so identity is a safe cache key. */
const cache = new WeakMap<Item, Features>();

/**
 * Blacks, whites and greys, dark low-chroma shades (navy, charcoal, chocolate), earthy beige→cream,
 * and category-specific neutrals such as blue jeans all behave as neutrals when styling (FR-9, AC-7).
 */
export function isNeutral(hsl: Hsl, category: Category): boolean {
  const { h, s, l } = hsl;
  if (s < 0.18 || l < 0.14 || l > 0.92) return true;
  if (l < 0.28 && s < 0.5) return true;
  if (h >= 20 && h <= 50 && s < 0.5 && l >= 0.45) return true;
  const hues = CATEGORIES[category].neutralHues;
  return hues !== undefined && h >= hues[0] && h <= hues[1];
}

export function featuresOf(item: Item): Features {
  let f = cache.get(item);
  if (!f) {
    const hsl = hexToHsl(item.color);
    f = {
      hsl,
      colorName: nameColor(item.color),
      neutral: isNeutral(hsl, item.category),
      vivid: hsl.s > 0.6 && hsl.l > 0.3 && hsl.l < 0.7,
      whiteish: hsl.l >= 0.87,
      warmth: CATEGORIES[item.category].warmth,
      phrase: autoName(item.color, item.category).toLowerCase(),
    };
    cache.set(item, f);
  }
  return f;
}
