# Rack — Design System

**Rack** is a local-first, offline-first strength-training tracker (a personal, single-user PWA in the spirit of Hevy). You build reusable routines, log sets fast at the gym, always see *last session's numbers to beat*, rest on a timer, and watch estimated 1RM, volume, and bodyweight trend over time. All data lives on-device; no account, no subscription, no backend.

This repository is the **design system** that powers Rack's interface and any marketing/throwaway assets: the brand, color + type foundations, fonts, iconography guidance, reusable CSS tokens, and a high-fidelity UI kit of the core app screens.

> **Mood:** premium & restrained, athletic, modern. Near-black charcoal surfaces, subtle grays, and a single confident accent — **volt lime (`#D6FF3F`)** — reserved for action, "active," and personal records. Think Whoop / Nike Training restraint, not neon-everything.

---

## Sources & provenance

This design system was created to support building the Rack workout tracker described in the project brief. Notes on inputs:

- **`dreynow/gym-app`** — the GitHub repo attached as the intended codebase was **empty** (no commits) at the time of creation, so there was no existing UI or token set to extract. The brand below was therefore designed **from scratch** against the product brief and the user's stated direction (volt-lime accent, clean neutral sans, premium/restrained, near-black). If/when that repo fills in, reconcile these tokens against it.
  Repo: <https://github.com/dreynow/gym-app>
- **Fonts:** [Geist](https://github.com/vercel/geist-font) (Sans + Mono) by Vercel — imported directly from `vercel/geist-font`. Geist is also published on Google Fonts, so you can load it from a CDN when self-hosting isn't convenient.
- **Icons:** [Lucide](https://lucide.dev) — linked from CDN (see ICONOGRAPHY). No bespoke icon set existed to copy.

To go deeper on the product itself, explore the `dreynow/gym-app` repository (once populated) and Hevy as a reference experience. The brief also references the Hevy app as the model for the core logging loop.

---

## CONTENT FUNDAMENTALS — how Rack talks

Rack's voice is a **calm, confident training partner**: direct, encouraging, never hype. Copy stays out of the way so logging is fast.

- **Person:** Address the user as **"you"**; the app refers to itself rarely and never in first person. Stats are framed around *your* numbers ("Beat your last," "Your best").
- **Tone:** Plainspoken and motivating, not bro-y, not clinical. Short imperative verbs for actions: **Start workout, Add set, Finish, Log it, Skip rest.**
- **Casing:** **Sentence case** for everything conversational (buttons, headers, body): "Start workout", "Rest timer", "Add exercise". **UPPERCASE + letter-spacing** only for tiny structural labels and tags (`WORKING`, `WARMUP`, `PR`, section eyebrows like `TODAY`). Never Title Case sentences.
- **Punctuation:** **No em dashes anywhere in UI text.** Use commas, colons, or parentheses instead ("Rest (90s)", "8 to 10 reps", "Last time: 80kg x 7"). Ranges are written "5 to 7", not "5–7".
- **Numbers & units:** Lowercase units attached or spaced consistently: `80kg`, `7 reps`, `90s`, `1,240kg` volume. Use `x` (lowercase) for set notation: `80kg x 7`. Estimated one-rep max abbreviates to **e1RM**. Bodyweight and waist in `kg` / `cm`.
- **Encouragement, earned:** Celebration is reserved and specific — a PR badge, "New e1RM", "Top set" — never confetti spam. One genuine moment beats ten fake ones.
- **Emoji:** **None in product UI.** Meaning is carried by Lucide icons, the volt accent, and type. (A single barbell glyph in the logo is the brand, not decoration.)
- **Empty states:** Helpful and action-forward, not cute: "No workouts yet. Start one from a routine, or go blank." 

**Examples**
- Button: `Start workout` · `Add set` · `Finish workout` · `+15s` · `Skip`
- Inline reference: `Last time: 80kg x 7, 8, 7`
- Label/tag: `WORKING` · `WARMUP` · `DROP` · `PR` · `e1RM`
- Toast: `New e1RM on Back Squat: 142kg`
- Empty: `No routines yet. Create one to start logging.`

---

## VISUAL FOUNDATIONS

The system is **dark by default and dark by design** — there is no light theme in v1. Depth comes from a charcoal surface ladder + translucent white hairlines, not from drop shadows. The accent does the talking.

### Color
- **Surfaces** climb a ladder from the app void `#060607` → background `#0B0B0D` → cards `#141417` → inputs `#1B1B1F` → hover `#242429` → active `#2E2E34`. Elevation = a lighter surface + a brighter hairline, *not* a big shadow.
- **Foreground** is a 4-step gray ramp (`#F5F5F6` → `#ADADB5` → `#76767F` → `#4D4D55`) — primary, secondary, tertiary, disabled. We almost never use pure white.
- **Accent (volt lime `#D6FF3F`)** is rationed: primary buttons, the "done" set check, active nav item, progress lines, and PR moments. On surfaces, prefer the dimmer `--volt-dim` for accent *text* to cut glare; reserve full volt for fills and key marks. A faint `--volt-ghost` tint fills active rows.
- **Semantics are muted** and used only when meaning demands it: success green, warning amber, danger coral, info blue — each with a 12%-alpha "ghost" fill. They never compete with volt for attention.

### Type
- **Geist** for everything UI (400/500/600/700). Clean, neutral, modern grotesque — quiet enough to disappear, sharp enough to feel premium.
- **Geist Mono** for **all numerals that matter**: weights, reps, timers, volume, e1RM, chart axes. Tabular figures (`tnum`) keep set rows from jittering as numbers change. This mono/sans split is the core typographic signature — data reads as *data*.
- **Tracking** tightens as size grows (display/stat are `-0.02em`); tiny uppercase labels open up to `0.08em`. Line-height 1.05 on big stats, ~1.45 on body.

### Spacing, radius, layout
- **4px spacing base.** Screens are mobile-first, capped at `--app-max: 440px`, with a **64px bottom nav** and generous thumb-reach padding.
- **Radii are moderate, not pill-everything:** inputs/buttons `12px`, cards `16px`, sheets `20–28px`, only true pills (chips, the timer ring, toggles) go fully round. This restraint is what reads "premium" vs "toy."
- **Tap targets ≥ 44px.** The active-workout screen is optimized ruthlessly for one-handed speed.

### Elevation, borders, depth
- **Borders carry the structure:** `rgba(255,255,255,0.06)` hairlines by default, `0.10` on cards/inputs, `0.16` on hover/focus. 
- **Shadows are subtle and only for floating things** (sheets, the rest-timer bar, menus). The one expressive shadow is `--glow-volt`: a soft volt halo on the primary CTA / focus, used sparingly.

### Backgrounds & texture
- Flat charcoal, **no photographic backgrounds, no busy patterns.** The only permitted "richness" is a barely-there diagonal charcoal gradient on hero/app-icon panels (`#1B1B1F → #0B0B0D`) and the volt-ghost tint on active elements. No grain, no noise, no glassmorphism overload — occasional `backdrop-blur` only on the sticky bottom action bar / sheets.

### Motion
- **Quick and physical.** `--dur-fast 120ms` for taps, `--dur-base 200ms` for most transitions, `--ease-out` (`cubic-bezier(.22,1,.36,1)`) as the default. A gentle `--ease-spring` for the set-complete check and the rest-timer appearing. No long, decorative, or infinite-loop animations in the product. Respect `prefers-reduced-motion`.

### Interaction states
- **Hover (desktop/preview):** surface steps one rung lighter (`surface-2 → surface-3`); border brightens to `--line-3`. Volt buttons go to `--volt-bright`.
- **Press / active:** a subtle **scale-down to ~0.97** plus a darker fill (`--volt-deep` for volt). Tactile, fast.
- **Selected/active:** volt-ghost fill + volt text/icon, or a 2px volt left-edge/underline on nav.
- **Focus:** `--line-3` ring, or `--glow-volt` on primary actions. Always visible for accessibility.
- **Disabled:** `--fg-4` text on flat surface, no border brighten, 0 motion.

### Cards
Cards are `--surface-1` with a `--line-2` hairline, `16px` radius, `--shadow-sm` (often none), and `16–20px` internal padding. Elevated/active cards lift to `--surface-2` and a brighter border rather than a heavy shadow.

---

## ICONOGRAPHY

Rack uses **[Lucide](https://lucide.dev)** — an open, MIT-licensed line-icon set with a consistent **2px stroke**, rounded joins, and a geometric, neutral personality that matches Geist and the premium-restrained mood.

- **Delivery:** linked from CDN (no bespoke icons existed to copy). In HTML cards and the UI kit:
  ```html
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
  <!-- use <i data-lucide="dumbbell"></i> then lucide.createIcons() -->
  ```
  For the production React app, install `lucide-react`.
- **Style rules:** stroke icons only (never filled), `1.75–2px` stroke, sized on a 4px grid (16 / 20 / 24px). Icon color follows the foreground ramp (`--fg-2` default, `--fg-1` active, `--volt` only when the icon *is* the action/active state).
- **Core glyphs:** `dumbbell`, `plus`, `check`, `timer` / `alarm-clock`, `play`, `square` (finish), `history`, `line-chart` / `trending-up`, `list`, `search`, `settings`, `chevron-right`, `more-horizontal`, `flame` (streak), `trophy` / `medal` (PR), `weight`, `repeat` (sets), `download` / `upload` (JSON backup).
- **No emoji** as UI icons, ever. **No unicode-glyph icons.** The only non-Lucide mark is the **Rack barbell logo** (`assets/rack-mark.svg`), which is brand, not iconography.
- **Substitution flag:** Lucide is a chosen default (there was no existing icon set in the source repo). If you later standardize on a different set, swap it globally and update this section.

**Brand assets** (in `assets/`):
- `rack-mark.svg` — the barbell glyph (volt on transparent).
- `rack-wordmark.svg` — mark + "RACK" lockup for headers.
- `rack-icon.svg` — rounded-square app icon (volt glyph on charcoal), PWA/home-screen ready.

---

## Index — what's in this system

| Path | What it is |
|---|---|
| `README.md` | This file — brand, content + visual foundations, iconography, index. |
| `colors_and_type.css` | **Single source of truth** for color, type, spacing, radius, elevation, motion tokens + semantic type classes. Import everywhere. |
| `fonts/` | Geist Sans (400/500/600/700) + Geist Mono (400/500/600) woff2 files. |
| `assets/` | Logo mark, wordmark, app icon. |
| `preview/` | Small HTML spec cards rendered in the Design System tab (colors, type, spacing, components). |
| `ui_kits/app/` | High-fidelity, click-through recreation of the Rack mobile app (core screens + reusable JSX components). See its own README. |
| `handoff/` | **Engineer/Claude-Code handoff**: `theme.css` (Tailwind v4 token theme), `tailwind.config.js` (v3 alternative), and `BUILD.md` (token cheat-sheet + component-to-code map + build order). |
| `SKILL.md` | Agent-Skill manifest so this system can be used directly in Claude Code. |

### Using the tokens
```html
<link rel="stylesheet" href="colors_and_type.css">
<div style="background:var(--surface-1); border:1px solid var(--line-2); border-radius:var(--r-lg); padding:var(--space-5)">
  <span class="t-label">WORKING</span>
  <span class="t-num" style="font-size:var(--text-2xl)">80<span style="color:var(--fg-3)">kg</span> × 7</span>
</div>
```

---

*Brand designed from the product brief — the source repo was empty. Treat the volt accent, charcoal ladder, and Geist mono/sans split as the load-bearing decisions; everything else is tunable.*
