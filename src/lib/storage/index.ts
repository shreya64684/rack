import { IndexedDbRepository } from './indexeddb';
import type { WardrobeRepository } from './repository';

export * from './repository';

/**
 * The single place that picks a storage backend. To move to Supabase, return a
 * `SupabaseRepository` here when `NEXT_PUBLIC_STORAGE === 'supabase'` (see MIGRATION.md).
 */
export function createRepository(): WardrobeRepository {
  return new IndexedDbRepository();
}
