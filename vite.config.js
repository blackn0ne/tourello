import { defineConfig } from "vite";

/* Relative base so the build works both at the domain root and under /<repo>/ on GitHub Pages. */
export default defineConfig({
  base: "./",
  build: { target: "es2020", chunkSizeWarningLimit: 1500 }
});
