import { describe, expect, it } from 'vitest';
import { isSampleHref, parseArm, sampleKeyOf } from './navArm';

describe('parseArm', () => {
  it('reads A, B and C in any case', () => {
    expect(parseArm('A')).toBe('A');
    expect(parseArm('b')).toBe('B');
    expect(parseArm(' c ')).toBe('C');
  });
  it('anything else is no arm', () => {
    for (const raw of [null, undefined, '', 'D', 'AB', '1']) expect(parseArm(raw)).toBeNull();
  });
});

describe('isSampleHref', () => {
  it('matches the sample screens, query and hash ignored', () => {
    for (const h of ['/fleet', '/fleet/p1', '/monitor', '/needs-you', '/needs-you/n1', '/fleet?sort=name', '/monitor#top', '/needs-you/n2?x=1#y']) {
      expect(isSampleHref(h), h).toBe(true);
    }
  });
  it('rejects the other tabs, deeper paths and look-alikes', () => {
    for (const h of ['/', '/ladder', '/fleetx', '/fleet/p1/more', '/monitor/x', '/fleet/', 'fleet', 'https://x/fleet', '/settings/fleet']) {
      expect(isSampleHref(h), h).toBe(false);
    }
  });
  it('names the module', () => {
    expect(sampleKeyOf('/fleet/p1')).toBe('fleet');
    expect(sampleKeyOf('/needs-you?item=n1')).toBe('needs-you');
    expect(sampleKeyOf('/monitor')).toBe('monitor');
  });
});
