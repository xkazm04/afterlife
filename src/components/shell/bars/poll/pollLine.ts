// The status bar's poll line, as a pure step: the poll's health (ShellPoll, plus the seconds the client has held it)
// becomes one short line in one of three tones. Only a failed poll offers Re-poll: a late or partly failed one is said,
// and the poller is already on its way.
import type { ShellPoll } from '../../ShellContext';

export type PollLineInput = ShellPoll;
export type PollTone = 'ok' | 'late' | 'failed';
export interface PollLine {
  tone: PollTone;
  text: string;
  repoll?: true;
}

/** Seconds as one short unit, rounded down: 12s, 1m, 2h, 3d. */
export function shortAge(sec: number): string {
  if (sec < 60) return `${Math.floor(sec)}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86_400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86_400)}d`;
}

/** Late: no good poll for more than two intervals (one missed cycle is not yet news). */
const isLate = (p: PollLineInput): boolean => p.ageSec === null || p.ageSec > 2 * p.intervalSec;

export function pollLine(p: PollLineInput): PollLine {
  if (p.error !== null) {
    const good = p.ageSec === null ? 'never polled ok' : `last good ${shortAge(p.ageSec)} ago`;
    return { tone: 'failed', text: `last poll failed: ${p.error} · ${good}`, repoll: true };
  }
  const late = isLate(p);
  const polled = p.ageSec === null ? 'not polled yet' : `polled ${shortAge(p.ageSec)} ago`;
  const age = late ? `late · ${polled} (every ${shortAge(p.intervalSec)})` : polled;
  if (p.failing > 0) return { tone: 'late', text: `${age} · ${p.failing} of ${p.of} projects failed` };
  return { tone: late ? 'late' : 'ok', text: age };
}

/**
 * The layout's read only moves on navigation and focus, so a page left open ticks its age past "late" while the poller
 * runs fine. Before saying late, ask the server once: due when the server's read was healthy and the ticking age is late.
 */
export function recheckDue(p: PollLineInput, heldSec: number): boolean {
  if (p.error !== null || p.ageSec === null || isLate(p)) return false;
  return isLate({ ...p, ageSec: p.ageSec + heldSec });
}
