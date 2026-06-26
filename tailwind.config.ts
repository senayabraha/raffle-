import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "SF Pro Display",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        // Deep obsidian base — never pure black
        obsidian: {
          DEFAULT: "#09090b",
          50: "#18181b",
          100: "#141417",
          200: "#101013",
          300: "#0c0c0f",
          400: "#09090b",
          500: "#060608",
        },
        // Single striking accent — Electric Violet
        accent: {
          DEFAULT: "#8b5cf6",
          soft: "#a78bfa",
          deep: "#7c3aed",
          glow: "#c4b5fd",
        },
        // Semantic, theme-aware tokens (flip between light/dark via the
        // `.dark` class on <html>). Defined as RGB channels in index.css so
        // Tailwind's `/<alpha>` opacity modifiers keep working.
        app: "rgb(var(--bg) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          2: "rgb(var(--surface-2) / <alpha-value>)",
        },
        line: "rgb(var(--line) / <alpha-value>)",
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          muted: "rgb(var(--ink-muted) / <alpha-value>)",
          subtle: "rgb(var(--ink-subtle) / <alpha-value>)",
        },
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      letterSpacing: {
        tightest: "-0.045em",
      },
      boxShadow: {
        glass: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 40px -12px rgba(0,0,0,0.6)",
        "accent-glow": "0 0 0 1px rgba(139,92,246,0.4), 0 8px 30px -6px rgba(139,92,246,0.45)",
        "soft-lift": "0 24px 60px -18px rgba(0,0,0,0.7)",
      },
      backgroundImage: {
        "accent-gradient": "linear-gradient(135deg, #a78bfa 0%, #8b5cf6 45%, #6d28d9 100%)",
        "text-gradient": "linear-gradient(120deg, #ffffff 0%, #d8d4ff 45%, #a78bfa 100%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        // Translate-only drift: avoids animating `scale`, which would force the
        // compositor to re-rasterize the large blurred blobs every frame.
        aurora: {
          "0%, 100%": { transform: "translate(0px, 0px)" },
          "33%": { transform: "translate(40px, -30px)" },
          "66%": { transform: "translate(-30px, 20px)" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(139,92,246,0.45)" },
          "70%": { boxShadow: "0 0 0 10px rgba(139,92,246,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(139,92,246,0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fade-in 0.8s ease-out both",
        shimmer: "shimmer 1.8s infinite",
        aurora: "aurora 18s ease-in-out infinite",
        "pulse-ring": "pulse-ring 2.4s cubic-bezier(0.4,0,0.6,1) infinite",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
