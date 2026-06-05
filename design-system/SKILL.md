---
name: rack-design
description: Use this skill to generate well-branded interfaces and assets for Rack, a local-first strength-training tracker (dark, premium, athletic; volt-lime accent on charcoal). Use it for production UI work or throwaway prototypes, mocks, and marketing assets. Contains design guidelines, color + type tokens, Geist fonts, brand assets, and an interactive UI kit of the core app screens.
user-invocable: true
---

# Rack design skill

Rack is a dark-by-default, offline-first workout tracker in the spirit of Hevy. The look is **premium and restrained**: near-black charcoal surfaces, a four-step gray foreground ramp, **Geist Sans** for UI, **Geist Mono** for all numerals (weights, reps, timers, e1RM), and a single rationed accent, **volt lime `#D6FF3F`**, for actions, "active," and personal records.

## Start here
1. Read **`README.md`** — the full brand: content fundamentals (voice, casing, no em dashes), visual foundations (color, type, spacing, elevation, motion, interaction states), and iconography (Lucide).
2. Import the tokens: **`colors_and_type.css`** is the single source of truth for color, type, spacing, radius, shadow, and motion variables plus semantic type classes. Fonts are in **`fonts/`** (self-host) or load Geist from Google Fonts.
3. Brand assets live in **`assets/`** (`rack-mark.svg`, `rack-wordmark.svg`, `rack-icon.svg`).
4. For components and screen patterns, open **`ui_kits/app/`** — an interactive, click-through recreation of the app. Lift its components (`Button`, `Chip`, set rows, rest timer, `LineChart`, bottom nav) and its conventions.
5. Spec cards in **`preview/`** show each foundation/component in isolation.

## How to work
- **Visual artifacts** (slides, mocks, throwaway prototypes): copy the assets and fonts you need into your output folder, link `colors_and_type.css`, and produce static/interactive HTML for the user to view.
- **Production code:** read the rules here and treat the tokens + UI kit as the source of truth to become an expert in the brand, then write real components.

If invoked with no other guidance, ask the user what they want to build or design, ask a few sharp questions (surface, screens, scope, variations), then act as an expert designer who outputs HTML artifacts or production code as the need dictates.

## Non-negotiables
- Volt is an accent, not a theme. Most of the UI is charcoal + gray; volt only marks action/active/records.
- Numerals are Geist Mono, tabular. UI text is Geist Sans, sentence case. Tiny uppercase tracked labels only for structural tags (`WORKING`, `PR`, eyebrows).
- No em dashes in UI copy. Ranges read "5 to 7"; sets read "80kg × 7". No emoji as icons — use Lucide.
- Dark only in v1. Depth comes from the surface ladder + translucent hairlines, not heavy shadows.
