export type Kind = 'top' | 'bottom';
export type TopCategory = 'tee' | 'tank' | 'shirt' | 'blouse' | 'polo' | 'sweater' | 'hoodie' | 'kurta';
export type BottomCategory = 'jeans' | 'trousers' | 'chinos' | 'skirt' | 'shorts' | 'joggers';
export type Category = TopCategory | BottomCategory;
export type Pattern = 'solid' | 'stripes' | 'checks' | 'floral' | 'print' | 'graphic';
export type Formality = 1 | 2 | 3 | 4 | 5;
export type OccasionId = 'everyday' | 'office' | 'college' | 'date' | 'wedding' | 'travel';
export type Warmth = 'light' | 'medium' | 'warm';

export interface Item {
  id: string;
  kind: Kind;
  category: Category;
  name: string;
  /** `#rrggbb`, lower case */
  color: string;
  pattern: Pattern;
  formality: Formality;
  photoId: string;
  createdAt: string;
}

export type NewItem = Omit<Item, 'id' | 'photoId' | 'createdAt'>;
export type ItemPatch = Partial<Pick<Item, 'name' | 'category' | 'color' | 'pattern' | 'formality'>>;

export interface Favorite {
  id: string;
  topId: string;
  bottomId: string;
  createdAt: string;
}

export interface WearEntry {
  id: string;
  /** null when the item has since been deleted */
  topId: string | null;
  bottomId: string | null;
  /** `YYYY-MM-DD` in the user's local time */
  date: string;
  occasion: OccasionId;
  createdAt: string;
}

export type NewWearEntry = Pick<WearEntry, 'topId' | 'bottomId' | 'date' | 'occasion'>;

export interface Place {
  name: string;
  latitude: number;
  longitude: number;
}

export interface Forecast {
  /** `YYYY-MM-DD` */
  date: string;
  maxC: number;
  minC: number;
  precipitationChance: number;
  weatherCode: number;
}

export interface WeatherCache {
  key: string;
  fetchedAt: number;
  forecast: Forecast;
}

/** Synced per user. The weather cache is per device and lives with the weather client. */
export interface Settings {
  location: Place | null;
}
