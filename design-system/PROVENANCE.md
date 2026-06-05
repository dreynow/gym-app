# Rack design system (vendored)

These are the Rack design-system handoff files, kept here for provenance and
sync. The live tokens the app consumes are vendored at `src/theme.css`
(Tailwind v4 CSS-first theme), imported by `src/index.css`. The Geist woff2
fonts are served from `public/fonts/`.

To update the design later: replace `src/theme.css` with the new
`handoff/theme.css` from the design-system project, drop any new fonts into
`public/fonts/`, and copy the new docs here.

All seven Geist weights are present in `public/fonts/`: Geist Sans 400/500/600/700
and Geist Mono 400/500/600.
