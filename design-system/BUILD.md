# Rack — Build Handoff (design system to code)

This doc tells an engineer (or Claude Code) how to build the Rack app so it **matches the design system exactly**, without re-typing token values. Read it alongside the root `README.md` (the brand) and `ui_kits/app/` (the reference renders).

> **Golden rule:** the design tokens are the single source of truth. The app should *consume* them, never re-declare hexes/sizes. The UI kit is a picture to match — match its layout and feel, but write your own Tailwind + Dexie components. `tokens` win for visual values; the codebase wins for behavior.

---

## 1. Wire up the tokens (pick ONE path)

**Tailwind v4 (recommended, modern default):**
1. Copy `handoff/theme.css` into `src/theme.css`.
2. In `src/index.css`:
   ```css
   @import "tailwindcss";
   @import "./theme.css";
   ```
3. Done. You now have `bg-surface-1`, `text-fg-2`, `font-mono`, `rounded-lg`, `shadow-glow`, etc., **and** `var(--color-*)` for anything Tailwind can't express.

**Tailwind v3 (fallback):**
1. Copy the design system's `colors_and_type.css` to `src/styles/tokens.css`, and change the 7 `@font-face` `url("fonts/...")` to `url("/fonts/...")`.
2. `@import "./styles/tokens.css";` once (before Tailwind directives).
3. Use `handoff/tailwind.config.js` — its utilities alias the CSS vars in that file.

**Fonts (both paths):** copy the seven `fonts/*.woff2` into `public/fonts/`. They are served at `/fonts/...`. (You already have Geist Regular/Medium/SemiBold/Bold and Geist Mono Regular/Medium/SemiBold — enough for the whole UI.)

**Icons:** `npm i lucide-react`. Import per-icon: `import { Dumbbell, Plus, Check, Timer } from "lucide-react"`. Stroke only, never filled.

---

## 2. Token cheat-sheet (utility ← meaning)

| Use it for | Tailwind | CSS var |
|---|---|---|
| App background | `bg-bg` | `--color-bg` `#0B0B0D` |
| Card / sheet | `bg-surface-1` | `--color-surface-1` |
| Input / elevated row | `bg-surface-2` | `--color-surface-2` |
| Hover surface | `bg-surface-3` | |
| Primary text / heading | `text-fg-1` | `#F5F5F6` |
| Secondary text | `text-fg-2` | |
| Caption / placeholder | `text-fg-3` | |
| Hairline border | `border border-line-2` | `rgba(255,255,255,.1)` |
| **Action / active / PR** | `bg-volt text-on-volt` | `--color-volt` `#D6FF3F` |
| Accent text (low glare) | `text-volt-dim` | |
| Active row tint | `bg-volt-ghost` | 12% volt |
| Numerals (weights/reps/timer) | `font-mono tabular-nums` | `--font-mono` |
| Button / input radius | `rounded-md` (12px) | |
| Card radius | `rounded-lg` (16px) | |
| Pills (chips, toggles) | `rounded-full` | |
| Spacing | default scale (`p-4`=16px) | matches Rack's 4px base |

Type: prefer the semantic classes `.t-h1 / .t-h2 / .t-h3 / .t-body / .t-label / .t-num` (defined in the theme file) for consistency; reach for `text-*` utilities for one-offs.

---

## 3. Component to code map

Build these as React components in `src/components/`. Lift the **markup structure and classes** from the matching `ui_kits/app/*.jsx` file — but back them with real Dexie state. (The kit's `kit.css` shows the exact spacing/states if you'd rather translate CSS to utilities.)

| Component | Kit reference | Tailwind sketch |
|---|---|---|
| **Primary button** | `primitives.jsx` `Button` | `h-12 px-5 rounded-md bg-volt text-on-volt font-semibold inline-flex items-center gap-2 active:scale-[.97]` |
| **Secondary button** | same | `bg-surface-2 text-fg-1 border border-line-2 hover:bg-surface-3` |
| **Card** | `kit.css .rk-card` | `bg-surface-1 border border-line-2 rounded-lg p-4` |
| **Chip / filter** | `Chip` | `rounded-full px-3 py-2 text-[12.5px] border border-line-2 bg-surface-2 data-[active]:bg-volt-ghost data-[active]:text-volt data-[active]:border-volt-line` |
| **Set-type tag** | `SetTag` | uppercase `text-2xs tracking-[.07em] px-2 py-1 rounded-[6px]`; working=`bg-surface-3 text-fg-2`, warmup=`bg-warning-ghost text-warning`, drop=`bg-info-ghost text-info` |
| **PR badge** | `PRBadge` | `bg-volt text-on-volt rounded-full px-2.5 py-1 text-[11px] inline-flex gap-1.5` |
| **Set row** | `ActiveWorkout.jsx` `SetRow` | grid `30px 1fr 1fr 46px`; cells `font-mono font-semibold text-[17px]`; done state -> `bg-volt-ghost border-volt-line`; check -> `bg-volt text-on-volt` |
| **Rest timer** | `RestTimer` | fixed bar `bg-surface-1 border border-line-3 rounded-xl shadow-lg`; conic-gradient ring for progress; mono time |
| **Bottom nav** | `app.jsx` `BottomNav` | `bg-bg/80 backdrop-blur border-t border-line-2`; active item `text-volt`; center start FAB `bg-volt rounded-[17px] shadow-glow -mt-5` |
| **Stat tile** | `screens-home.jsx` `StatTile` | `bg-surface-1 border border-line-2 rounded-lg p-3.5`; value `font-mono font-semibold text-[26px]` |
| **Line chart** | `LineChart` | replace the cosmetic SVG with **Recharts** in the real app; keep the same colors (`--color-volt` line, `--color-info` for bodyweight, `--color-data-grid` grid) |

The **Active Workout** screen (`ActiveWorkout.jsx`) is the spec for the core loop: last-session numbers inline under every cell, tap-check marks done + auto-adds the next set + starts the rest timer. Reproduce that interaction faithfully — it's the heart of the product.

---

## 4. Non-negotiable conventions

- **Volt is an accent, not a theme.** Most pixels are charcoal + gray. Volt only marks action / active / records.
- **Numerals are Geist Mono, tabular** (`font-mono tabular-nums`) so set rows don't jitter as values change. UI text is Geist Sans, **sentence case**. Uppercase tracked labels only for tiny structural tags (`WORKING`, `PR`, eyebrows).
- **No em dashes in UI copy.** Ranges read "5 to 7". Sets read `80kg × 7`. e1RM abbreviates "estimated 1RM". Units lowercase (`kg`, `cm`, `s`).
- **No emoji as icons.** Lucide only, stroke style, 16/20/24px.
- **Dark only** in v1. Depth = surface ladder + translucent hairlines, not heavy shadows. The one expressive shadow is `shadow-glow` on the primary CTA.
- **Tap targets ≥ 44px.** Mobile-first, content capped ~440px wide, 64px bottom nav.
- Respect `prefers-reduced-motion`; keep entrance animations to short opacity/translate fades (`--ease-out-rack`), no infinite loops.

---

## 5. Suggested build order (from the brief)

Scaffold Vite + React + TS + Tailwind, wire tokens (section 1), then:
1. Dexie schema + seed (routines/exercises from `ui_kits/app/data.jsx`).
2. Routines list + editor → 3. Active Workout (set logging, last-session, auto-next) → 4. Rest timer → 5. Plate calculator → 6. Exercise library → 7. History + detail → 8. Progress charts (Recharts, Epley e1RM) → 9. Bodyweight/waist → 10. PR detection.
11. PWA (vite-plugin-pwa, verify offline) → 12. JSON export/import.

`data.jsx` already contains the exact seed: 25 exercises with muscle/equipment, the 4 routines (Lower A / Upper A / Lower B / Upper B) with sets and rep ranges, and `e1rm()` = Epley.

---

## 6. Keeping in sync

Design changes happen in the design-system project. The only file that needs to travel back to the app repo is the **token file** (`theme.css` / `tokens.css`) plus any new assets. Copy it over and commit. Everything else is behavior that lives in code.
