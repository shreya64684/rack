import type {
  Favorite,
  Item,
  ItemPatch,
  NewItem,
  NewWearEntry,
  Settings,
  WearEntry,
} from '../domain/types';

/**
 * The only door to persisted data (FR-20). The UI talks to this interface; IndexedDB today, Supabase later.
 * Every method is async so a network-backed implementation fits without UI changes.
 */
export interface WardrobeRepository {
  listItems(): Promise<Item[]>;
  addItem(input: NewItem, photo: Blob): Promise<Item>;
  /** @throws NotFoundError */
  updateItem(id: string, patch: ItemPatch): Promise<Item>;
  /** Removes the item, its photo and its favourites. Wear-log entries keep a null reference. */
  deleteItem(id: string): Promise<void>;
  /** A URL an `<img>` can load: a `blob:` URL locally, a signed URL from a remote store. */
  getPhotoUrl(photoId: string): Promise<string>;

  listFavorites(): Promise<Favorite[]>;
  /** Idempotent per top+bottom pair. */
  addFavorite(topId: string, bottomId: string): Promise<Favorite>;
  removeFavorite(id: string): Promise<void>;

  /** Newest date first. */
  listWearLog(): Promise<WearEntry[]>;
  logWear(entry: NewWearEntry): Promise<WearEntry>;
  deleteWear(id: string): Promise<void>;

  getSettings(): Promise<Settings>;
  saveSettings(patch: Partial<Settings>): Promise<Settings>;
}

export class RepositoryError extends Error {
  constructor(
    public code: 'NOT_FOUND' | 'STORAGE_UNAVAILABLE' | 'QUOTA',
    message: string,
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export class NotFoundError extends RepositoryError {
  constructor(what: string) {
    super('NOT_FOUND', `${what} not found`);
  }
}

export class StorageUnavailableError extends RepositoryError {
  constructor() {
    super('STORAGE_UNAVAILABLE', 'This browser is not letting Rack save data. Private windows often block storage.');
  }
}

export class QuotaError extends RepositoryError {
  constructor() {
    super('QUOTA', 'Your browser storage is full. Delete a few pieces and try again.');
  }
}

export const DEFAULT_SETTINGS: Settings = { location: null };

export const byCreatedDesc = (a: { createdAt: string }, b: { createdAt: string }) =>
  b.createdAt.localeCompare(a.createdAt);

/** Newest date first, then newest entry first within a day. */
export const byNewest = (a: WearEntry, b: WearEntry) => b.date.localeCompare(a.date) || byCreatedDesc(a, b);
