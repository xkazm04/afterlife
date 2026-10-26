import { describe, expect, it, vi } from 'vitest';
import { NotReadyError } from '@/server/data';
import { streamScreen, unserialisable } from './stream';
import { ok, type ScreenLoader } from './types';

const ctx = (signal = new AbortController().signal) => ({ params: {}, search: new URLSearchParams(), signal });
async function lines(body: ReadableStream<Uint8Array>): Promise<Record<string, unknown>[]> {
  const text = await new Response(body).text();
  return text.trim().split('\n').map((l) => JSON.parse(l) as Record<string, unknown>);
}
const later = <T,>(ms: number, v: T) => new Promise<T>((r) => setTimeout(() => r(v), ms));

describe('streamScreen', () => {
  it('writes each slice as it resolves (a sync core first), then _end', async () => {
    const loader: ScreenLoader = { slices: { core: () => ok({ n: 1 }), slow: () => later(20, ok('s')), fast: () => later(1, ok('f')) } };
    const out = await lines(streamScreen('monitor', loader, ctx()));
    expect(out.map((l) => l.slice)).toEqual(['core', 'fast', 'slow', '_end']);
    expect(out[0]).toMatchObject({ status: 'ok', data: { n: 1 } });
    for (const l of out) expect(new Date(String(l.asOf)).toISOString()).toBe(l.asOf);
  });

  it('a throw is an error line with a fixed reason, the message only in the server log; a NotReadyError says its own', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const loader: ScreenLoader = {
      slices: {
        core: () => { throw new NotReadyError('BELAY_MODE=live, but the first poll has not finished'); },
        desk: () => Promise.reject(new Error("ENOENT: open 'C:\\ops\\runs'")),
      },
    };
    const out = await lines(streamScreen('monitor', loader, ctx()));
    expect(out[0]).toMatchObject({ slice: 'core', status: 'error', reason: 'BELAY_MODE=live, but the first poll has not finished' });
    expect(out[1]).toMatchObject({ slice: 'desk', status: 'error', reason: 'unreadable' });
    expect(JSON.stringify(out)).not.toContain('ENOENT');
    expect(String(log.mock.calls[0]?.[0])).toContain('ENOENT');
    log.mockRestore();
  });

  it('refuses data JSON would change, and passes notFound, redirect and an absent value through', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const loader: ScreenLoader = {
      slices: { a: () => ok({ s: new Set([1]) }), b: () => ({ status: 'notFound' }), c: () => ({ status: 'redirect', to: '/fleet/p1' }), d: () => ok(undefined) },
    };
    const out = await lines(streamScreen('k', loader, ctx()));
    expect(out[0]).toMatchObject({ slice: 'a', status: 'error', reason: 'unreadable' });
    expect(out[1]).toMatchObject({ slice: 'b', status: 'notFound' });
    expect(out[2]).toMatchObject({ slice: 'c', status: 'redirect', to: '/fleet/p1' });
    expect(out[3]).not.toHaveProperty('data');
    log.mockRestore();
  });

  it('a refused request: one _end error line for a local screen, not-local per slice for local slices', async () => {
    const whole = await lines(streamScreen('k', { local: true, slices: { core: () => ok(1) } }, ctx(), true));
    expect(whole).toEqual([expect.objectContaining({ slice: '_end', status: 'error', reason: 'not-local' })]);
    const part = await lines(streamScreen('k', { local: ['start'], slices: { live: () => ok(1), start: () => ok(2) } }, ctx(), true));
    expect(part.map((l) => [l.slice, l.status, l.reason])).toEqual([['live', 'ok', undefined], ['start', 'error', 'not-local'], ['_end', 'ok', undefined]]);
  });

  it('stops writing when the request is aborted', async () => {
    const ac = new AbortController();
    const body = streamScreen('k', { slices: { core: () => ok(1), slow: () => later(30, ok(2)) } }, ctx(ac.signal));
    setTimeout(() => ac.abort(), 5);
    const out = await lines(body);
    expect(out.map((l) => l.slice)).toEqual(['core']);
  });
});

describe('unserialisable', () => {
  it('names the first value JSON would lose or change', () => {
    expect(unserialisable({ a: [1, 'x', null, { b: true }] })).toBeNull();
    expect(unserialisable({ a: { m: new Map() } })).toBe('data.a.m');
    expect(unserialisable([0, Number.NaN])).toBe('data[1]');
    expect(unserialisable({ d: new Date() })).toBe('data.d');
    expect(unserialisable({ f: () => 1 })).toBe('data.f');
  });
});
