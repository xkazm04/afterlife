import { describe, expect, it } from 'vitest';
import { applyLine, failUnread, freshEntry, visit } from './entry';
import { inAppHref, plainClick } from './click';
import { END, lineSplitter, lineText, screenUrl, toWireLine, type WireLine } from './wire';

const at = '2026-10-26T10:00:00.000Z';
const line = (l: Partial<WireLine> & { slice: string }): WireLine => ({ status: 'ok', asOf: at, ...l });

describe('the NDJSON reader', () => {
  it('hands back whole lines only: a line torn across chunks waits for its end', () => {
    const s = lineSplitter();
    expect(s.feed('{"a":1}\n{"b"')).toEqual(['{"a":1}']);
    expect(s.feed(':2}')).toEqual([]);
    expect(s.feed('\n\n{"c":3}\n')).toEqual(['{"b":2}', '{"c":3}']);
    expect(s.feed('{"d":4}')).toEqual([]);
    expect(s.flush()).toEqual(['{"d":4}']);
  });
  it('takes only lines of the wire’s shape', () => {
    expect(toWireLine(JSON.parse(lineText(line({ slice: 'core', data: { n: 1 } }))))).toMatchObject({ slice: 'core', data: { n: 1 } });
    for (const bad of [null, [], { slice: 'x' }, { slice: 'x', status: 'nope', asOf: at }, { slice: 1, status: 'ok', asOf: at }, { slice: 'x', status: 'ok', asOf: at, to: 3 }]) {
      expect(toWireLine(bad)).toBeNull();
    }
  });
  it('builds the stream URL: the key one encoded segment, its param in the query (winning a clash)', () => {
    expect(screenUrl('monitor', {})).toBe('/api/screen/monitor');
    expect(screenUrl('fleet', {}, '?project=p1&q=x')).toBe('/api/screen/fleet?project=p1&q=x');
    expect(screenUrl('fleet/[project]', { project: 'a b' }, 'project=old&tab=2')).toBe('/api/screen/fleet%2F%5Bproject%5D?project=a+b&tab=2');
  });
});

describe('a line applied to a screen entry', () => {
  const declared = ['core', 'desk'];
  it('ok reads the slice; an identical re-read keeps the old data object', () => {
    const a = applyLine(freshEntry('/monitor'), line({ slice: 'core', data: { n: [1] } }), declared).entry;
    const b = applyLine(a, line({ slice: 'core', data: { n: [1] }, asOf: '2026-10-26T10:00:05.000Z' }), declared).entry;
    expect(b.slices.core).toMatchObject({ state: 'ok', asOf: '2026-10-26T10:00:05.000Z' });
    expect(b.slices.core?.state === 'ok' && a.slices.core?.state === 'ok' && b.slices.core.data === a.slices.core.data).toBe(true);
    const c = applyLine(b, line({ slice: 'core', data: { n: [2] } }), declared).entry;
    expect(c.slices.core).toMatchObject({ data: { n: [2] } });
  });
  it('an error never blanks a read slice (a quiet re-read that failed), but says why for an unread one', () => {
    const read = applyLine(freshEntry('/m'), line({ slice: 'core', data: 1 }), declared).entry;
    expect(applyLine(read, line({ slice: 'core', status: 'error', reason: 'unreadable' }), declared).entry).toBe(read);
    expect(applyLine(read, line({ slice: 'desk', status: 'error', reason: 'unreadable' }), declared).entry.slices.desk).toEqual({ state: 'error', reason: 'unreadable' });
  });
  it('notFound marks the screen; redirect is an effect; END ends the read', () => {
    expect(applyLine(freshEntry('/m'), line({ slice: 'core', status: 'notFound' }), declared).entry.notFound).toBe(true);
    expect(applyLine(freshEntry('/m'), line({ slice: 'core', status: 'redirect', to: '/fleet/p1' }), declared).effect).toEqual({ redirect: '/fleet/p1' });
    const reading = { ...freshEntry('/m'), reading: true };
    expect(applyLine(reading, line({ slice: END }), declared).entry).toMatchObject({ reading: false, asOf: at, slices: { core: { state: 'error', reason: 'not served' } } });
  });
  it('a refused stream (END error) fails every slice it never answered, with the reason', () => {
    const read = applyLine(freshEntry('/m'), line({ slice: 'core', data: 1 }), declared).entry;
    const done = applyLine(read, line({ slice: END, status: 'error', reason: 'not-local' }), declared).entry;
    expect(done.slices).toEqual({ core: read.slices.core, desk: { state: 'error', reason: 'not-local' } });
    expect(failUnread(done, declared, 'x')).toBe(done);
  });
});

describe('the visited screens', () => {
  it('most recent first, capped: the oldest goes', () => {
    expect(visit(['a', 'b', 'c'], 'b', 3)).toEqual({ order: ['b', 'a', 'c'], evicted: [] });
    expect(visit(['a', 'b', 'c'], 'd', 3)).toEqual({ order: ['d', 'a', 'b'], evicted: ['c'] });
  });
});

describe('the clicks the host takes', () => {
  const here = { origin: 'http://127.0.0.1:3190', pathname: '/ladder', search: '', href: 'http://127.0.0.1:3190/ladder' };
  const a = (href: string | null, more: Partial<{ target: string; download: boolean; optedOut: boolean }> = {}) => ({ href, target: '', download: false, optedOut: false, ...more });
  const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false };
  it('a plain primary click only', () => {
    expect(plainClick(click)).toBe(true);
    for (const k of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey', 'defaultPrevented'] as const) expect(plainClick({ ...click, [k]: true })).toBe(false);
    expect(plainClick({ ...click, button: 1 })).toBe(false);
  });
  it('a same-origin link in this tab, as path + query + hash', () => {
    expect(inAppHref(a('/monitor'), here)).toBe('/monitor');
    expect(inAppHref(a('monitor?x=1#y'), here)).toBe('/monitor?x=1#y');
    expect(inAppHref(a('http://127.0.0.1:3190/fleet', { target: '_self' }), here)).toBe('/fleet');
  });
  it('another origin, another tab, a download, an opt-out or a jump within the page: left alone', () => {
    expect(inAppHref(a('https://gitlab.com/x'), here)).toBeNull();
    expect(inAppHref(a('/monitor', { target: '_blank' }), here)).toBeNull();
    expect(inAppHref(a('/monitor', { download: true }), here)).toBeNull();
    expect(inAppHref(a('/monitor', { optedOut: true }), here)).toBeNull();
    expect(inAppHref(a('#top'), here)).toBeNull();
    expect(inAppHref(a(null), here)).toBeNull();
  });
});
