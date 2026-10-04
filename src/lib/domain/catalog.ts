import type { BottomCategory, Category, Formality, Kind, OccasionId, Pattern, TopCategory, Warmth } from './types';

interface CategoryInfo {
  kind: Kind;
  label: string;
  warmth: Warmth;
  defaultFormality: Formality;
  /** Hue range (degrees) that styles as a neutral in this category — blue jeans go with everything. */
  neutralHues?: [number, number];
  /** Colours the gap finder suggests for this category, when the general basics don't apply. */
  gapPalette?: string[];
}

export const CATEGORIES: Record<Category, CategoryInfo> = {
  tee: { kind: 'top', label: 'T-shirt', warmth: 'light', defaultFormality: 1 },
  tank: { kind: 'top', label: 'Tank', warmth: 'light', defaultFormality: 1 },
  shirt: { kind: 'top', label: 'Shirt', warmth: 'medium', defaultFormality: 3 },
  blouse: { kind: 'top', label: 'Blouse', warmth: 'light', defaultFormality: 3 },
  polo: { kind: 'top', label: 'Polo', warmth: 'light', defaultFormality: 2 },
  sweater: { kind: 'top', label: 'Sweater', warmth: 'warm', defaultFormality: 3 },
  hoodie: { kind: 'top', label: 'Hoodie', warmth: 'warm', defaultFormality: 1 },
  kurta: { kind: 'top', label: 'Kurta', warmth: 'medium', defaultFormality: 3 },
  jeans: {
    kind: 'bottom',
    label: 'Jeans',
    warmth: 'medium',
    defaultFormality: 2,
    neutralHues: [190, 250],
    gapPalette: ['#3f5f86', '#161616', '#8fa9c7', '#f7f7f5'], // mid wash, black, light wash, white
  },
  trousers: { kind: 'bottom', label: 'Trousers', warmth: 'medium', defaultFormality: 4 },
  chinos: { kind: 'bottom', label: 'Chinos', warmth: 'medium', defaultFormality: 3 },
  skirt: { kind: 'bottom', label: 'Skirt', warmth: 'light', defaultFormality: 3 },
  shorts: { kind: 'bottom', label: 'Shorts', warmth: 'light', defaultFormality: 1 },
  joggers: { kind: 'bottom', label: 'Joggers', warmth: 'medium', defaultFormality: 1 },
};

export const TOP_CATEGORIES = Object.keys(CATEGORIES).filter(
  (c) => CATEGORIES[c as Category].kind === 'top',
) as TopCategory[];
export const BOTTOM_CATEGORIES = Object.keys(CATEGORIES).filter(
  (c) => CATEGORIES[c as Category].kind === 'bottom',
) as BottomCategory[];

export const categoriesFor = (kind: Kind): Category[] => (kind === 'top' ? TOP_CATEGORIES : BOTTOM_CATEGORIES);

/** First category of a kind and its usual formality: the starting point for a new piece. */
export function defaultsFor(kind: Kind): { category: Category; formality: Formality } {
  const category = categoriesFor(kind)[0];
  return { category, formality: CATEGORIES[category].defaultFormality };
}

export const PATTERNS: Record<Pattern, { label: string; busy: boolean }> = {
  solid: { label: 'Solid', busy: false },
  stripes: { label: 'Stripes', busy: false },
  checks: { label: 'Checks', busy: true },
  floral: { label: 'Floral', busy: true },
  print: { label: 'Print', busy: true },
  graphic: { label: 'Graphic', busy: true },
};

export const FORMALITY_LABELS: Record<Formality, string> = {
  1: 'Lounge',
  2: 'Casual',
  3: 'Smart casual',
  4: 'Business',
  5: 'Formal',
};

export interface Occasion {
  id: OccasionId;
  label: string;
  /** Inclusive formality range the look should sit in. */
  range: [Formality, Formality];
  bannedCategories: Category[];
  bannedPatterns: Pattern[];
  /** No all-white look (don't compete with the couple). */
  noAllWhite?: boolean;
}

export const OCCASIONS: Occasion[] = [
  { id: 'everyday', label: 'Everyday', range: [1, 3], bannedCategories: [], bannedPatterns: [] },
  { id: 'office', label: 'Office', range: [3, 4], bannedCategories: ['shorts'], bannedPatterns: ['graphic'] },
  { id: 'college', label: 'College', range: [1, 3], bannedCategories: [], bannedPatterns: [] },
  { id: 'date', label: 'Date night', range: [3, 4], bannedCategories: ['joggers'], bannedPatterns: [] },
  {
    id: 'wedding',
    label: 'Wedding guest',
    range: [4, 5],
    bannedCategories: ['shorts'],
    bannedPatterns: ['graphic'],
    noAllWhite: true,
  },
  { id: 'travel', label: 'Travel', range: [1, 3], bannedCategories: [], bannedPatterns: [] },
];

export const occasionById = (id: OccasionId): Occasion => OCCASIONS.find((o) => o.id === id) ?? OCCASIONS[0];
