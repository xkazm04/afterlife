// F91: a misconfigured public container (BELAY_MODE=live behind Cloud Run's proxy, or any load balancer whose default
// route reaches it) receives a request whose Host the caller chose. Host, X-Forwarded-Host and Origin can then all say
// localhost. The proxy still appends the caller's address to X-Forwarded-For (Next itself sets it, when absent, to the
// socket's address: 127.0.0.1 for the operator's own page), so a live action refuses a request forwarded for anyone else.
import { describe, expect, it } from 'vitest';
import { notLocal } from '../../local';

const h = (v: Record<string, string>) => new Headers(v);
// What the server sees from `curl -H 'Host: localhost' https://<public name>/...`: Next copies Host into X-Forwarded-Host.
const forged = { host: 'localhost', 'x-forwarded-host': 'localhost', 'x-forwarded-proto': 'https' };

describe('a live action refuses a request a proxy forwarded for another machine', () => {
  it.each([
    ['Cloud Run (the caller, then the front end)', { ...forged, 'x-forwarded-for': '203.0.113.7, 169.254.1.1' }],
    ['a caller that also sent its own X-Forwarded-For: 127.0.0.1', { ...forged, 'x-forwarded-for': '127.0.0.1, 203.0.113.7' }],
    ['an RFC 7239 Forwarded header', { ...forged, forwarded: 'for=203.0.113.7;proto=https' }],
    ['an X-Real-IP header', { ...forged, 'x-real-ip': '203.0.113.7' }],
  ])('%s', (_why, v) => {
    expect(notLocal(h(v))).toMatch(/203\.0\.113\.7.*not localhost/);
  });

  it.each([
    ['no forwarding header (a unit test, or a server that sets none)', { host: 'localhost:3000' }],
    ['Next\'s own X-Forwarded-For for a loopback socket', { host: 'localhost:3000', 'x-forwarded-for': '127.0.0.1' }],
    ['an IPv6 loopback socket', { host: '[::1]:3000', 'x-forwarded-for': '::1' }],
    ['an IPv4-mapped loopback socket', { host: '127.0.0.1:3000', 'x-forwarded-for': '::ffff:127.0.0.1' }],
    ['a loopback Forwarded header', { host: 'localhost:3000', forwarded: 'for="[::1]";proto=http' }],
  ])('still answers the operator\'s own page: %s', (_why, v) => {
    expect(notLocal(h(v))).toBeNull();
  });
});
