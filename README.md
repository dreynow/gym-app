# Rack — Personal Workout Tracker

A local-first, offline-first strength training tracker, modelled on the fast
logging loop of Hevy but kept lean and single user. No account, no backend, no
subscription. All data lives on your device in IndexedDB, and the whole thing
installs as a PWA so it works at the gym with no signal.

## Features (MVP)

1. **Routines / templates** — create, edit, reorder, and delete reusable
   routines (fully dynamic, add or remove any time). Seeded with an Upper /
   Lower split.
2. **Fast workout logging** — start from a routine or blank, log weight, reps,
   RPE, and set type (warmup / working / drop / failure). Completing a set
   auto-creates the next one, pre-filled with your last numbers.
3. **Beat your last session** — every set shows the matching set from the last
   time you did that exercise, inline, so you always know what to beat.
4. **Rest timer** — auto-starts when you tick a set done, with one-tap ±15s and
   skip, a conic progress ring, and a buzz when it ends.
5. **Plate calculator** — enter a target and bar weight, see the plates to load
   per side (inventory configurable in Settings).
6. **Exercise library** — searchable, filterable by muscle group, with custom
   exercises and archiving.
7. **History** — every finished session with duration, volume, and PR badges;
   tap for the full breakdown.
8. **Progress charts** — per exercise: estimated 1RM, top set, and volume over
   time, with selectable date range.
9. **Bodyweight + waist** — log measurements and chart the trend; the weight
   line uses a rolling 7-day average.
10. **Personal records** — heaviest weight, best estimated 1RM, and best volume
    are detected and badged automatically.

Estimated 1RM uses the Epley formula: `weight × (1 + reps / 30)`.

## Data is yours

Settings → **Export backup (JSON)** downloads everything. **Import backup**
restores it on any device, with *merge* or *replace* modes. Storage is always
in kilograms internally; switching to pounds only changes the display.

## Tech

React + TypeScript + Vite, Tailwind CSS v4, Dexie (IndexedDB), `vite-plugin-pwa`
for offline/installability, Recharts for charts, and `lucide-react` for icons.
Navigation is a tiny built-in hash router (no router dependency). State for the
active workout lives in a React context; everything else reads IndexedDB
reactively via Dexie live queries.

## Design system (Rack)

The UI follows the **Rack** design system: dark, premium, athletic, with a
single rationed volt-lime accent on a charcoal surface ladder, Geist Sans for UI
and Geist Mono for all numerals. The tokens are vendored as a Tailwind v4
CSS-first theme at `src/theme.css` (imported by `src/index.css`); never
re-declare hexes in components, consume the tokens (`bg-surface-1`, `text-fg-2`,
`bg-volt`, `font-mono`, `rounded-lg`, `shadow-glow`, ...). The original handoff
docs are kept under `design-system/` for provenance, and the Geist `.woff2`
fonts are served from `public/fonts/`. See `design-system/BUILD.md`.

## Run with Docker (no Node required)

If you don't want to install Node/npm, just use Docker Desktop. The build runs
inside the container, so nothing but Docker is needed on your machine:

```bash
docker compose up --build
```

Then open **http://localhost:8080**. Stop it with Ctrl+C (or `docker compose
down`). To rebuild after pulling changes, run the same command again.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

```bash
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build locally
```

The PWA service worker is only active in the production build (`build` +
`preview`), not in dev. To test offline: run `npm run build && npm run preview`,
open the app, then kill the network — it keeps working, and you can install it
to your home screen.

## Deploy (free options)

The app is a static site. Build with `npm run build` and host the `dist/`
folder. Because it uses a hash router, no special SPA rewrite rules are needed.

- **Netlify**: drag-and-drop `dist/`, or connect the repo with build command
  `npm run build` and publish directory `dist`.
- **Vercel**: framework preset “Vite”, output directory `dist`.
- **GitHub Pages**: push `dist/` to a `gh-pages` branch (e.g. via the
  `gh-pages` action). If hosting under `https://user.github.io/repo/`, set
  `base: '/repo/'` in `vite.config.ts` before building.
- **Or just install the PWA** from `npm run preview` on your network.

## Project layout

```
src/
  db/         Dexie database, domain types, seed data, repository (CRUD)
  lib/        calculations (1RM, volume, plates), PR detection, backup,
              formatting, the hash router
  hooks/      reactive Dexie-backed hooks (settings, exercises, last session…)
  context/    active-workout state + rest timer
  components/ reusable UI (sheets, pickers, plate calculator, the workout card…)
  screens/    one file per screen (Train, Workout, History, Progress, Body,
              Library, Settings, and the routine / session detail views)
```

## Apple Health import

Rack can fold in Apple Watch data without any native app or account. On your
iPhone: Health app, tap your photo, then **Export All Health Data**; unzip the
result and, in Rack, go Settings, **Import from Apple Health**, and pick
`export.xml`. It is parsed locally (streamed, never DOM-loaded, so even a
multi-hundred-MB export is fine) and merged non-destructively:

- Per workout, the average and max heart rate and active calories attach to the
  Rack session they overlap in time, shown on the session detail.
- Bodyweight records flow into the Body log, one per day, skipping dates you
  already have.

A future upgrade path (live HealthKit sync via a Capacitor wrapper) can reuse
the same data fields.

## Testing

- **Unit** (`npm test`): Vitest over the pure logic, no browser, no DB. Covers
  Epley 1RM, set/volume maths, the plate calculator, PR detection, and the
  Apple Health parser/matcher.
- **End to end** (`npm run test:e2e`): Playwright drives the real app in a
  headless browser across every screen, the full logging loop, charts, settings,
  and the Apple Health import. Both suites also run in CI on every push.

## Roadmap hooks (phase 2)

The data model already supports these without a rewrite: double-progression
suggestions from a routine's rep range, weekly working-set volume per muscle
group, a calendar / streak view, and optional cloud sync (the persisted objects
are plain and serialisable, so they can ship over the wire as-is).
