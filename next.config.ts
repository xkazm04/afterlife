import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Local-first: Afterlife runs on the operator's machine. The hosted read-only replay (Cloud Run)
  // is the same build started with AFTERLIFE_MODE=replay; see infra/cloudrun.
  output: 'standalone',
  // Static shell + dynamic holes: every data read waits for a request (connection()) inside <Suspense>, and nothing is
  // kept in a server cache (no 'use cache'), so a build never bakes in the AFTERLIFE_MODE or the data it ran with.
  cacheComponents: true,
  // PGlite loads its WebAssembly and data files from its own folder, so it must not be bundled.
  serverExternalPackages: ['@electric-sql/pglite'],
  turbopack: {
    root: import.meta.dirname,
    // npm run dev:inspect: stamp host JSX with data-loc for the DevInspector (Ctrl+Shift+L). Dev server only.
    rules: (process.env.AFTERLIFE_INSPECTOR || process.env.BELAY_INSPECTOR) === '1' ? { '*.tsx': { loaders: ['./scripts/dev/source-loc-loader.mjs'] } } : {},
  },
  // Public origin headers (F94): the replay does not name its framework, and no page is framed by another site (a framed
  // localhost page is one click from a live write). No script-src CSP: it could not be verified (infra/cloudrun).
  poweredByHeader: false,
  // The submission film is recorded from the running app (npm run dev), so no Next badge may sit on screen.
  devIndicators: false,
  // /trace and /onboard became /start (the one setup wizard); old links and bookmarks land there, the query kept
  // (?rehearse=not-ready). Exact paths only: /onboard/estate stays the demo estate.
  async redirects() {
    return [
      { source: '/trace', destination: '/start', permanent: true },
      { source: '/onboard', destination: '/start', permanent: true },
    ];
  },
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
