# Decisions

Choices made while building Rack without stopping for approval, newest concerns last. Each one says what was chosen and why. ADRs with more depth are in [ARCHITECTURE.md](ARCHITECTURE.md).

## Process

- **D-001 Spec self-approved.** The spec-driven-workflow skill requires an approved spec before code. The brief said not to stop, so I marked [SPEC.md](SPEC.md) "Approved (self-approved)". It scores 98/100 on the skill's validator. The one remaining warning asks for an HTTP `METHOD /path` contract; the app has no HTTP API of its own, and the two external GET endpoints are listed instead.
- **D-002 Skills' "forcing questions" answered from the brief, not asked.** senior-fullstack, senior-frontend and senior-backend want team size, budget, SLOs and so on before recommending anything. I answered them myself: one developer, personal use, mobile-first, client-only, no PII leaves the device, $0 budget. That points to a static client-rendered Next.js app.
- **D-003 Skill tools that didn't fit were run, then worked around.** The database-designer schema analyzer couldn't parse Supabase DDL (`default auth.uid()`). It saw one column per table, so I drew the ERD by hand in ARCHITECTURE.md. The a11y scanner's per-file landmark warnings were false positives: `<main>`, the skip link and `<nav>` live once in `AppShell`. I backed it up with axe-core running in a real browser instead (see D-030).

## Product

- **D-010 Name and visual direction: "Rack", a lookbook, not a dashboard.**
  - **Palette:** Calico `#eceee8` (cool unbleached cotton, deliberately not the usual cream), Indigo ink `#1d2242`, Tailor's-chalk pink `#f2b8c6`, used only as fills for selected states and the swing tag.
  - **Type:** one family, Archivo, using its width axis. Expanded (wdth 125) for display, like fashion-house labels; normal width for text.
  - **The one bold move:** a huge "Look 01" next to the top stacked over the bottom like a flat-lay, with a tilted pink swing tag holding the "why it works" notes. "Look 01" numbering is legitimate because looks really are ranked.
  - **Closet:** a clothes rail with hangers that scrolls sideways.
  - **Motion:** one moment only. The top drops in and the bottom rises when the hero look changes. It is off under `prefers-reduced-motion`.
  - **Avoided on purpose:** cream with terracotta, all-caps eyebrows, card shadows, gradients, fade-in on scroll.
- **D-011 Sample photos are technical flats.** Real-feeling sample content is needed, but stock photos would need licensing and a network. The sample wardrobe is instead drawn as SVG "tech pack" flats in each piece's colour and pattern, with real names ("Navy oxford shirt", "Indigo block-print kurta", "Navy floral midi skirt").
- **D-012 A 5-point formality scale** (Lounge, Casual, Smart casual, Business, Formal) with occasion ranges: Everyday 1–3, Office 3–4, College 1–3, Date night 3–4, Wedding guest 4–5, Travel 1–3. One level outside the range is allowed with a warning; two levels is rejected.
- **D-013 Hard rules vs soft scores.**
  - **Hard rejections:** discordant colours, clashing patterns, a formality gap of 3 or more, out-of-range formality, occasion bans (shorts at office or wedding, graphic prints at office or wedding, all-white at a wedding, joggers on a date), and the exact look worn in the last 14 days.
  - **Weighted score:** colour 45%, pattern 25%, formality 30%.
  - **Adjustments to the score:** weather (±), and pieces worn in the last 2 days (−12 each).
  - **Why:** only hard rules can make a look disappear, so users never wonder where a look went. Everything else re-ranks.
- **D-014 Neutrals follow styling convention, not pure colour science.** Blacks, whites and greys, dark low-chroma shades (navy, charcoal), beige through cream, and blue jeans all count as neutrals. The jeans rule is catalogue data (`neutralHues`), not engine code.
- **D-015 Gap finder candidates.** Every category in a curated palette of 10 basics, with jeans getting their own washes, as solid fabric at the category's default formality. A candidate counts when it makes a valid look for at least one occasion. I keep the best colour per category so the three suggestions are different kinds of piece, and skip anything within a set colour distance of a piece already owned.
- **D-016 Colour extraction.** Downsample to 64px, estimate the backdrop from the border, drop pixels close to it, weight toward the centre, and take the heaviest colour bin. Colour names use the nearest of 32 wardrobe colour words by CIELAB distance; a redmean distance mis-named dark grey as "Chocolate", which a test caught. The user can always override the colour.
- **D-017 Out of scope, kept out.** Dresses, outerwear, shoes, multiple colours per item, ML. See SPEC §Out of Scope.

## Architecture

- **D-020 Client-only and static.** Every route is prerendered as a static shell with client components, and there are no API routes. It can be hosted on any static host.
- **D-021 `WardrobeRepository` is the only storage door.** It is async throughout, and photos are reached through `getPhotoUrl` (a `blob:` URL now, a signed URL later). One factory names the implementation, and a test fails if UI code imports IndexedDB.
- **D-022 `idb` over Dexie.** About 1 kB and promise-based. The schema is five stores. The favourites and wear-log stores are indexed by top and by bottom, so deleting a piece never scans the whole diary.
- **D-023 The weather cache is per device** (`localStorage`), not a synced setting. Only the chosen city is synced. The cache is also tied to the forecast's date, so yesterday's forecast is never shown after midnight.
- **D-024 No Supabase implementation in the repo.** The brief asked for the schema and a migration guide. A Supabase class I couldn't run against a real project would be untested code. MIGRATION.md maps every interface method to a Supabase call instead.
- **D-025 Supabase favourites are keyed by the pair** `(user_id, top_id, bottom_id)` to match the app's `lookId`. The photo bucket allows only JPEG, WebP and PNG, never SVG, so the sample flats must be rasterised before upload (documented).
- **D-026 Dark mode is not provided.** A lookbook printed on calico is the identity; the tokens are defined once.

## Quality

- **D-030 Testing layers.**
  - **Vitest unit tests:** the engine, colour extraction, gaps and weather.
  - **Vitest integration tests:** the real IndexedDB repository on `fake-indexeddb`.
  - **Vitest UI tests:** React Testing Library on jsdom.
  - **Playwright end-to-end tests** in system Chrome at desktop and 360px phone widths:
    - axe-core WCAG 2.2 A/AA checks on every page;
    - keyboard-only navigation;
    - a real PNG upload to check colour extraction and downscaling;
    - stubbed Open-Meteo responses.
- **D-031 Scale budgets are enforced by tests.** 100×100 pairs in under 200 ms, and the gap finder on 50+50 pieces in under 500 ms.
- **D-032 `npm audit` reports 5 high-severity advisories**, all in ESLint's dev-only dependency chain (`braces` via `eslint-config-next`). The only fix npm offers downgrades Next's ESLint config to v14, so I left them. Nothing in the shipped bundle is affected.
- **D-033 Changes made in the cleanup and review passes.**
  - **Simplify:**
    - Every rule module now returns its own typed notes. Before this, "loud contrast" and "triadic" warnings showed as positives.
    - The occasion and jeans special cases moved into catalogue data.
    - Loading is handled once in `AppShell`.
    - Shared `.pill`, `.label`, `.link-btn` and `.page-title` classes.
    - The hero look is chosen by id, not list position.
    - Photos no longer re-render on every change.
    - The weather cache moved out of the repository.
  - **Code review:**
    - error states for sample loading, deleting and opening storage;
    - a double-save guard;
    - the date-aware forecast cache;
    - the Supabase favourite key.
  - **Skipped:**
    - thumbnail generation, a new photo pipeline (photos are already ≤1200px and lazy-loaded);
    - building notes only for displayed looks (the time budget already passes);
    - parallel sample loading (it would scramble the order).
- **D-034 Run pass.** Driving the real app showed that a newly added piece was hidden off the left edge of the closet rail: scroll-snap re-snapped to the old first piece. I removed snapping, and an end-to-end test now asserts the new piece is in view.
