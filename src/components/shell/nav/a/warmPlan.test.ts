import { describe, expect, it } from 'vitest';
import { entersNeedsYou, isNeedsYouPath, pendingTarget, sampleTarget, skeletonFor, WARM_COMPILE, WARM_ROUTES } from './warmPlan';

const O = 'http://127.0.0.1:3101';

describe('sampleTarget', () => {
  it('a sample link, relative or absolute, keeps its query and drops its hash', () => {
    expect(sampleTarget('/fleet', O)).toBe('/fleet');
    expect(sampleTarget('/fleet/p1?tab=x#top', O)).toBe('/fleet/p1?tab=x');
    expect(sampleTarget(`${O}/needs-you/n1`, O)).toBe('/needs-you/n1');
  });
  it('another tab, another origin or no href is no sample target', () => {
    for (const h of [null, undefined, '', '/ladder', '/monitor/x', 'https://evil.test/fleet', 'mailto:x@y.z']) {
      expect(sampleTarget(h, O), String(h)).toBeNull();
    }
  });
});

describe('needs-you activation', () => {
  it('the desk and its decisions are the desk', () => {
    expect(isNeedsYouPath('/needs-you')).toBe(true);
    expect(isNeedsYouPath('/needs-you/n1')).toBe(true);
    expect(isNeedsYouPath('/fleet')).toBe(false);
    expect(isNeedsYouPath(null)).toBe(false);
  });
  it('entering from another module refreshes; the first render and moves inside the desk do not', () => {
    expect(entersNeedsYou('/fleet', '/needs-you')).toBe(true);
    expect(entersNeedsYou('/ladder', '/needs-you/n1')).toBe(true);
    expect(entersNeedsYou(null, '/needs-you')).toBe(false);
    expect(entersNeedsYou('/needs-you', '/needs-you/n1')).toBe(false);
    expect(entersNeedsYou('/needs-you/n1', '/needs-you')).toBe(false);
    expect(entersNeedsYou('/needs-you', '/monitor')).toBe(false);
  });
});

describe('the warm plan', () => {
  it('names every sample module and both detail routes', () => {
    expect([...WARM_ROUTES].map((r) => sampleTarget(r, O))).toEqual(['/fleet', '/monitor', '/needs-you']);
    expect([...WARM_COMPILE].every((r) => sampleTarget(r, O) === r)).toBe(true);
  });
});

describe('skeletonFor', () => {
  it('names the skeleton each sample route paints', () => {
    expect(skeletonFor('/fleet')).toEqual({ title: 'Belay', layout: 'table' });
    expect(skeletonFor('/fleet/p1')).toEqual({ title: 'Fleet', layout: 'sections' });
    expect(skeletonFor('/monitor')).toEqual({ title: 'Monitor', layout: 'lanes' });
    expect(skeletonFor('/needs-you')).toEqual({ title: 'Needs you', layout: 'table' });
    expect(skeletonFor('/needs-you/n1?x=1')).toEqual({ title: 'Needs you', layout: 'sections' });
    expect(skeletonFor('/ladder')).toBeNull();
  });
});

describe('pendingTarget', () => {
  const taken = { button: 0, defaultPrevented: true, modified: false };
  it('a plain click the router took to another sample path is pending', () => {
    expect(pendingTarget(taken, '/monitor', O, '/fleet')).toBe('/monitor');
    expect(pendingTarget(taken, '/fleet/p1?tab=x', O, '/fleet')).toBe('/fleet/p1');
  });
  it('not pending: the same path, another tab, a modified or middle click, or a click the router did not take', () => {
    expect(pendingTarget(taken, '/fleet?sort=name', O, '/fleet')).toBeNull();
    expect(pendingTarget(taken, '/ladder', O, '/fleet')).toBeNull();
    expect(pendingTarget({ ...taken, modified: true }, '/monitor', O, '/fleet')).toBeNull();
    expect(pendingTarget({ ...taken, button: 1 }, '/monitor', O, '/fleet')).toBeNull();
    expect(pendingTarget({ ...taken, defaultPrevented: false }, '/monitor', O, '/fleet')).toBeNull();
  });
});
