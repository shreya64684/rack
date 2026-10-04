import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Favorite, Item, ItemPatch, NewItem, NewWearEntry, Settings, WearEntry } from '../domain/types';
import { lookId } from '../domain/naming';
import {
  byCreatedDesc,
  byNewest,
  DEFAULT_SETTINGS,
  NotFoundError,
  QuotaError,
  StorageUnavailableError,
  type WardrobeRepository,
} from './repository';

interface RackDB extends DBSchema {
  items: { key: string; value: Item };
  photos: { key: string; value: { id: string; blob: Blob } };
  favorites: { key: string; value: Favorite; indexes: { byTop: string; byBottom: string } };
  wear: { key: string; value: WearEntry; indexes: { byTop: string; byBottom: string } };
  settings: { key: string; value: Settings & { id: 'me' } };
}

const DB_NAME = 'rack';
const DB_VERSION = 1;

/** `randomUUID` only exists on HTTPS/localhost; `getRandomValues` works everywhere (e.g. testing over LAN http). */
function uuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
const now = () => new Date().toISOString();

function rethrow(err: unknown): never {
  if (err instanceof DOMException && err.name === 'QuotaExceededError') throw new QuotaError();
  throw err;
}

export class IndexedDbRepository implements WardrobeRepository {
  private db: Promise<IDBPDatabase<RackDB>> | null = null;
  private urls = new Map<string, string>();

  constructor(private readonly name = DB_NAME) {}

  private open(): Promise<IDBPDatabase<RackDB>> {
    if (typeof indexedDB === 'undefined') return Promise.reject(new StorageUnavailableError());
    this.db ??= openDB<RackDB>(this.name, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('items', { keyPath: 'id' });
        db.createObjectStore('photos', { keyPath: 'id' });
        // Favourites and the diary are indexed by piece so deleting an item never scans a whole store.
        for (const name of ['favorites', 'wear'] as const) {
          const store = db.createObjectStore(name, { keyPath: 'id' });
          store.createIndex('byTop', 'topId');
          store.createIndex('byBottom', 'bottomId');
        }
        db.createObjectStore('settings', { keyPath: 'id' });
      },
    }).catch(() => {
      this.db = null;
      throw new StorageUnavailableError();
    });
    return this.db;
  }

  async listItems(): Promise<Item[]> {
    const items = await (await this.open()).getAll('items');
    return items.sort(byCreatedDesc);
  }

  async addItem(input: NewItem, photo: Blob): Promise<Item> {
    const db = await this.open();
    const item: Item = { ...input, color: input.color.toLowerCase(), id: uuid(), photoId: uuid(), createdAt: now() };
    const tx = db.transaction(['items', 'photos'], 'readwrite');
    try {
      await Promise.all([
        tx.objectStore('photos').put({ id: item.photoId, blob: photo }),
        tx.objectStore('items').put(item),
        tx.done,
      ]);
    } catch (err) {
      rethrow(err);
    }
    return item;
  }

  async updateItem(id: string, patch: ItemPatch): Promise<Item> {
    const db = await this.open();
    const tx = db.transaction('items', 'readwrite');
    const current = await tx.store.get(id);
    if (!current) {
      tx.abort();
      await tx.done.catch(() => undefined);
      throw new NotFoundError('Item');
    }
    const next: Item = { ...current, ...patch, color: (patch.color ?? current.color).toLowerCase() };
    await Promise.all([tx.store.put(next), tx.done]);
    return next;
  }

  async deleteItem(id: string): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(['items', 'photos', 'favorites', 'wear'], 'readwrite');
    const item = await tx.objectStore('items').get(id);
    if (item) {
      const favs = tx.objectStore('favorites');
      const wear = tx.objectStore('wear');
      const [favTop, favBottom, wornTop, wornBottom] = await Promise.all([
        favs.index('byTop').getAllKeys(id),
        favs.index('byBottom').getAllKeys(id),
        wear.index('byTop').getAll(id),
        wear.index('byBottom').getAll(id),
      ]);
      // Requests queue on the transaction; tx.done settles once all of them have.
      void tx.objectStore('items').delete(id);
      void tx.objectStore('photos').delete(item.photoId);
      for (const key of [...favTop, ...favBottom]) void favs.delete(key);
      // Keep the diary, drop the reference (FR-6, EC-10).
      for (const entry of [...wornTop, ...wornBottom]) {
        void wear.put({
          ...entry,
          topId: entry.topId === id ? null : entry.topId,
          bottomId: entry.bottomId === id ? null : entry.bottomId,
        });
      }
    }
    await tx.done;
    if (item) this.revoke(item.photoId);
  }

  async getPhotoUrl(photoId: string): Promise<string> {
    const cached = this.urls.get(photoId);
    if (cached) return cached;
    const record = await (await this.open()).get('photos', photoId);
    if (!record) throw new NotFoundError('Photo');
    const url = URL.createObjectURL(record.blob);
    this.urls.set(photoId, url);
    return url;
  }

  private revoke(photoId: string) {
    const url = this.urls.get(photoId);
    if (url) URL.revokeObjectURL(url);
    this.urls.delete(photoId);
  }

  async listFavorites(): Promise<Favorite[]> {
    const favs = await (await this.open()).getAll('favorites');
    return favs.sort(byCreatedDesc);
  }

  async addFavorite(topId: string, bottomId: string): Promise<Favorite> {
    const db = await this.open();
    const id = lookId(topId, bottomId);
    const existing = await db.get('favorites', id);
    if (existing) return existing;
    const fav: Favorite = { id, topId, bottomId, createdAt: now() };
    await db.put('favorites', fav);
    return fav;
  }

  async removeFavorite(id: string): Promise<void> {
    await (await this.open()).delete('favorites', id);
  }

  async listWearLog(): Promise<WearEntry[]> {
    return (await (await this.open()).getAll('wear')).sort(byNewest);
  }

  async logWear(entry: NewWearEntry): Promise<WearEntry> {
    const record: WearEntry = { ...entry, id: uuid(), createdAt: now() };
    await (await this.open()).put('wear', record).catch(rethrow);
    return record;
  }

  async deleteWear(id: string): Promise<void> {
    await (await this.open()).delete('wear', id);
  }

  async getSettings(): Promise<Settings> {
    const record = await (await this.open()).get('settings', 'me');
    if (!record) return { ...DEFAULT_SETTINGS };
    return { location: record.location };
  }

  async saveSettings(patch: Partial<Settings>): Promise<Settings> {
    const next = { ...(await this.getSettings()), ...patch };
    await (await this.open()).put('settings', { ...next, id: 'me' });
    return next;
  }
}
