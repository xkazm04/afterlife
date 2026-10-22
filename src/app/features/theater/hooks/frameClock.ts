import type { ReplayStore } from '../model/replay/store';

const MAX_FRAME_MS = 100;

/** The browser's frame scheduler, injected so the clock can be driven (and counted) without a renderer. */
export interface FrameHost {
  raf: (cb: (now: number) => void) => number;
  caf: (id: number) => void;
  now: () => number;
}

export interface FrameClock {
  /** Begin (or restart) the clock; it asks for frames only while the film runs, and wakes when it starts running. */
  start: () => void;
  stop: () => void;
}

/**
 * The film clock: one `tick` per display frame while the film is running (playing, pre-rolling or looping). A held
 * film asks for no frames at all; a dispatch that makes it run again wakes the clock, and the first dt counts from
 * the wake, not from the idle gap.
 */
export function frameClock(store: Pick<ReplayStore, 'get' | 'dispatch' | 'subscribe'>, host: FrameHost): FrameClock {
  // Called unbound: the DOM's requestAnimationFrame and cancelAnimationFrame throw "Illegal invocation" as host methods.
  const { raf, caf, now: clockNow } = host;
  let id = 0;
  let armed = false;
  let on = false;
  let last = 0;
  const running = () => {
    const s = store.get();
    return s.playing || s.preroll > 0 || s.loopIn > 0;
  };
  const frame = (now: number) => {
    const dt = Math.min(MAX_FRAME_MS, now - last);
    last = now;
    if (running()) store.dispatch({ type: 'tick', dt });
    if (on && running()) id = raf(frame);
    else armed = false;
  };
  const wake = () => {
    if (!on || armed || !running()) return;
    armed = true;
    last = clockNow();
    id = raf(frame);
  };
  const stop = () => {
    on = false;
    armed = false;
    caf(id);
  };
  let unsub = () => {};
  return {
    start: () => {
      stop();
      unsub();
      on = true;
      unsub = store.subscribe(wake);
      wake();
    },
    stop: () => {
      stop();
      unsub();
    },
  };
}
