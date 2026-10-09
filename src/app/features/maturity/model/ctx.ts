import type { DemoData, MaturityProposal, MaturityRung } from '@/lib/demo';
import type { Stage } from '@/schemas';
import { CREDIT_HISTORY } from '../data/credit';
import { MAT_META } from '../data/meta';
import { PROPOSAL_EXTRAS } from '../data/proposals';
import { STAGE_EVIDENCE } from '../data/stageEvidence';
import type { CreditEntry, ProposalExtra, StageEvidence } from '../data/types';
import type { DataMode } from '../write/gap';
import { NOT_SCANNED_AT } from './rungs';

/** A shared-dataset proposal joined with this screen's own data for it. */
export interface Gap extends MaturityProposal {
  x: ProposalExtra;
}

/**
 * Everything the pure model needs, read once from the shared dataset and the screen's fixtures. In live mode the fixtures
 * that would pass for the project's own are left out (null or empty): the demo clock and scan age, the per-rung evidence
 * objects and Day 0 notes, the credit history. A gap's text and files stay a fixture in every mode, and the screen marks
 * them "demo" in live mode (`live`).
 */
export interface MaturityCtx {
  live: boolean;
  /** Whether the source holds a scan at all (live mode before the first scan: no). */
  scanned: boolean;
  engine: string;
  scannedAt: string;
  /** The demo's simulated "now" a rescan stamps; null in live mode, where nothing invents a time. */
  nowClock: string | null;
  /** The demo's scan age; null in live mode, where the view carries the scan's clock time only. */
  scanAgeMin: number | null;
  rungNames: readonly string[];
  stages: readonly Stage[];
  base: Readonly<Record<Stage, MaturityRung>>;
  /** The demo's evidence objects per rung, what the next rung lacks, the Day 0 note; null in live mode. */
  evidence: Readonly<Record<Stage, StageEvidence>> | null;
  gaps: readonly Gap[];
  /** The demo's past autopilot cycles; empty in live mode (Belay records no credit history yet). */
  credit: readonly CreditEntry[];
  gap: (id: string) => Gap | undefined;
  gapByStage: (stage: Stage) => Gap | undefined;
}

export function makeCtx(
  maturity: DemoData['maturity'],
  stages: readonly Stage[],
  { mode = 'demo', extras = PROPOSAL_EXTRAS }: { mode?: DataMode; extras?: Readonly<Record<string, ProposalExtra>> } = {},
): MaturityCtx {
  const live = mode === 'live';
  const base = Object.fromEntries(maturity.rungs.map((r) => [r.stage, r])) as Record<Stage, MaturityRung>;
  const gaps: Gap[] = [];
  for (const p of maturity.proposals) {
    const x = extras[p.id];
    if (x) gaps.push({ ...p, x });
  }
  return {
    live,
    scanned: maturity.scannedAt !== NOT_SCANNED_AT,
    engine: maturity.engine,
    scannedAt: maturity.scannedAt,
    nowClock: live ? null : MAT_META.nowClock,
    scanAgeMin: live ? null : MAT_META.scanAgeMin,
    rungNames: maturity.rungNames,
    stages,
    base,
    evidence: live ? null : STAGE_EVIDENCE,
    gaps,
    credit: live ? [] : CREDIT_HISTORY,
    gap: (id) => gaps.find((g) => g.id === id),
    gapByStage: (stage) => gaps.find((g) => g.stage === stage),
  };
}
