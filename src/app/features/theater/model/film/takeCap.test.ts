// A real film is capped at the 8 newest MRs (by last seq), one per take key; only the kept takes' entries are filmed.
import { describe, expect, it } from 'vitest';
import type { LedgerEvent, LedgerKind } from '@/schemas/ledger';
import { ledgerFilm } from './fromLedger';

const ev = (seq: number, iid: number, kind: LedgerKind): LedgerEvent => ({
  seq, at: '2026-10-01T10:00:00Z', agent: 'ai-patcher', action_class: 'dep-bump.patch', kind, tier_at_time: 'supervised',
  subject: { project_id: 1, type: 'mr', iid }, payload_ref: '', observed_by: 'poll', prev_hash: '0', hash: `h${seq}`,
});

/** 10 MRs, !1..!10, two events each: !n has seq 2n-1 and 2n. */
const tenMrs = (merged: number | null) =>
  Array.from({ length: 10 }, (_, k) => k + 1).flatMap((n) => [ev(2 * n - 1, n, 'task_started'), ev(2 * n, n, n === merged ? 'merged' : 'proof_verdict')]);

describe('the real film is capped at 8 takes', () => {
  it('10 MRs give the 8 newest takes, newest first, and only their entries', () => {
    const film = ledgerFilm(tenMrs(null))!;
    expect(film.takes.map((t) => t.mr)).toEqual([10, 9, 8, 7, 6, 5, 4, 3]);
    expect(film.entries).toHaveLength(16);
    expect(new Set(film.entries.map((e) => e.ev?.iid))).toEqual(new Set([3, 4, 5, 6, 7, 8, 9, 10]));
  });

  it('within the kept 8 the newest merged MR goes first; a merged MR older than the cap is not kept', () => {
    expect(ledgerFilm(tenMrs(6))!.takes.map((t) => t.mr)).toEqual([6, 10, 9, 8, 7, 5, 4, 3]);
    const old = ledgerFilm(tenMrs(1))!;
    expect(old.takes.map((t) => t.mr)).toEqual([10, 9, 8, 7, 6, 5, 4, 3]);
  });
});
