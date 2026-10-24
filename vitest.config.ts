import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { TIERS, listedFiles, splitTiers, workerCap } from './scripts/test/tiers.mjs';

const include = ['src/**/*.test.ts', 'src/**/*.test.tsx', 'engine/**/*.test.ts', 'runner/**/*.test.ts', 'cli/**/*.test.mjs', 'scripts/**/*.test.mjs', 'gitlab/**/*.test.mjs'];
// Three projects, `unit` / `db` / `spawn`, derived from each test file's text (scripts/test/tiers.mjs), never listed by hand.
const tiers = splitTiers(import.meta.dirname, include, listedFiles());
// A project ignores the CLI's --maxWorkers unless it is handed down, so the cap reads it (4 of 12 cores by default).
const maxWorkers = workerCap();
const resolve = {
  alias: {
    '@': path.resolve(import.meta.dirname, 'src'),
    // `server-only` throws outside a server bundle; tests run in plain node, so it is stubbed (next build still enforces it).
    'server-only': path.resolve(import.meta.dirname, 'src/server/testing/serverOnly.ts'),
  },
};
// Every index test boots an embedded Postgres (WebAssembly); with a dozen files in parallel that takes seconds, not milliseconds.
const shared = { setupFiles: ['src/server/testing/closeDbs.setup.ts'], testTimeout: 30_000, hookTimeout: 60_000, environment: 'node' as const, maxWorkers };

// Projects do not `extends: true`: that concatenates the root `include` into each one, so every project would hold every file.
export default defineConfig({
  resolve,
  test: { ...shared, include, projects: TIERS.map((name) => ({ resolve, test: { ...shared, name, include: tiers[name] ?? [] } })) },
});
