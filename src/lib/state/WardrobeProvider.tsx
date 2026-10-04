'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { OCCASIONS } from '../domain/catalog';
import { lookId } from '../domain/naming';
import type {
  Favorite,
  Item,
  ItemPatch,
  NewItem,
  NewWearEntry,
  OccasionId,
  Settings,
  WearEntry,
} from '../domain/types';
import { byNewest, createRepository, DEFAULT_SETTINGS, RepositoryError, type WardrobeRepository } from '../storage';
import { loadSampleWardrobe } from '../sample/wardrobe';

type Status = 'loading' | 'ready' | 'unavailable' | 'error';

interface WardrobeState {
  status: Status;
  items: Item[];
  favorites: Favorite[];
  wearLog: WearEntry[];
  settings: Settings;
}

interface WardrobeApi extends WardrobeState {
  occasion: OccasionId;
  setOccasion: (o: OccasionId) => void;
  tops: Item[];
  bottoms: Item[];
  itemById: Map<string, Item>;
  addItem: (input: NewItem, photo: Blob) => Promise<Item>;
  updateItem: (id: string, patch: ItemPatch) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  loadSamples: () => Promise<void>;
  isFavorite: (topId: string, bottomId: string) => boolean;
  toggleFavorite: (topId: string, bottomId: string) => Promise<void>;
  logWear: (entry: NewWearEntry) => Promise<void>;
  deleteWear: (id: string) => Promise<void>;
  saveSettings: (patch: Partial<Settings>) => Promise<void>;
}

const WardrobeContext = createContext<WardrobeApi | null>(null);
/** Separate and stable, so photo components don't re-render on every wardrobe change. */
const RepositoryContext = createContext<WardrobeRepository | null>(null);

const OCCASION_KEY = 'rack:occasion';
const EMPTY: WardrobeState = { status: 'loading', items: [], favorites: [], wearLog: [], settings: DEFAULT_SETTINGS };

async function loadAll(repo: WardrobeRepository): Promise<WardrobeState> {
  try {
    const [items, favorites, wearLog, settings] = await Promise.all([
      repo.listItems(),
      repo.listFavorites(),
      repo.listWearLog(),
      repo.getSettings(),
    ]);
    return { status: 'ready', items, favorites, wearLog, settings };
  } catch (err) {
    const unavailable = err instanceof RepositoryError && err.code === 'STORAGE_UNAVAILABLE';
    return { ...EMPTY, status: unavailable ? 'unavailable' : 'error' };
  }
}

function readSavedOccasion(): OccasionId {
  try {
    const saved = typeof window === 'undefined' ? null : localStorage.getItem(OCCASION_KEY);
    return OCCASIONS.some((o) => o.id === saved) ? (saved as OccasionId) : 'everyday';
  } catch {
    return 'everyday'; // storage blocked
  }
}

export function WardrobeProvider({
  children,
  repository,
}: {
  children: ReactNode;
  /** Injected in tests; the app uses the configured backend. */
  repository?: WardrobeRepository;
}) {
  const [repo] = useState<WardrobeRepository>(() => repository ?? createRepository());
  const [state, setState] = useState<WardrobeState>(EMPTY);
  const [occasion, setOccasionState] = useState<OccasionId>(readSavedOccasion);

  useEffect(() => {
    let live = true;
    loadAll(repo).then((s) => live && setState(s));
    return () => {
      live = false;
    };
  }, [repo]);

  const setOccasion = useCallback((o: OccasionId) => {
    setOccasionState(o);
    try {
      localStorage.setItem(OCCASION_KEY, o);
    } catch {
      /* per-viewer convenience only */
    }
  }, []);

  const addItem = useCallback(
    async (input: NewItem, photo: Blob) => {
      const item = await repo.addItem(input, photo);
      setState((s) => ({ ...s, items: [item, ...s.items] }));
      return item;
    },
    [repo],
  );

  const updateItem = useCallback(
    async (id: string, patch: ItemPatch) => {
      const item = await repo.updateItem(id, patch);
      setState((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? item : i)) }));
    },
    [repo],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      await repo.deleteItem(id);
      // Mirror the repository's cascade locally instead of reloading every store.
      setState((s) => ({
        ...s,
        items: s.items.filter((i) => i.id !== id),
        favorites: s.favorites.filter((f) => f.topId !== id && f.bottomId !== id),
        wearLog: s.wearLog.map((w) =>
          w.topId === id || w.bottomId === id
            ? { ...w, topId: w.topId === id ? null : w.topId, bottomId: w.bottomId === id ? null : w.bottomId }
            : w,
        ),
      }));
    },
    [repo],
  );

  const loadSamples = useCallback(async () => {
    await loadSampleWardrobe(repo);
    setState(await loadAll(repo));
  }, [repo]);

  const favIds = useMemo(() => new Set(state.favorites.map((f) => f.id)), [state.favorites]);
  // Ignores a second click while the first toggle of the same look is still saving.
  const [pendingFavs] = useState(() => new Set<string>());
  const isFavorite = useCallback((topId: string, bottomId: string) => favIds.has(lookId(topId, bottomId)), [favIds]);

  const toggleFavorite = useCallback(
    async (topId: string, bottomId: string) => {
      const id = lookId(topId, bottomId);
      if (pendingFavs.has(id)) return;
      pendingFavs.add(id);
      try {
        if (favIds.has(id)) {
          await repo.removeFavorite(id);
          setState((s) => ({ ...s, favorites: s.favorites.filter((f) => f.id !== id) }));
        } else {
          const fav = await repo.addFavorite(topId, bottomId);
          setState((s) => ({ ...s, favorites: [fav, ...s.favorites.filter((f) => f.id !== fav.id)] }));
        }
      } finally {
        pendingFavs.delete(id);
      }
    },
    [repo, favIds, pendingFavs],
  );

  const logWear = useCallback(
    async (entry: NewWearEntry) => {
      const logged = await repo.logWear(entry);
      setState((s) => ({ ...s, wearLog: [logged, ...s.wearLog].sort(byNewest) }));
    },
    [repo],
  );

  const deleteWear = useCallback(
    async (id: string) => {
      await repo.deleteWear(id);
      setState((s) => ({ ...s, wearLog: s.wearLog.filter((w) => w.id !== id) }));
    },
    [repo],
  );

  const saveSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const settings = await repo.saveSettings(patch);
      setState((s) => ({ ...s, settings }));
    },
    [repo],
  );

  const derived = useMemo(
    () => ({
      tops: state.items.filter((i) => i.kind === 'top'),
      bottoms: state.items.filter((i) => i.kind === 'bottom'),
      itemById: new Map(state.items.map((i) => [i.id, i])),
    }),
    [state.items],
  );

  const api = useMemo<WardrobeApi>(
    () => ({
      ...state,
      ...derived,
      occasion,
      setOccasion,
      addItem,
      updateItem,
      deleteItem,
      loadSamples,
      isFavorite,
      toggleFavorite,
      logWear,
      deleteWear,
      saveSettings,
    }),
    [state, derived, occasion, setOccasion, addItem, updateItem, deleteItem, loadSamples, isFavorite, toggleFavorite, logWear, deleteWear, saveSettings],
  );

  return (
    <RepositoryContext.Provider value={repo}>
      <WardrobeContext.Provider value={api}>{children}</WardrobeContext.Provider>
    </RepositoryContext.Provider>
  );
}

export function useWardrobe(): WardrobeApi {
  const ctx = useContext(WardrobeContext);
  if (!ctx) throw new Error('useWardrobe must be used inside <WardrobeProvider>');
  return ctx;
}

/** Resolve a stored photo to something an <img> can load. */
export function usePhotoUrl(photoId: string | undefined): string | null {
  const repo = useContext(RepositoryContext);
  const [resolved, setResolved] = useState<{ id: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!photoId || !repo) return;
    let live = true;
    repo
      .getPhotoUrl(photoId)
      .then((url) => live && setResolved({ id: photoId, url }))
      .catch(() => live && setResolved({ id: photoId, url: null }));
    return () => {
      live = false;
    };
  }, [photoId, repo]);
  return resolved && resolved.id === photoId ? resolved.url : null;
}

/** `YYYY-MM-DD` in the viewer's local time zone. */
export function localToday(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
