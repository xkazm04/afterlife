import type { ReplayStore } from '../model/replay/store';

const MAX_FRAME_MS = 100;

/** The browser's frame scheduler, injected so the clock can be driven (and counted) without a renderer. */
export interface FrameHost {
  raf: (cb: (now: number) => void) => number;
  caf: (id: number) => void;
  now: () => number;
}

export interface FrameClock {
  /** Begin (or restart) ticking; the first dt is measured from now. */
  start: () => void;
  stop: () => void;
}

/** The film clock: one `tick` per display frame while the film is running. */
export function frameClock(store: Pick<ReplayStore, 'get' | 'dispatch'>, host: FrameHost): FrameClock {
  let id = 0;
  let last = 0;
  const frame = (now: number) => {
    const dt = Math.min(MAX_FRAME_MS, now - last);
    last = now;
    const s = store.get();
    if (s.playing || s.preroll > 0 || s.loopIn > 0) store.dispatch({ type: 'tick', dt });
    id = host.raf(frame);
  };
  const stop = () => host.caf(id);
  return {
    start: () => {
      stop();
      last = host.now();
      id = host.raf(frame);
    },
    stop,
  };
}
