import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// The production build is emitted directly into the freqtrade API server's
// UI directory, so `freqtrade trade` / `freqtrade webserver` serves this UI.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: "./",
  server: {
    port: 3000,
    proxy: {
      "/api": {
        // Local freqtrade API (user_data/config.json uses 8081; override via env).
        target: process.env.FREQTRADE_API_URL ?? "http://127.0.0.1:8081",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: "../freqtrade/rpc/api_server/ui/installed",
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
  },
});
