// The poll scheduler: one cycle, then the next one `intervalMs` after it ends (never two at once). It is started by the
// server on boot (data/live/boot.ts) and by nothing else: tests call runPollCycle directly and never start a timer.

export interface Scheduler {
  /** Runs one cycle now (or joins the one in flight) and resolves when it is done. */
  now(): Promise<void>;
  stop(): void;
}

/** BELAY_POLL_SECONDS, default 30, never below 5 (the rate limit is spike S7). */
export function pollIntervalMs(env: Record<string, string | undefined> = process.env): number {
  const s = Number(env.BELAY_POLL_SECONDS);
  return (Number.isFinite(s) && s > 0 ? Math.max(5, s) : 30) * 1000;
}

export function startScheduler(tick: () => Promise<unknown>, intervalMs: number, onError: (e: unknown) => void = () => undefined): Scheduler {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running: Promise<void> | null = null;
  let stopped = false;

  const arm = (): void => {
    if (stopped) return;
    timer = setTimeout(() => void run(), intervalMs);
    timer.unref();
  };
  const run = (): Promise<void> => {
    running ??= tick()
      .then(() => undefined, onError)
      .finally(() => {
        running = null;
        arm();
      });
    return running;
  };
  arm();
  return {
    now: () => {
      clearTimeout(timer);
      return run();
    },
    stop: () => {
      stopped = true;
      clearTimeout(timer);
    },
  };
}
