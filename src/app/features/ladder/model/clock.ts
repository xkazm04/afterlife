// The clock of the screen. Demo: a simulated one, the ledger starts at 14:24:12 UTC on DEMO_NOW's day and ticks in whole
// seconds, and the fake feed is polled every 15 s. Live: the wall clock, and the poll age counts up from the snapshot's.
// A ledger entry's time is an instant (epoch ms); its label is derived from it in the screen's one zone (clockLabel), the
// zone the server chose for the seed, so the server's render and the client's stamps agree. Pure helpers only; hms,
// livePollAge and wallTime are src/lib/clock/time.ts (the Task page shows them too).
import { hms } from '@/lib/clock/time';
import { DEMO_NOW } from '@/lib/demo/clock';

/** 14:24:12, the moment the demo opens. */
export const START_SEC = 14 * 3600 + 24 * 60 + 12;

/** Poll cadence of the fake feed: the age resets every 15 s. */
export const POLL_PERIOD_SEC = 15;

/** True for a clock label ("14:20:03": made within a day of its screen's now), false for "11 d ago". */
export const isClockTime = (t: string): boolean => /^\d\d:/.test(t);

/** Demo: how old the simulated poll is after `elapsed` seconds, when it was `initialAge` old at the start (it wraps). */
export function pollAge(elapsed: number, initialAge: number, period = POLL_PERIOD_SEC): number {
  return (Math.max(0, elapsed) + initialAge) % period;
}

const DAY_MS = 86_400_000;
const DEMO_DAY = Date.UTC(DEMO_NOW.getUTCFullYear(), DEMO_NOW.getUTCMonth(), DEMO_NOW.getUTCDate());

/** Demo: the instant `elapsed` seconds after the demo opens (14:24:12 UTC on DEMO_NOW's day); negative is before. */
export const demoInstant = (elapsed: number): number => DEMO_DAY + (START_SEC + elapsed) * 1000;

const formats = new Map<string, Intl.DateTimeFormat>();
const formatIn = (tz: string): Intl.DateTimeFormat => {
  let f = formats.get(tz);
  if (!f) formats.set(tz, (f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit' })));
  return f;
};

/** The instant `at` (epoch ms) as "HH:MM:SS" in the IANA zone `tz`, whatever zone the process runs in. */
export function clockTime(at: number, tz: string): string {
  const parts = formatIn(tz).formatToParts(at);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return hms(part('hour') * 3600 + part('minute') * 60 + part('second'));
}

/** A ledger entry's label: "14:20:03" in `tz` within a day of `now` (it goes on the to-scale rail), else "3 d ago". */
export function clockLabel(at: number, tz: string, now: Date): string {
  const age = now.getTime() - at;
  return age < DAY_MS ? clockTime(at, tz) : `${Math.max(1, Math.floor(age / DAY_MS))} d ago`;
}
