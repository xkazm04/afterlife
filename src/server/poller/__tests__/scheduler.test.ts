import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pollIntervalMs, startScheduler } from '../scheduler';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('scheduler', () => {
  it('BELAY_POLL_SECONDS: default 30, never below 5, garbage falls back', () => {
    expect(pollIntervalMs({})).toBe(30_000);
    expect(pollIntervalMs({ BELAY_POLL_SECONDS: '60' })).toBe(60_000);
    expect(pollIntervalMs({ BELAY_POLL_SECONDS: '1' })).toBe(5_000);
    expect(pollIntervalMs({ BELAY_POLL_SECONDS: 'soon' })).toBe(30_000);
    expect(pollIntervalMs({ BELAY_POLL_SECONDS: '-4' })).toBe(30_000);
  });

  it('runs a cycle each interval, the next one only after the last has finished', async () => {
    let running = 0;
    let peak = 0;
    let done = 0;
    const tick = async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 40_000)); // slower than the interval
      running--;
      done++;
    };
    const s = startScheduler(tick, 30_000);
    await vi.advanceTimersByTimeAsync(30_000); // first cycle starts
    await vi.advanceTimersByTimeAsync(60_000); // it ends at 70 s; the next waits 30 s after that
    expect(done).toBe(1);
    await vi.advanceTimersByTimeAsync(40_000);
    expect(peak).toBe(1);
    s.stop();
  });

  it('now() joins the cycle in flight instead of starting a second, and stop() ends the timer', async () => {
    let started = 0;
    const s = startScheduler(async () => {
      started++;
      await new Promise((r) => setTimeout(r, 1_000));
    }, 30_000);
    const a = s.now();
    const b = s.now();
    await vi.advanceTimersByTimeAsync(1_000);
    await Promise.all([a, b]);
    expect(started).toBe(1);
    s.stop();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(started).toBe(1);
  });

  it('a failing cycle is reported and the schedule continues', async () => {
    const errors: unknown[] = [];
    let n = 0;
    const s = startScheduler(() => (++n === 1 ? Promise.reject(new Error('boom')) : Promise.resolve()), 10_000, (e) => errors.push(e));
    await vi.advanceTimersByTimeAsync(35_000);
    expect(errors).toHaveLength(1);
    expect(n).toBeGreaterThan(1);
    s.stop();
  });
});
