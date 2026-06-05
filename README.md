# Ironlog — Personal Workout Tracker

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
   skip, a draining progress bar, and a buzz when it ends.
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
for offline/installability, and Recharts for charts. Navigation is a tiny
built-in hash router (no router dependency). State for the active workout lives
in a React context; everything else reads IndexedDB reactively via Dexie live
queries.

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

## Roadmap hooks (phase 2)

The data model already supports these without a rewrite: double-progression
suggestions from a routine's rep range, weekly working-set volume per muscle
group, a calendar / streak view, and optional cloud sync (the persisted objects
are plain and serialisable, so they can ship over the wire as-is).
