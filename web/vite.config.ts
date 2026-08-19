// `defineConfig` must come from vitest/config: imported from "vite", the `test`
// key below is a type error and `npm run typecheck` fails.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // This file is ESM, so __dirname does not exist.
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  server: {
    port: 5173,
    // The API has no CORS enabled, on purpose. Proxying keeps the browser on a
    // single origin, which is also how a deployed build would be served.
    proxy: { "/api": { target: "http://localhost:3000" } },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
