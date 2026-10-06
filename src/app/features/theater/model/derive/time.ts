// Clock helpers for the recorded slice. hh:mm:ss strings in, whole seconds out. No Date, no Date.now().
import { CRA_END } from '../../data/constants';

export function secs(hms: string): number {
  const [h = 0, m = 0, s = 0] = hms.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

/** "19 h 34 m": time left to the CRA early warning at ledger time `t` (a seeded drill on a simulated clock). */
export function craLeft(t: string, end: { at: string; leftSec: number } = CRA_END): string {
  const s = Math.max(0, end.leftSec + (secs(end.at) - secs(t)));
  return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')} m`;
}

/** Age of the oldest waiting item at `now`: "42 min" below an hour, "1 h" after. */
export function ageText(sinceHms: string, nowHms: string): string {
  const min = Math.max(0, Math.round((secs(nowHms) - secs(sinceHms)) / 60));
  return min >= 60 ? `${Math.floor(min / 60)} h` : `${min} min`;
}
