import type { DemoData, MaturityProposal, MaturityRung } from '@/lib/demo';
import type { Stage } from '@/schemas';
import { CREDIT_HISTORY } from '../data/credit';
import { MAT_META } from '../data/meta';
import { PROPOSAL_EXTRAS } from '../data/proposals';
import { STAGE_EVIDENCE } from '../data/stageEvidence';
import type { CreditEntry, ProposalExtra, StageEvidence } from '../data/types';

/** A shared-dataset proposal joined with this screen's own data for it. */
export interface Gap extends MaturityProposal {
  x: ProposalExtra;
}

/** Everything the pure model needs, read once from the shared dataset and the screen's fixtures. */
export interface MaturityCtx {
  engine: string;
  scannedAt: string;
  nowClock: string;
  scanAgeMin: number;
  rungNames: readonly string[];
  stages: readonly Stage[];
  base: Readonly<Record<Stage, MaturityRung>>;
  evidence: Readonly<Record<Stage, StageEvidence>>;
  gaps: readonly Gap[];
  credit: readonly CreditEntry[];
  gap: (id: string) => Gap | undefined;
  gapByStage: (stage: Stage) => Gap | undefined;
}

export function makeCtx(
  maturity: DemoData['maturity'],
  stages: readonly Stage[],
  extras: Readonly<Record<string, ProposalExtra>> = PROPOSAL_EXTRAS,
): MaturityCtx {
  const base = Object.fromEntries(maturity.rungs.map((r) => [r.stage, r])) as Record<Stage, MaturityRung>;
  const gaps: Gap[] = [];
  for (const p of maturity.proposals) {
    const x = extras[p.id];
    if (x) gaps.push({ ...p, x });
  }
  return {
    engine: maturity.engine,
    scannedAt: maturity.scannedAt,
    nowClock: MAT_META.nowClock,
    scanAgeMin: MAT_META.scanAgeMin,
    rungNames: maturity.rungNames,
    stages,
    base,
    evidence: STAGE_EVIDENCE,
    gaps,
    credit: CREDIT_HISTORY,
    gap: (id) => gaps.find((g) => g.id === id),
    gapByStage: (stage) => gaps.find((g) => g.stage === stage),
  };
}
