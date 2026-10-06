import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Local-first: Belay runs on the operator's machine. The hosted read-only replay (Cloud Run)
  // is the same build started with BELAY_MODE=replay; see infra/cloudrun.
  output: 'standalone',
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
