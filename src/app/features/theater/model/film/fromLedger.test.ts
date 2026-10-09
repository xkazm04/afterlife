// The real film: the fake group's belay-ledger (server/gitlab/fake/demo/ledger.ts: !41 task_started, proof_verdict,
// guardrail_verdict pass, merged, deployed; !44 guardrail_verdict block, tier_decision quarantined) mapped MR by MR.
import { describe, expect, it } from 'vitest';
import { STAGES } from '@/schemas/stages';
import type { LedgerEvent } from '@/schemas/ledger';
import { ledgerEvents } from '@/server/gitlab/fake/demo/ledger';
import { SEED_NOW } from '@/server/index/seed';
import { INITIAL } from '../../data/constants';
import { REPLAY_LEDGER } from '../../data/ledger';
import { filmSnapshots } from '../derive/snapshots';
import { reduce } from '../replay/reducer';
import { initialState } from '../replay/state';
import { entriesOf, ledgerFilm } from './fromLedger';
import { holdOf, KIND_HOLD } from './holds';

const events = ledgerEvents(SEED_NOW);
const of = (iid: number) => events.filter((e) => e.subject.iid === iid);
/** Every string the invented slice carries: its lines and its "doing now" texts. */
const INVENTED = REPLAY_LEDGER.flatMap((e) => [e.x, e.now ?? '']).filter(Boolean);

describe('one MR\'s events -> the film\'s entries', () => {
  const e41 = entriesOf(of(41));

  it('reaches only the holds the kind-to-hold table names: !41 proof 4, guardrail 5, merged 6; task_started and deployed move nothing', () => {
    expect(e41.map((e) => e.beat ?? null)).toEqual([null, 4, 5, 6, 8]);
    expect(of(41).map((e) => holdOf(e))).toEqual([null, 4, 5, 6, 8]);
    expect(of(41).map((e) => KIND_HOLD[e.kind])).toEqual([null, 4, 5, 6, null]); // deployed is by tier: see holdOf
    const snaps = filmSnapshots(ledgerFilm(of(41))!, STAGES);
    expect(snaps.map((s) => s.beat)).toEqual([0, 4, 5, 6, 8]);
    // holds 1-3, 7 and 9 are never reached: they stay unclimbed
    expect(snaps.at(-1)?.reached).toEqual([4, 5, 6, 8]);
  });

  it('states only what each event states: at, agent, kind, class, tier at the time, verdict, the MR, seq, a hash prefix', () => {
    const g = e41[2]!;
    const ev = of(41)[2]!;
    expect(g).toMatchObject({ seq: ev.seq, by: ev.agent, t: ev.at.slice(11, 19) });
    expect(g.ev).toEqual({ at: ev.at, kind: 'guardrail_verdict', actionClass: 'dep-bump.patch', tier: 'hands_off', verdict: 'pass', iid: 41, hash: ev.hash.slice(0, 12) });
    expect(e41[0]?.ev).not.toHaveProperty('verdict');
    for (const e of e41) expect(e).not.toHaveProperty('seeded');
  });

  it('carries no text from the invented slice, and no INITIAL value', () => {
    const text = JSON.stringify(entriesOf(events));
    for (const x of INVENTED) expect(text).not.toContain(x);
    expect(text).not.toContain(INITIAL.now);
    const last = filmSnapshots(ledgerFilm(events)!, STAGES).at(-1)!;
    expect([last.pass, last.fail, last.dem, last.needs, last.rungs]).toEqual([0, 0, 0, [], {}]);
  });
});

describe('a deployed event reaches the hold of its environment\'s tier', () => {
  const deployed = (environment?: LedgerEvent['environment']) => ({ ...of(41)[4]!, ...(environment ? { environment } : {}) });

  it('staging is hold 7, production hold 8; any other tier, or none stated, reaches none', () => {
    expect(holdOf(deployed({ name: 'staging', tier: 'staging' }))).toBe(7);
    expect(holdOf(deployed({ name: 'production', tier: 'production' }))).toBe(8);
    for (const tier of ['testing', 'development', 'other'] as const) expect(holdOf(deployed({ name: 'x', tier }))).toBeNull();
    expect(holdOf({ kind: 'deployed' })).toBeNull();
  });

  it('the real film of the fake chain reaches holds 4, 5, 6 and 8, and the entry says where it deployed', () => {
    const film = ledgerFilm(events)!;
    const snaps = filmSnapshots(film, STAGES);
    expect(snaps[4]?.reached).toEqual([4, 5, 6, 8]);
    expect(film.entries[4]?.ev?.environment).toEqual({ name: 'production', tier: 'production' });
    expect(film.entries[4]?.x).toContain('production (production)');
  });
});

describe('the takes: one per MR', () => {
  it('the first take is the newest MR with a merged event: !41, then !44', () => {
    const film = ledgerFilm(events)!;
    expect(film.source).toBe('belay-ledger');
    expect(film.takes.map((t) => [t.name, t.mr, t.a, t.b])).toEqual([['!41', 41, 1, 5], ['!44', 44, 6, 7]]);
    expect(film.entries.map((e) => e.seq)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('no MR merged: the newest MR first; non-MR events are not filmed; no MR at all: no film', () => {
    const unmerged = events.filter((e) => e.kind !== 'merged');
    expect(ledgerFilm(unmerged)?.takes.map((t) => t.mr)).toEqual([44, 41]);
    const pipe: LedgerEvent[] = events.map((e) => ({ ...e, subject: { ...e.subject, type: 'pipeline' } }));
    expect(ledgerFilm(pipe)).toBeNull();
    expect(ledgerFilm([])).toBeNull();
  });

  it('each MR\'s fold starts from the empty state: !44 does not inherit !41\'s climb', () => {
    const snaps = filmSnapshots(ledgerFilm(events)!, STAGES);
    expect(snaps.map((s) => s.i)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(snaps[5]?.reached).toEqual([5]);
    expect(snaps[6]?.tiers).toEqual({ 'patch-bump': 'quarantined' });
    expect(snaps[6]?.droppedNow).toBe('patch-bump'); // supervised at the guardrail, quarantined by the tier decision
  });
});

describe('the player on a real film', () => {
  it('cues each MR take, the selected take follows the playhead across MRs, and a cue past the last take clamps', () => {
    let s = reduce(initialState(ledgerFilm(events)!), { type: 'cue', take: 1 });
    expect([s.i, s.take, s.counts]).toEqual([5, 1, [0, 0]]);
    s = reduce(s, { type: 'seek', i: 2 });
    expect(s.take).toBe(0);
    s = reduce(s, { type: 'cue', take: 7 });
    expect([s.i, s.take]).toEqual([5, 1]);
  });
});
