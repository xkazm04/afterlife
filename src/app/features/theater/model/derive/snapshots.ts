// The state at any ledger entry is a pure fold over the slice up to it. One pass builds all snapshots, so
// a take replays exactly and seeking is an array lookup.
import type { Ceiling, Stage } from '@/schemas';
import { INITIAL } from '../../data/constants';
import { indexOfSeq } from '../replay/state';
import type { CheckId, Film, LedgerEntry, NeedItem } from '../types';
import { ageText, secs } from './time';

export interface Snapshot {
  /** Index into the ledger. */
  i: number;
  e: LedgerEntry;
  /** 0 = on the ground, 1..9 = the hold the !41 climber is at. */
  beat: number;
  /** The beat before this entry (the climb eases from it). */
  from: number;
  /** The holds an entry has reached so far, ascending: a hold below the climber that no entry reached stays unclimbed. */
  reached: readonly number[];
  now: string;
  pass: number;
  fail: number;
  dem: number;
  needs: readonly NeedItem[];
  /** Age of the oldest waiting item, as of this entry. */
  needsAge: string;
  tiers: Readonly<Record<string, Ceiling>>;
  rungs: Readonly<Record<string, number>>;
  checks: readonly CheckId[];
  /** The nine-stage wall is showing. */
  board: boolean;
  /** The class demoted by exactly this entry (drives the drop animation), if any. */
  droppedNow: string | null;
  /** How many of the nine stages hold a rung of 2 or more. */
  stagesN: number;
}

/** Where a fold starts. */
export type Start = Pick<Snapshot, 'now' | 'pass' | 'fail' | 'needs' | 'tiers' | 'rungs'>;

/** A real film starts from nothing: no counts, tiers, rungs or needs the ledger did not state. */
export const EMPTY: Start = { now: '', pass: 0, fail: 0, needs: [], tiers: {}, rungs: {} };

/** A stage counts as "with evidence" from rung 2 (running) upward. */
export const EVIDENCE_RUNG = 2;

export function buildSnapshots(ledger: readonly LedgerEntry[], stages: readonly Stage[], start: Start = INITIAL): Snapshot[] {
  let beat = 0;
  let { now, pass, fail, needs, tiers, rungs } = start;
  let dem = 0;
  let board = false;
  let reached: readonly number[] = [];
  let checks: readonly CheckId[] = [];
  const out: Snapshot[] = [];

  ledger.forEach((e, i) => {
    const from = beat;
    const was = e.tier ? tiers[e.tier.cls] : undefined;
    if (e.beat != null) beat = e.beat;
    if (e.beat && !reached.includes(e.beat)) reached = [...reached, e.beat].sort((a, b) => a - b);
    if (e.now) now = e.now;
    pass += e.pass ?? 0;
    fail += e.fail ?? 0;
    dem += e.dem ?? 0;
    if (e.rung) rungs = { ...rungs, ...Object.fromEntries(e.rung) };
    if (e.check) checks = [...checks, e.check];
    if (e.tier) tiers = { ...tiers, [e.tier.cls]: e.tier.to };
    if (e.need) needs = [...needs, e.need];
    if (e.board) board = true;
    const oldest = needs.reduce((a, n) => (secs(n.since) < secs(a.since) ? n : a), needs[0] ?? { since: e.t });
    out.push({
      i,
      e,
      beat,
      from,
      reached,
      now,
      pass,
      fail,
      dem,
      needs,
      needsAge: ageText(oldest.since, e.t),
      tiers,
      rungs,
      checks,
      board,
      // a drop only where the class held a different tier before this entry
      droppedNow: e.tier && was !== undefined && was !== e.tier.to ? e.tier.cls : null,
      stagesN: stages.filter((st) => (rungs[st] ?? 0) >= EVIDENCE_RUNG).length,
    });
  });
  return out;
}

/** A film's snapshots: the illustrative slice is one fold from INITIAL; a real film folds each take (MR) from EMPTY. */
export function filmSnapshots(film: Pick<Film, 'source' | 'entries' | 'takes'>, stages: readonly Stage[]): Snapshot[] {
  if (film.source === 'illustrative') return buildSnapshots(film.entries, stages);
  return film.takes.flatMap((t) => {
    const a = indexOfSeq(t.a, film);
    const b = indexOfSeq(t.b, film);
    if (a < 0 || b < a) return [];
    return buildSnapshots(film.entries.slice(a, b + 1), stages, EMPTY).map((s) => ({ ...s, i: s.i + a }));
  });
}
