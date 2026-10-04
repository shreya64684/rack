import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IndexedDbRepository } from '@/lib/storage/indexeddb';
import { NotFoundError } from '@/lib/storage';
import { loadSampleWardrobe } from '@/lib/sample/wardrobe';
import type { NewItem } from '@/lib/domain/types';

const shirt: NewItem = { kind: 'top', category: 'shirt', name: 'Navy oxford shirt', color: '#1F2A44', pattern: 'solid', formality: 3 };
const chinos: NewItem = { kind: 'bottom', category: 'chinos', name: 'Camel chinos', color: '#b7895a', pattern: 'solid', formality: 3 };
const photo = () => new Blob(['x'], { type: 'image/jpeg' });

let repo: IndexedDbRepository;
let n = 0;

beforeEach(() => {
  // A fresh database per test.
  repo = new IndexedDbRepository(`rack-test-${++n}`);
  let u = 0;
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => `blob:test/${++u}`, revokeObjectURL: vi.fn() }));
});

describe('IndexedDbRepository', () => {
  it('adds, lists (newest first), updates and normalises colour', async () => {
    const a = await repo.addItem(shirt, photo());
    await new Promise((r) => setTimeout(r, 2));
    const b = await repo.addItem(chinos, photo());
    expect(a.color).toBe('#1f2a44');
    expect((await repo.listItems()).map((i) => i.id)).toEqual([b.id, a.id]);

    const updated = await repo.updateItem(a.id, { name: 'Work shirt', formality: 4 });
    expect(updated).toMatchObject({ name: 'Work shirt', formality: 4, category: 'shirt' });
    await expect(repo.updateItem('missing', { name: 'x' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('serves photos as cached object URLs', async () => {
    const a = await repo.addItem(shirt, photo());
    const url = await repo.getPhotoUrl(a.photoId);
    expect(url).toMatch(/^blob:/);
    expect(await repo.getPhotoUrl(a.photoId)).toBe(url);
    await expect(repo.getPhotoUrl('nope')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('AC-14: favourites are idempotent and removable', async () => {
    const top = await repo.addItem(shirt, photo());
    const bottom = await repo.addItem(chinos, photo());
    const fav = await repo.addFavorite(top.id, bottom.id);
    await repo.addFavorite(top.id, bottom.id);
    expect(await repo.listFavorites()).toHaveLength(1);
    await repo.removeFavorite(fav.id);
    expect(await repo.listFavorites()).toHaveLength(0);
  });

  it('AC-15: the wear log lists newest first and entries can be deleted', async () => {
    const top = await repo.addItem(shirt, photo());
    const bottom = await repo.addItem(chinos, photo());
    await repo.logWear({ topId: top.id, bottomId: bottom.id, date: '2026-09-30', occasion: 'office' });
    const latest = await repo.logWear({ topId: top.id, bottomId: bottom.id, date: '2026-10-04', occasion: 'date' });
    const log = await repo.listWearLog();
    expect(log.map((e) => e.date)).toEqual(['2026-10-04', '2026-09-30']);
    expect(log[0]).toMatchObject({ occasion: 'date' });
    await repo.deleteWear(latest.id);
    expect(await repo.listWearLog()).toHaveLength(1);
  });

  it('AC-3 / EC-10: deleting an item drops its favourites and photo but keeps the diary', async () => {
    const top = await repo.addItem(shirt, photo());
    const bottom = await repo.addItem(chinos, photo());
    await repo.addFavorite(top.id, bottom.id);
    await repo.logWear({ topId: top.id, bottomId: bottom.id, date: '2026-10-01', occasion: 'office' });

    await repo.deleteItem(top.id);

    expect((await repo.listItems()).map((i) => i.id)).toEqual([bottom.id]);
    expect(await repo.listFavorites()).toHaveLength(0);
    const [entry] = await repo.listWearLog();
    expect(entry).toMatchObject({ topId: null, bottomId: bottom.id });
    await expect(repo.getPhotoUrl(top.photoId)).rejects.toBeInstanceOf(NotFoundError);
    await repo.deleteItem('already-gone'); // no throw

    // Deleting the bottom too leaves a diary entry with no pieces, found via the wear index.
    await repo.deleteItem(bottom.id);
    expect((await repo.listWearLog())[0]).toMatchObject({ topId: null, bottomId: null });
  });

  it('persists settings with partial updates', async () => {
    expect(await repo.getSettings()).toEqual({ location: null });
    const place = { name: 'Pune', latitude: 18.52, longitude: 73.86 };
    await repo.saveSettings({ location: place });
    expect(await repo.getSettings()).toEqual({ location: place });
  });

  it('AC-4: the sample wardrobe has at least 6 tops and 5 bottoms, each with a photo', async () => {
    await loadSampleWardrobe(repo);
    const items = await repo.listItems();
    expect(items.filter((i) => i.kind === 'top').length).toBeGreaterThanOrEqual(6);
    expect(items.filter((i) => i.kind === 'bottom').length).toBeGreaterThanOrEqual(5);
    for (const i of items) await expect(repo.getPhotoUrl(i.photoId)).resolves.toMatch(/^blob:/);
  });
});

describe('ids outside a secure context', () => {
  it('still generates v4 uuids when crypto.randomUUID is unavailable (plain-http LAN testing)', async () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      const r = new IndexedDbRepository(`rack-insecure-${Date.now()}`);
      const a = await r.addItem(shirt, photo());
      const b = await r.addItem(chinos, photo());
      expect(a.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(a.id).not.toBe(b.id);
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true });
    }
  });
});
