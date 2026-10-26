import { describe, expect, it } from 'vitest';
import { ARM_B_MARK, listKeyOf, markedPath, takesClick, targetOf, veilsOnActivate } from './model';

const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false };

describe('listKeyOf', () => {
  it('names the list screens, query ignored', () => {
    expect(listKeyOf('/fleet')).toBe('fleet');
    expect(listKeyOf('/fleet?state=blocked')).toBe('fleet');
    expect(listKeyOf('/needs-you#x')).toBe('needs-you');
  });
  it('detail pages and other tabs are not the host’s', () => {
    for (const h of ['/fleet/p1', '/needs-you/n1', '/monitor', '/ladder', '/', '/fleetx']) expect(listKeyOf(h), h).toBeNull();
  });
});

describe('markedPath', () => {
  it('the entry’s own mark on the current path', () => {
    expect(markedPath({ __NA: true, [ARM_B_MARK]: '/fleet' }, '/fleet')).toBe('/fleet');
  });
  it('no mark, a stale mark, a detail mark or no state: the route draws it', () => {
    expect(markedPath({ __NA: true }, '/fleet')).toBeNull();
    expect(markedPath({ [ARM_B_MARK]: '/fleet' }, '/needs-you')).toBeNull();
    expect(markedPath({ [ARM_B_MARK]: '/fleet/p1' }, '/fleet/p1')).toBeNull();
    expect(markedPath({ [ARM_B_MARK]: 3 }, '/fleet')).toBeNull();
    expect(markedPath(null, '/fleet')).toBeNull();
  });
});

describe('takesClick', () => {
  it('a plain left click on a list screen', () => {
    expect(takesClick(click, '/fleet')).toBe(true);
  });
  it('modified clicks, other buttons, handled clicks, details and other tabs pass through', () => {
    expect(takesClick({ ...click, metaKey: true }, '/fleet')).toBe(false);
    expect(takesClick({ ...click, ctrlKey: true }, '/fleet')).toBe(false);
    expect(takesClick({ ...click, shiftKey: true }, '/fleet')).toBe(false);
    expect(takesClick({ ...click, button: 1 }, '/fleet')).toBe(false);
    expect(takesClick({ ...click, defaultPrevented: true }, '/fleet')).toBe(false);
    expect(takesClick(click, '/fleet/p1')).toBe(false);
    expect(takesClick(click, '/ladder')).toBe(false);
  });
});

describe('targetOf', () => {
  it('returns to the URL the screen last had', () => {
    expect(targetOf('/fleet', '/fleet?state=blocked')).toBe('/fleet?state=blocked');
  });
  it('the link’s own query wins; no memory or another path: the link', () => {
    expect(targetOf('/fleet?q=x', '/fleet?state=blocked')).toBe('/fleet?q=x');
    expect(targetOf('/fleet', undefined)).toBe('/fleet');
    expect(targetOf('/fleet', '/fleet/p1')).toBe('/fleet');
  });
});

describe('veilsOnActivate', () => {
  it('only Needs you', () => {
    expect(veilsOnActivate('needs-you')).toBe(true);
    expect(veilsOnActivate('fleet')).toBe(false);
  });
});
