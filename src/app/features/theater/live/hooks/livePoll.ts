// The live film's poller, with its host injected (as hooks/frameClock.ts injects the frame scheduler) so it is tested
// without a DOM: pull /api/runs every POLL_MS while the tab is visible, tick a clock each second, and never let an
// older answer overwrite a newer one.
import type { LivePayload } from '../model/types';

export const POLL_MS = 2000;
const TICK_MS = 1000;

export interface PollHost {
  /** One read of the payload; null (or a throw) when the read failed: the last payload is kept. */
  fetchPayload: () => Promise<LivePayload | null>;
  hidden: () => boolean;
  now: () => number;
  /** Run fn every ms; returns its cancel. */
  every: (fn: () => void, ms: number) => () => void;
  /** Run fn on every visibility change; returns its removal. */
  onVisibility: (fn: () => void) => () => void;
}

/**
 * Starts polling and returns its stop. A failed read keeps the last payload (the frame goes stale on its own); a read
 * that answers after a later one has already been shown is dropped, so the frame never steps back; nothing is
 * delivered after stop.
 */
export function livePoll(host: PollHost, onPayload: (p: LivePayload) => void, onNow: (now: number) => void): () => void {
  let alive = true;
  let asked = 0;
  let shown = 0;
  const pull = async () => {
    if (!alive || host.hidden()) return;
    const n = ++asked;
    let p: LivePayload | null = null;
    try {
      p = await host.fetchPayload();
    } catch {
      /* keep the last payload */
    }
    if (!alive || p === null || n < shown) return;
    shown = n;
    onPayload(p);
  };
  const tick = () => {
    if (!host.hidden()) onNow(host.now());
  };
  tick();
  const stops = [
    host.every(() => void pull(), POLL_MS),
    host.every(tick, TICK_MS),
    host.onVisibility(() => {
      tick();
      void pull();
    }),
  ];
  return () => {
    alive = false;
    stops.forEach((stop) => stop());
  };
}
