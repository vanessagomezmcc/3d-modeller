import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the build works on Vercel, Netlify, and GitHub Pages
// subpaths without any extra configuration.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1200,
  },
});
