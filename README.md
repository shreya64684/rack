# Rack

Rack is a personal lookbook. Photograph your tops and bottoms, and it reads each colour in your browser. It then builds outfits for everyday wear and five occasions (office, college, date night, wedding guest, travel), taking today's weather and what you wore recently into account. It also tells you which single piece would unlock the most new outfits.

Everything stays in your browser (IndexedDB). There are no accounts, no API keys and no paid services. Weather comes from Open-Meteo, which needs no key.

## Setup

Requires Node 20.9+ (built and tested on Node 24).

```bash
npm install
npm run dev          # http://localhost:3000
```

Then press **Load sample wardrobe**, or **Add your first piece** to upload a photo.

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build && npm start` | Production build and server (every route is static) |
| `npm test` | Unit, integration and UI tests (Vitest, 79 tests) |
| `npm run coverage` | Same, with coverage. The engine and colour modules must stay ≥ 90% |
| `npm run e2e` | Playwright end-to-end and axe accessibility tests (builds and serves on port 3124) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |

`npm run e2e` uses your installed Google Chrome (`channel: 'chrome'` in [playwright.config.ts](playwright.config.ts)). Without Chrome, run `npx playwright install chromium` and remove that line.

## Where things are

- [SPEC.md](SPEC.md): requirements and acceptance criteria. Tests reference them as `AC-n` and `EC-n`.
- [ARCHITECTURE.md](ARCHITECTURE.md): layers, data flow, ADRs and the ERD.
- [DECISIONS.md](DECISIONS.md): every call made along the way.
- [MIGRATION.md](MIGRATION.md) and [supabase/schema.sql](supabase/schema.sql): moving to Supabase (auth, Postgres, storage).
- `src/lib/engine`: the rule-based outfit engine (colour harmony, pattern clash, formality, occasion, weather, recency) and the gap finder.
- `src/lib/storage`: the `WardrobeRepository` interface and its IndexedDB implementation.

## Not verified

- **Supabase.** `supabase/schema.sql` has never been run. I had no Postgres or Supabase project, and Docker Desktop wasn't running. The `SupabaseRepository` in MIGRATION.md is a written plan, not tested code.
- **Live Open-Meteo.** Tests stub every forecast and geocoding response, so the real endpoints were never called. The request shape follows Open-Meteo's documented API.
- **Browser geolocation ("Use my location").** It needs a permission prompt that headless runs can't answer. The city-search path is tested instead.
- **Real garment photos.** Colour extraction was tested on synthetic images, such as a red rectangle on white, and on generated PNGs in Chrome. I had no actual photos of clothes, so busy backgrounds, shadows and lighting are untested.
- **Camera capture ("Take photo")** and HEIC photos from iPhones. These were not tried on a real phone. HEIC only works where the browser can decode it (Safari).
- **Other browsers.** Tested in Chrome only, at desktop and 360px phone widths. Firefox and Safari, including Safari's IndexedDB in private mode, were not run.
- **Screen readers.** Automated axe checks (WCAG 2.2 A/AA) and keyboard-only tests pass. No manual pass with NVDA or VoiceOver.
- **Storage quota errors** (EC-9). The error message is in place, but a full disk was never simulated.
- **`npm audit`** reports 5 high-severity advisories in ESLint's dev-only dependency chain. They don't reach the shipped app. See DECISIONS D-032.
