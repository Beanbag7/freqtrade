import path from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const OUT_DIR = "../freqtrade/rpc/api_server/ui/installed";

// The production build is emitted directly into the freqtrade API server's
// UI directory, so `freqtrade trade` / `freqtrade webserver` serves this UI.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "write-uiversion",
      // /ui_version 读 installed/.uiversion;不写则恒报 not_installed。
      // 前缀 mist-ink- 与 freqUI 的日期型发布版本永不相等,不影响
      // install-ui 的 up-to-date 比对逻辑。
      closeBundle() {
        const pkg = JSON.parse(readFileSync(path.join(__dirname, "package.json"), "utf-8")) as {
          version: string;
        };
        writeFileSync(path.resolve(__dirname, OUT_DIR, ".uiversion"), `mist-ink-${pkg.version}`);
      },
    },
  ],
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
