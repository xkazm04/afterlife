// The state at any ledger entry is a pure fold over the slice up to it. One pass builds all snapshots, so
// a take replays exactly and seeking is an array lookup.
import type { Ceiling, Stage } from '@/schemas';
import { INITIAL } from '../../data/constants';
import type { CheckId, LedgerEntry, NeedItem } from '../types';
import { ageText, secs } from './time';

export interface Snapshot {
  /** Index into the ledger. */
  i: number;
  e: LedgerEntry;
  /** 0 = on the ground, 1..9 = the hold the !41 climber is at. */
  beat: number;
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

/** A stage counts as "with evidence" from rung 2 (running) upward. */
export const EVIDENCE_RUNG = 2;

export function buildSnapshots(ledger: readonly LedgerEntry[], stages: readonly Stage[]): Snapshot[] {
  let beat = 0;
  let now: string = INITIAL.now;
  let pass = INITIAL.pass;
  let fail = INITIAL.fail;
  let dem = 0;
  let board = false;
  let needs: readonly NeedItem[] = INITIAL.needs;
  let tiers: Readonly<Record<string, Ceiling>> = INITIAL.tiers;
  let rungs: Readonly<Record<string, number>> = INITIAL.rungs;
  let checks: readonly CheckId[] = [];
  const out: Snapshot[] = [];

  ledger.forEach((e, i) => {
    if (e.beat != null) beat = e.beat;
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
      droppedNow: e.tier ? e.tier.cls : null,
      stagesN: stages.filter((st) => (rungs[st] ?? 0) >= EVIDENCE_RUNG).length,
    });
  });
  return out;
}
