import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      // `server-only` throws outside a server bundle; tests run in plain node, so it is stubbed (next build still enforces it).
      'server-only': path.resolve(import.meta.dirname, 'src/server/testing/serverOnly.ts'),
    },
  },
  // Every index test boots an embedded Postgres (WebAssembly); with a dozen files in parallel that takes seconds, not milliseconds.
  test: { testTimeout: 30_000, hookTimeout: 60_000, include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'engine/**/*.test.ts', 'cli/**/*.test.mjs', 'gitlab/**/*.test.mjs'], environment: 'node' },
});
