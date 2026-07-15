import { defineConfig } from "vitest/config";

// Standalone config so vitest doesn't load vite.config.ts (which wires up the
// Cloudflare dev proxy and Remix plugin — unnecessary for pure unit tests).
export default defineConfig({
  test: {
    include: ["app/**/*.test.ts"],
  },
});
