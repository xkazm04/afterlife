// The clock of the screen. Demo: a simulated one, the ledger starts at 14:24:12 and ticks in whole seconds, and the fake
// feed is polled every 15 s. Live: the wall clock, and the poll age counts up from the snapshot's. Pure helpers only.

/** 14:24:12, the moment the demo opens. */
export const START_SEC = 14 * 3600 + 24 * 60 + 12;

/** Poll cadence of the fake feed: the age resets every 15 s. */
export const POLL_PERIOD_SEC = 15;

const two = (n: number): string => String(n).padStart(2, '0');

/** Seconds since midnight to "HH:MM:SS". */
export function hms(sec: number): string {
  return `${two(Math.floor(sec / 3600) % 24)}:${two(Math.floor(sec / 60) % 60)}:${two(sec % 60)}`;
}

/** "14:20:03" to seconds since midnight. */
export function toSec(t: string): number {
  const [h = 0, m = 0, s = 0] = t.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

/** True for a clock time ("14:20:03"), false for "11 d ago". */
export const isClockTime = (t: string): boolean => /^\d\d:/.test(t);

/** Demo: how old the simulated poll is after `elapsed` seconds, when it was `initialAge` old at the start (it wraps). */
export function pollAge(elapsed: number, initialAge: number, period = POLL_PERIOD_SEC): number {
  return (Math.max(0, elapsed) + initialAge) % period;
}

/** Live: how old the snapshot's poll is after `elapsed` seconds. It never wraps: the next poll renders the page again. */
export const livePollAge = (elapsed: number, initialAge: number): number => Math.max(0, elapsed) + Math.max(0, initialAge);

/** The wall clock as "HH:MM:SS", for an entry made now in live mode. */
export const wallTime = (d: Date): string => hms(d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds());
