import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // maplibre-gl alone is ~1 MB; nothing to split yet.
  build: { chunkSizeWarningLimit: 1500 },
});
