// The takes keep their order (the newest merged MR first, then newest first) while MRs interleave in seq, so a seq does
// not rise with the reel index. Marks, ranges and rolls work in reel index space; a seq is only a label.
import { describe, expect, it } from 'vitest';
import type { LedgerEvent, LedgerKind } from '@/schemas/ledger';
import { reduce, type Action } from '../replay/reducer';
import { initialState, rangeLabel, seqLabel, seqRange, slateText, type ReplayState } from '../replay/state';
import { ledgerFilm } from './fromLedger';

const ev = (seq: number, iid: number, kind: LedgerKind): LedgerEvent => ({
  seq, at: `2026-10-01T10:00:${String(seq).padStart(2, '0')}Z`, agent: 'ai-patcher', action_class: 'dep-bump.patch', kind, tier_at_time: 'supervised',
  subject: { project_id: 1, type: 'mr', iid }, payload_ref: '', observed_by: 'poll', prev_hash: '0', hash: `h${seq}`,
});

// !10: seq 1 2 3, !20 (merged): 4 7, !30: 5 6 8. Order by last seq: !30, !20, !10; the merged !20 goes first.
const events = [
  ev(1, 10, 'task_started'), ev(2, 10, 'proof_verdict'), ev(3, 10, 'guardrail_verdict'),
  ev(4, 20, 'task_started'), ev(5, 30, 'task_started'), ev(6, 30, 'proof_verdict'), ev(7, 20, 'merged'), ev(8, 30, 'guardrail_verdict'),
];
const film = ledgerFilm(events)!;
const run = (s: ReplayState, ...as: Action[]) => as.reduce(reduce, s);
const reel = { entries: film.entries, takes: film.takes };

describe('a film whose MRs interleave in seq', () => {
  it('keeps the take order and labels each take by the lowest and highest seq of its own entries', () => {
    expect(film.takes.map((t) => [t.name, t.a, t.b])).toEqual([['!20', 4, 7], ['!30', 5, 8], ['!10', 1, 3]]);
    expect(film.entries.map((e) => e.seq)).toEqual([4, 7, 5, 6, 8, 1, 2, 3]);
  });

  it('reads no seq range backwards: the legend and the inspector label the reel by its lowest and highest seq', () => {
    expect(seqRange(reel)).toEqual({ a: 1, b: 8 });
    expect(seqLabel(reel, 0, 1)).toEqual({ a: 4, b: 7 });
    for (const k of film.takes.keys()) {
      const l = rangeLabel({ reel, take: k, mark: null });
      expect(l.a).toBeLessThanOrEqual(l.b);
    }
  });

  it('marks in then out in reel order, whatever the seqs', () => {
    let s = run(initialState(reel), { type: 'cue', take: 0 }, { type: 'seek', i: 1 }, { type: 'markIn' });
    expect(s.mark).toEqual({ a: 1, b: 1 });
    s = run(s, { type: 'seek', i: 4 }, { type: 'markOut' });
    expect(s.mark).toEqual({ a: 1, b: 4 });
    expect(rangeLabel(s)).toEqual({ a: 5, b: 8 });
    expect(slateText(s)).toContain('in 5 → out 8 (marked)');
    s = run(s, { type: 'roll' });
    expect([s.i, s.stopAt]).toEqual([1, 4]);
  });

  it('rolls each take to that take\'s last entry', () => {
    const lastOf = [1, 4, 7];
    const firstOf = [0, 2, 5];
    film.takes.forEach((_, k) => {
      const s = run(initialState(reel), { type: 'cue', take: k }, { type: 'roll' });
      expect([s.i, s.stopAt]).toEqual([firstOf[k], lastOf[k]]);
      const done = run(s, { type: 'tick', dt: 3000 }, { type: 'tick', dt: 1_000_000 });
      expect(done.i).toBe(lastOf[k]);
    });
  });
});
