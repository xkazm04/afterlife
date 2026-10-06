import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Local-first: Belay runs on the operator's machine. The hosted read-only replay (Cloud Run)
  // is the same build started with BELAY_MODE=replay; see infra/cloudrun.
  output: 'standalone',
  // PGlite loads its WebAssembly and data files from its own folder, so it must not be bundled.
  serverExternalPackages: ['@electric-sql/pglite'],
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
