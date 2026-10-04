import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(p) ? [p] : [];
  });

describe('architecture boundaries (FR-20)', () => {
  it('AC-18: no UI file imports the IndexedDB implementation or idb directly', () => {
    const ui = [...walk('src/app'), ...walk('src/components')];
    const offenders = ui.filter((f) => /from ['"](@\/lib\/storage\/indexeddb|idb)['"]/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('only the storage factory names the concrete repository', () => {
    const offenders = walk('src')
      .filter((f) => !f.includes(join('lib', 'storage')))
      .filter((f) => /IndexedDbRepository/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('the engine and colour modules stay free of DOM and storage', () => {
    const pure = [...walk('src/lib/engine'), 'src/lib/color/color.ts', 'src/lib/color/extract.ts'];
    for (const f of pure) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/document\.|window\.|indexedDB|from ['"]react['"]|storage/);
    }
  });
});

describe('storage factory', () => {
  it('returns a WardrobeRepository (IndexedDB in v1)', async () => {
    const { createRepository } = await import('@/lib/storage');
    const repo = createRepository();
    for (const m of ['listItems', 'addItem', 'updateItem', 'deleteItem', 'getPhotoUrl', 'listFavorites', 'addFavorite', 'removeFavorite', 'listWearLog', 'logWear', 'deleteWear', 'getSettings', 'saveSettings']) {
      expect(typeof (repo as unknown as Record<string, unknown>)[m]).toBe('function');
    }
  });
});
