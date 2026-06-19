import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand uses rgb channels so opacity modifiers (bg-brand/10) work.
        brand: {
          DEFAULT: "rgb(var(--brand) / <alpha-value>)",
          dark: "rgb(var(--brand-dark) / <alpha-value>)",
        },
        // Semantic surface/text tokens, theme-driven via CSS variables.
        app: "var(--app)",
        surface: "var(--surface)",
        subtle: "var(--subtle)",
        line: "var(--line)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        // status text colors (theme-adaptive)
        pos: "var(--pos)",
        neg: "var(--neg)",
        warn: "var(--warn)",
      },
    },
  },
  plugins: [],
};

export default config;
