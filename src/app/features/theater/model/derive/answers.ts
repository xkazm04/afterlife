// The four answers, derived from one snapshot: Running, Doing now, Going well, Needs me.
import type { Snapshot } from './snapshots';

export interface Answers {
  running: { armed: number; total: number };
  now: string;
  well: { pass: number; fail: number; demotions: number };
  needs: { count: number; oldest: string; latest: string };
}

export function deriveAnswers(s: Snapshot, armed: number, total: number): Answers {
  return {
    running: { armed, total },
    now: s.now,
    well: { pass: s.pass, fail: s.fail, demotions: s.dem },
    needs: { count: s.needs.length, oldest: s.needsAge, latest: s.needs[s.needs.length - 1]?.label ?? '' },
  };
}

export const demotionWord = (n: number): string => (n === 1 ? 'demotion' : 'demotions');

/** True when the entry that produced `cur` added a waiting item: the Needs me card pulses. */
export function needsIncreased(prev: Snapshot | undefined, cur: Snapshot): boolean {
  return prev !== undefined && cur.needs.length > prev.needs.length;
}
