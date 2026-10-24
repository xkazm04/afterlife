// The live poller against a hand-driven host: no DOM, no timers, every read resolved when the test says so.
import { describe, expect, it } from 'vitest';
import type { LivePayload } from '../model/types';
import { livePoll, POLL_MS, type PollHost } from './livePoll';

const payload = (generatedAt: number): LivePayload => ({ repos: [], meta: {}, generatedAt }) as unknown as LivePayload;

function host() {
  const timers = new Map<number, () => void>();
  const reads: { resolve: (p: LivePayload | null) => void; reject: (e: Error) => void }[] = [];
  let vis: (() => void) | null = null;
  const h = {
    hidden: false,
    clock: 1000,
    reads,
    every: (fn: () => void, ms: number) => {
      timers.set(ms, fn);
      return () => timers.delete(ms);
    },
    fire: (ms: number) => timers.get(ms)?.(),
    show: () => vis?.(),
    timers,
    get vis() {
      return vis;
    },
  };
  const ph: PollHost = {
    fetchPayload: () => new Promise((resolve, reject) => reads.push({ resolve, reject })),
    hidden: () => h.hidden,
    now: () => h.clock,
    every: h.every,
    onVisibility: (fn) => {
      vis = fn;
      return () => {
        vis = null;
      };
    },
  };
  return { h, ph };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('livePoll', () => {
  it('ticks the clock at once, pulls every POLL_MS, and hands each answer over', async () => {
    const { h, ph } = host();
    const got: number[] = [];
    const nows: number[] = [];
    livePoll(ph, (p) => got.push(p.generatedAt), (n) => nows.push(n));
    expect(nows).toEqual([1000]);
    h.fire(POLL_MS);
    h.reads[0]!.resolve(payload(1));
    await flush();
    expect(got).toEqual([1]);
  });

  it('a failed or refused read keeps the last payload', async () => {
    const { h, ph } = host();
    const got: number[] = [];
    livePoll(ph, (p) => got.push(p.generatedAt), () => {});
    h.fire(POLL_MS);
    h.reads[0]!.reject(new Error('offline'));
    h.fire(POLL_MS);
    h.reads[1]!.resolve(null);
    await flush();
    expect(got).toEqual([]);
  });

  it('an older answer that lands after a newer one is dropped: the frame never steps back', async () => {
    const { h, ph } = host();
    const got: number[] = [];
    livePoll(ph, (p) => got.push(p.generatedAt), () => {});
    h.fire(POLL_MS);
    h.fire(POLL_MS);
    h.reads[1]!.resolve(payload(2));
    await flush();
    h.reads[0]!.resolve(payload(1));
    await flush();
    expect(got).toEqual([2]);
  });

  it('a hidden tab neither reads nor ticks; showing it ticks and reads once', () => {
    const { h, ph } = host();
    const nows: number[] = [];
    h.hidden = true;
    livePoll(ph, () => {}, (n) => nows.push(n));
    h.fire(POLL_MS);
    h.fire(1000);
    expect([h.reads.length, nows.length]).toEqual([0, 0]);
    h.hidden = false;
    h.show();
    expect([h.reads.length, nows.length]).toEqual([1, 1]);
  });

  it('stop cancels every timer and the visibility listener, and drops a read still in flight', async () => {
    const { h, ph } = host();
    const got: number[] = [];
    const stop = livePoll(ph, (p) => got.push(p.generatedAt), () => {});
    h.fire(POLL_MS);
    stop();
    expect([h.timers.size, h.vis]).toEqual([0, null]);
    h.reads[0]!.resolve(payload(1));
    await flush();
    expect(got).toEqual([]);
  });
});
