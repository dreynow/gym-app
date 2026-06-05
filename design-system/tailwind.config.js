/* ==========================================================================
   RACK — Tailwind v3 config (ALTERNATIVE to handoff/theme.css)
   ----------------------------------------------------------------------------
   Use THIS only if your project is on Tailwind v3. It aliases utilities to the
   CSS variables defined in your tokens file, so colors_and_type.css (copied to
   src/styles/tokens.css and imported once) stays the single source of truth.
   Change a value in tokens.css -> every utility updates. No duplicated hexes.

   If you are on Tailwind v4, delete this file and use handoff/theme.css instead.
   ========================================================================== */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        void: "var(--color-void, #060607)",
        bg: "var(--bg)",
        surface: {
          1: "var(--surface-1)",
          2: "var(--surface-2)",
          3: "var(--surface-3)",
          4: "var(--surface-4)",
        },
        fg: {
          1: "var(--fg-1)",
          2: "var(--fg-2)",
          3: "var(--fg-3)",
          4: "var(--fg-4)",
        },
        line: {
          1: "var(--line-1)",
          2: "var(--line-2)",
          3: "var(--line-3)",
        },
        volt: {
          DEFAULT: "var(--volt)",
          bright: "var(--volt-bright)",
          deep: "var(--volt-deep)",
          dim: "var(--volt-dim)",
          ghost: "var(--volt-ghost)",
          line: "var(--volt-line)",
        },
        "on-volt": "var(--on-volt)",
        success: { DEFAULT: "var(--success)", ghost: "var(--success-ghost)" },
        warning: { DEFAULT: "var(--warning)", ghost: "var(--warning-ghost)" },
        danger: { DEFAULT: "var(--danger)", ghost: "var(--danger-ghost)" },
        info: { DEFAULT: "var(--info)", ghost: "var(--info-ghost)" },
      },
      fontFamily: {
        sans: "var(--font-sans)",
        mono: "var(--font-mono)",
      },
      fontSize: {
        "3xs": "var(--text-3xs)",
        "2xs": "var(--text-2xs)",
        xs: "var(--text-xs)",
        sm: "var(--text-sm)",
        md: "var(--text-md)",
        base: "var(--text-md)",
        lg: "var(--text-lg)",
        xl: "var(--text-xl)",
        "2xl": "var(--text-2xl)",
        "3xl": "var(--text-3xl)",
        "4xl": "var(--text-4xl)",
        "5xl": "var(--text-5xl)",
        "6xl": "var(--text-6xl)",
      },
      borderRadius: {
        xs: "var(--r-xs)",
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
        "2xl": "var(--r-2xl)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        glow: "var(--glow-volt)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
        spring: "var(--ease-spring)",
      },
    },
  },
  plugins: [],
};
