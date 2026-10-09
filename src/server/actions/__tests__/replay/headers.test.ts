// F94: on the hosted replay every response goes to the public, and a live Belay's page is one click from a write. Next
// named itself (x-powered-by), and nothing stopped another site from framing a page: a framed localhost page sends its
// own Host and Origin, so a click on it could confirm a write that local.ts lets through. Every route now answers with
// the headers that cannot break the app: no framing, no sniffing, no referrer. No script-src CSP: see infra/cloudrun.
import { describe, expect, it } from 'vitest';
import nextConfig from '../../../../../next.config';

describe('every route answers with the public origin headers', () => {
  it('does not name the framework', () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it('forbids framing, sniffing and the referrer on every path', async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const all = rules.find((r) => r.source === '/:path*');
    expect(Object.fromEntries((all?.headers ?? []).map((h) => [h.key, h.value]))).toEqual({
      'Content-Security-Policy': "frame-ancestors 'none'",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    });
  });
});
