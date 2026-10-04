# Switching Rack from IndexedDB to Supabase

Rack reads and writes everything through one interface, `WardrobeRepository`, defined in [src/lib/storage/repository.ts](src/lib/storage/repository.ts). Exactly one function picks the implementation: `createRepository()` in [src/lib/storage/index.ts](src/lib/storage/index.ts). Switching backends means writing one class and changing that one function. No page or component changes (a test enforces this, `tests/architecture.test.ts`).

## 1. Create the database

1. Create a free Supabase project.
2. Open **SQL Editor**, paste [supabase/schema.sql](supabase/schema.sql), and run it. This creates the `items`, `favorites`, `wear_log` and `user_settings` tables, the private `wardrobe-photos` storage bucket, and owner-only row-level security on all of them.
3. In **Authentication → Providers**, turn on Email (magic link) or any provider you want.

## 2. Add the client

```bash
npm i @supabase/supabase-js
```

`.env.local`:

```
NEXT_PUBLIC_STORAGE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

The anon key is meant to be public. RLS is what protects the data.

## 3. Implement `SupabaseRepository`

Create `src/lib/storage/supabase.ts` implementing `WardrobeRepository`. The mapping:

| Interface method | Supabase call |
|---|---|
| `listItems()` | `from('items').select('*').order('created_at', { ascending: false })` |
| `addItem(input, photo)` | `storage.from('wardrobe-photos').upload(\`${uid}/${crypto.randomUUID()}.jpg\`, photo)`, then `from('items').insert({...input, photo_path})`. The bucket accepts only JPEG, WebP and PNG, on purpose: user-uploaded SVG can carry script. Uploaded photos are already JPEG. The sample wardrobe's SVG flats must be rasterised first: draw them onto a canvas through an `<img>`, then `canvas.toBlob('image/png')`. |
| `updateItem(id, patch)` | `from('items').update(patch).eq('id', id).select().single()`. Throw `NotFoundError` when no row comes back. |
| `deleteItem(id)` | Read `photo_path`, `from('items').delete().eq('id', id)`, then `storage.remove([photo_path])`. Favourites cascade and wear-log refs become null in the database. |
| `getPhotoUrl(photoId)` | `storage.from('wardrobe-photos').createSignedUrl(photoId, 3600)`. Cache the URL for about 55 minutes. |
| `listFavorites / addFavorite / removeFavorite` | `favorites` table, keyed by `(user_id, top_id, bottom_id)`. Map each row's `id` to `lookId(top_id, bottom_id)` from `src/lib/domain/naming.ts`, because the UI looks favourites up by that id. `addFavorite` is `upsert(..., { onConflict: 'user_id,top_id,bottom_id', ignoreDuplicates: true })`. `removeFavorite(id)` splits the id on `__` and deletes `eq('top_id', a).eq('bottom_id', b)`. |
| `listWearLog / logWear / deleteWear` | `wear_log` table, ordered by `worn_on desc, created_at desc` |
| `getSettings / saveSettings` | `location` in `user_settings` (upsert on `user_id`). That is the only synced setting. The forecast cache already lives in `localStorage` through the weather client. |

Map snake_case columns to the camelCase domain types (`photo_path` → `photoId`, `worn_on` → `date`, `top_id` → `topId`, …) in one `toItem` / `toWear` helper each.

Errors: map Supabase `PGRST116` (no rows) to `NotFoundError`, and storage `413` or quota responses to `QuotaError`.

## 4. Flip the factory

```ts
// src/lib/storage/index.ts
export function createRepository(): WardrobeRepository {
  if (process.env.NEXT_PUBLIC_STORAGE === 'supabase') return new SupabaseRepository(createClient(url, anonKey));
  return new IndexedDbRepository();
}
```

## 5. Sign-in

The repository requires a session. Add a small `/sign-in` page with `supabase.auth.signInWithOtp`. Then, in `AppShell`, render the existing app only when `supabase.auth.getSession()` returns a user. This is the only UI addition, and it lives outside the repository boundary.

## 6. Move existing local data (optional)

To carry over a closet from IndexedDB, add a one-off "Upload my closet" action that does the following, then clears the local database:

1. Read everything from `new IndexedDbRepository()`.
2. Write it into the `SupabaseRepository`. Upload each photo blob, insert the items, and remap old ids to new ids for favourites and the wear log.

## 7. Verify

- Run the repository contract tests against the new class. `tests/integration/indexeddb.test.ts` is written against the interface: copy it and swap the constructor for a Supabase test project.
- `npm run e2e` must pass unchanged.
