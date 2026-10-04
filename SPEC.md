# SPEC — Rack: a personal lookbook & outfit engine

**Author:** Claude (on behalf of Shreya)  
**Date:** 2026-10-04  
**Status:** Approved (self-approved — the brief asked for no approval stops; see DECISIONS.md D-001)  
**Reviewers:** Owner (post-hoc)

---

## Context

People own more clothes than they wear because putting together combinations each morning is tedious, and the same three outfits get repeated. Most outfit apps either need a paid account, send photos to a server, or rely on opaque AI recommendations that the user cannot reason about.

**Rack** is a browser-only wardrobe app. The user photographs their tops and bottoms. The app reads the dominant colour from each photo in the browser, the user tags type, pattern and formality, and a transparent rule-based engine (colour harmony, pattern clash, formality match) proposes combinations for everyday wear and five occasions. It remembers favourites, logs what was worn so recent looks aren't repeated, considers today's weather (Open-Meteo, keyless), and tells the user which single purchase would unlock the most new outfits.

Version 1 keeps everything in IndexedDB with no accounts. All persistence goes through one `WardrobeRepository` interface so a Supabase backend (auth + Postgres + Storage) can be swapped in later without UI changes.

Success = a new user can load the sample wardrobe or add 3 photos and see a dressed, explained outfit for a chosen occasion within 2 minutes, with no sign-up.

---

## Functional Requirements

### Wardrobe items
- FR-1: The app MUST let the user add an item by choosing a photo file (JPEG, PNG, WebP, HEIC if the browser can decode it) or by taking one with the device camera (`capture` attribute).
- FR-2: The app MUST extract the dominant colour of the garment from the photo entirely in the browser, ignoring background pixels that match the image border, and pre-fill it.
- FR-3: The user MUST be able to override the extracted colour with a colour picker.
- FR-4: The user MUST pick: kind (top / bottom), category (from a fixed list per kind), pattern (solid, stripes, checks, floral, print, graphic) and formality (1 Lounge … 5 Formal). The user MAY give the item a name; otherwise one MUST be generated (e.g. "Navy shirt").
- FR-5: The app MUST downscale photos to at most 1200px on the longest side before storing them.
- FR-6: The user MUST be able to view all items, filter by kind, edit an item's tags/colour/name, and delete an item. Deleting an item MUST also remove its favourites; wear-log entries MUST be kept but shown as "item removed".
- FR-7: An empty wardrobe MUST offer a one-click "Load sample wardrobe" with realistic named sample pieces.

### Outfit engine
- FR-8: The engine MUST score every top × bottom pair for a given occasion and return them sorted by score, highest first, each with human-readable reasons.
- FR-9: Colour harmony MUST classify each pair as neutral-pairing, tonal, analogous, complementary, triadic or discordant from HSL values, treating blacks/whites/greys, beige/camel and denim-blue bottoms as neutrals. Discordant pairs (score < 40) MUST be rejected.
- FR-10: Pattern rules MUST reject two "busy" patterns together (checks, floral, print, graphic), any two identical non-solid patterns, and graphic with any non-solid pattern. Stripes with one busy pattern MUST be allowed with a penalty.
- FR-11: Formality rules MUST reject pairs whose formality differs by 3 or more and pairs where either item falls more than 1 level outside the occasion's range; closer matches MUST score higher.
- FR-12: Occasions MUST be: Everyday (1–3), Office (3–4), College (1–3), Date night (3–4), Wedding guest (4–5), Travel (1–3). Occasion-specific hard rules: no shorts at Office or Wedding guest; no graphic pattern at Office or Wedding guest; no all-white outfit at Wedding guest; no joggers at Date night.
- FR-13: When weather is known, the engine MUST penalise warm items (sweater, hoodie) when the day's max ≥ 26 °C, penalise light items (tank, shorts) when max ≤ 12 °C, boost seasonally appropriate items, and penalise very light-coloured bottoms when precipitation probability ≥ 50%.
- FR-14: The engine MUST exclude any exact top+bottom combination worn in the last 14 days and MUST penalise any single item worn in the last 2 days.

### Favourites & wear log
- FR-15: The user MUST be able to favourite/unfavourite an outfit (top+bottom pair) and see a list of favourites.
- FR-16: The user MUST be able to mark an outfit "Wore this today" (optionally another date) with the occasion; the log MUST be listed newest first and entries MUST be deletable.

### Weather
- FR-17: The app MUST fetch today's forecast from Open-Meteo (`api.open-meteo.com`, no key) using browser geolocation, or a city the user searches via Open-Meteo geocoding. The chosen location MUST persist.
- FR-18: The forecast MUST be cached for 60 minutes per location.

### Gap finder
- FR-19: The app MUST compute, from a fixed catalogue of candidate basics (every category × a curated palette, solid, default formality), the single item that would create the most new valid outfits (valid for at least one occasion) with the current wardrobe, skipping candidates that duplicate an existing item (same category, similar colour). It MUST show the winner, the number of outfits it unlocks, and the next two runners-up.

### Storage abstraction
- FR-20: All reads/writes of items, photos, favourites, wear log and settings MUST go through the `WardrobeRepository` interface; UI components MUST NOT import IndexedDB code directly.
- FR-21: The repo MUST ship a Supabase SQL schema (`supabase/schema.sql`) with row-level security and a MIGRATION.md explaining the switch.

---

## Non-Functional Requirements

- **NFR-1 Performance** Scoring 100 tops × 100 bottoms for one occasion MUST complete in < 200 ms in Node (measured in a unit test). Gap finder over a 50+50 wardrobe MUST complete in < 500 ms.
- **NFR-2 Privacy** Photos MUST NOT leave the device. The only network calls are Open-Meteo forecast/geocoding and Google Fonts at build time.
- **NFR-3 Accessibility** WCAG 2.2 AA: all interactive controls keyboard-reachable with visible focus, text contrast ≥ 4.5:1, every photo has alt text, form fields labelled, motion respects `prefers-reduced-motion`.
- **NFR-4 Testability** Engine, colour extraction and gap finder MUST be pure TypeScript modules with ≥ 90% line coverage. The IndexedDB repository MUST be tested with `fake-indexeddb`.
- **NFR-5 Cost** No paid services, no API keys.
- **NFR-6 Responsiveness** Usable at 360px width; no horizontal scroll.

---

## Acceptance Criteria

### AC-1: (FR-1, FR-2, FR-5)
Given a 3000×4000 photo of a red tee on a white background, when it is added, then the stored photo's longest side is ≤ 1200px and the pre-filled colour is a red hue (0–20° or 340–360°), not white.

### AC-2: (FR-3, FR-4)
Given the add form, when the user saves without a name and picks category "shirt" and colour navy, then the item is saved with name "Navy shirt".

### AC-3: (FR-6)
Given an item that is in a favourite and in the wear log, when it is deleted, then the favourite disappears and the log entry remains, labelled "item removed".

### AC-4: (FR-7)
Given an empty wardrobe, when "Load sample wardrobe" is clicked, then at least 6 tops and 5 bottoms appear with photos.

### AC-5: (FR-8)
Given 2 tops and 2 bottoms that are all compatible, when outfits are generated for Everyday, then 4 outfits are returned sorted by descending score and each has ≥ 1 reason.

### AC-6: (FR-9)
Given a navy top and grey bottom, when it is evaluated, then harmony is "neutral" and accepted; given a saturated orange (30°) top and saturated green (100°) bottom (hue gap 70°, both saturated), then the pair is "discordant" and rejected.

### AC-7: (FR-9)
Given any blue-hued item in category "jeans", when it is evaluated, then it is treated as neutral.

### AC-8: (FR-10)
Given a floral top and checked bottom, when it is evaluated, then rejected; given a striped top and striped bottom, then rejected; given a striped top and floral bottom, then accepted with a penalty; given a solid top and anything, then no pattern penalty.

### AC-9: (FR-11, FR-12)
Given a formality-1 hoodie and formality-5 trousers, when it is evaluated, then rejected; given Office, then a tee (formality 1) is rejected while a shirt (3) with trousers (4) is accepted.

### AC-10: (FR-12)
Given Wedding guest with a white top and white trousers, when it is evaluated, then rejected with reason mentioning white; given Office with shorts, then rejected.

### AC-11: (FR-13)
Given max 30 °C, when it is evaluated, then a sweater outfit scores lower than the same outfit with a tee; given max 8 °C, then a tank outfit scores lower than a sweater outfit.

### AC-12: (FR-13)
Given 70% precipitation, when it is evaluated, then a cream bottom outfit scores lower than an otherwise-identical navy bottom outfit.

### AC-13: (FR-14)
Given a pair worn 5 days ago, when it is evaluated, then it is excluded; given 20 days ago, then it is included; given the top alone worn yesterday, then the outfit is included with a penalty and a reason.

### AC-14: (FR-15)
Given an outfit, when favourited, then it appears on the Saved page; when unfavourited, then it disappears.

### AC-15: (FR-16)
Given an outfit, when "Wore this today" is pressed, then a diary entry with today's date and the occasion appears at the top of the diary.

### AC-16: (FR-17, FR-18)
Given a stored location and a forecast fetched 30 minutes ago, when it is evaluated, then no network call is made; given Open-Meteo returns an error, then suggestions still render with a "weather unavailable" notice.

### AC-17: (FR-19)
Given a wardrobe of 3 colourful patterned tops and no bottoms, when it is evaluated, then the gap finder recommends a bottom that pairs with all 3, reporting 3 outfits unlocked; candidates identical to existing items are never recommended.

### AC-18: (FR-20)
Given the source tree, when it is evaluated, then no file under `src/app` or `src/components` imports from `src/lib/storage/indexeddb`.

### AC-19: (NFR-1)
Given 100×100 generated items, when it is evaluated, then `generateOutfits` completes in < 200 ms.

### AC-21: (FR-21)
Given a fresh Supabase project, when `supabase/schema.sql` is run in the SQL editor, then tables `items`, `photos`-bucket policies, `favorites`, `wear_log` and `settings` exist with RLS enabled and owner-only policies.

### AC-20: (NFR-3)
Given keyboard-only navigation, when it is evaluated, then every page's primary actions are reachable and focus is visible.


---

## Edge Cases

- EC-1: Photo is fully transparent or a single flat colour → extractor returns the flat colour (or mid-grey if fully transparent) instead of crashing.
- EC-2: Photo cannot be decoded (corrupt / unsupported HEIC) → error message, form stays open, nothing saved.
- EC-3: IndexedDB unavailable (private mode in some browsers) → full-page notice explaining storage is unavailable.
- EC-4: Geolocation denied or unavailable → city search is offered; no error loop.
- EC-5: Open-Meteo network error / non-200 / malformed JSON → engine runs without weather; notice shown.
- EC-6: Geocoding returns no results → "No place called X found".
- EC-7: Wardrobe has only tops or only bottoms → outfits page explains what's missing; gap finder still works.
- EC-8: All pairs rejected for an occasion → empty state names the most common rejection reason.
- EC-9: Storage quota exceeded on save → error message suggesting deleting items.
- EC-10: Wear log references a deleted item → entry shows "item removed".
- EC-11: Hue wrap-around: 350° and 10° are 20° apart, not 340°.

---

## API Contracts

```ts
type Kind = 'top' | 'bottom';
type TopCategory = 'tee' | 'tank' | 'shirt' | 'blouse' | 'polo' | 'sweater' | 'hoodie' | 'kurta';
type BottomCategory = 'jeans' | 'trousers' | 'chinos' | 'skirt' | 'shorts' | 'joggers';
type Pattern = 'solid' | 'stripes' | 'checks' | 'floral' | 'print' | 'graphic';
type Formality = 1 | 2 | 3 | 4 | 5;
type OccasionId = 'everyday' | 'office' | 'college' | 'date' | 'wedding' | 'travel';

interface WardrobeRepository {
  listItems(): Promise<Item[]>;
  addItem(input: NewItem, photo: Blob): Promise<Item>;
  updateItem(id: string, patch: ItemPatch): Promise<Item>;   // throws NotFoundError
  deleteItem(id: string): Promise<void>;                      // cascades favourites
  getPhotoUrl(photoId: string): Promise<string>;              // object URL or signed URL
  listFavorites(): Promise<Favorite[]>;
  addFavorite(topId: string, bottomId: string): Promise<Favorite>; // idempotent
  removeFavorite(id: string): Promise<void>;
  listWearLog(): Promise<WearEntry[]>;                         // newest first
  logWear(entry: NewWearEntry): Promise<WearEntry>;
  deleteWear(id: string): Promise<void>;
  getSettings(): Promise<Settings>;
  saveSettings(patch: Partial<Settings>): Promise<Settings>;
}

// Engine (pure)
generateOutfits(tops: Item[], bottoms: Item[], ctx: EngineContext): ScoredOutfit[];
evaluatePair(top: Item, bottom: Item, ctx: EngineContext): Evaluation; // {ok, score, reasons, rejections}
findGaps(items: Item[], opts?): GapSuggestion[];
extractDominantColor(pixels: Uint8ClampedArray, width: number, height: number): string; // hex

// Weather
getForecast(lat: number, lon: number): Promise<Forecast>;     // throws WeatherError
searchPlaces(query: string): Promise<Place[]>;
```

External HTTP calls (both keyless, GET only):

```
GET https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=1
GET https://geocoding-api.open-meteo.com/v1/search?name={query}&count=5&language=en&format=json
```

Errors: `NotFoundError`, `StorageUnavailableError`, `QuotaError`, `WeatherError` — all extend `Error` with a `code` string.

---

## Data Models

**Item**
| Field | Type | Constraints |
|---|---|---|
| id | string (uuid) | PK |
| kind | Kind | required |
| category | TopCategory \| BottomCategory | must match kind |
| name | string | 1–60 chars |
| color | string | `#rrggbb` |
| pattern | Pattern | required |
| formality | 1–5 | required |
| photoId | string | FK → Photo |
| createdAt | ISO string | required |

**Photo** — id (uuid), blob (Blob, ≤1200px), mime.
**Favorite** — id (`${topId}__${bottomId}`), topId, bottomId, createdAt. Unique on pair.
**WearEntry** — id (uuid), topId, bottomId, date (`YYYY-MM-DD`), occasion (OccasionId), createdAt.
**Settings** — location {name, lat, lon} \| null. (The forecast cache {key, fetchedAt, forecast} is per device in `localStorage`, not a synced setting — see ARCHITECTURE ADR-6.)

---

## Out of Scope

- OS-1: Dresses, outerwear, shoes, accessories — v1 models top+bottom pairs only (brief).
- OS-2: Accounts, sync, sharing — deferred to the Supabase migration.
- OS-3: ML/AI background removal or garment recognition — rule-based only, no paid services.
- OS-4: Multi-colour extraction (secondary colours) — one dominant colour per item.
- OS-5: Hourly weather planning, multi-day packing lists.
- OS-6: A shipped, runnable Supabase repository implementation — schema + migration guide only (brief).
- OS-7: Shopping links or product recommendations from retailers.
