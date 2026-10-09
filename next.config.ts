import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Local-first: Belay runs on the operator's machine. The hosted read-only replay (Cloud Run)
  // is the same build started with BELAY_MODE=replay; see infra/cloudrun.
  output: 'standalone',
  // PGlite loads its WebAssembly and data files from its own folder, so it must not be bundled.
  serverExternalPackages: ['@electric-sql/pglite'],
  turbopack: { root: import.meta.dirname },
  // Public origin headers (F94): the replay does not name its framework, and no page is framed by another site (a framed
  // localhost page is one click from a live write). No script-src CSP: it could not be verified (infra/cloudrun).
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
    ];
  },
};

export default nextConfig;
