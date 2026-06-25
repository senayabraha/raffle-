import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split large, rarely-changing vendor libs into their own chunks so
        // they cache independently of app code and don't bloat any one route.
        // A function (not the object shorthand) is used because the object
        // form matched "react" by package name only — it missed
        // node_modules/react/jsx-runtime.js, which every JSX-compiled file
        // imports, so Rollup's automatic chunker fell back to bundling that
        // shared glue module inside "motion" and dragged framer-motion into
        // every single page's load, including pages with no animation.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("@supabase/supabase-js")) return "supabase";
          if (/node_modules\/(react|react-dom|react-router|scheduler)\//.test(id)) {
            return "react";
          }
        },
      },
    },
  },
});
