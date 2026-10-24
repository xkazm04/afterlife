// Clock words more than one screen shows: "HH:MM:SS" from seconds or the wall clock, and a live poll's age. Pure.

const two = (n: number): string => String(n).padStart(2, '0');

/** Seconds since midnight to "HH:MM:SS". */
export function hms(sec: number): string {
  return `${two(Math.floor(sec / 3600) % 24)}:${two(Math.floor(sec / 60) % 60)}:${two(sec % 60)}`;
}

/** Live: how old the snapshot's poll is after `elapsed` seconds. It never wraps: the next poll renders the page again. */
export const livePollAge = (elapsed: number, initialAge: number): number => Math.max(0, elapsed) + Math.max(0, initialAge);

/** The wall clock as "HH:MM:SS" in this process's zone: the Task page's ticking clock. The Ladder's ledger uses clockLabel. */
export const wallTime = (d: Date): string => hms(d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds());
