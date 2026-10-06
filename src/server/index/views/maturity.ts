// The Maturity screen: the latest scan's nine cells and the gap proposals. A cell whose rung the scan could not
// determine stays null; it is never turned into "absent".
import { RUNGS, STAGES, type Stage } from '@/schemas/stages';
import { listOpenProposals } from '../repositories/work/proposal';
import { latestStageCells } from '../repositories/work/stageCell';
import type { Queryable } from '../repositories/sql';
import { clock } from './format';
import type { MaturityView } from './types';

const STAGE_SET: ReadonlySet<string> = new Set(STAGES);

/** The same value as DEMO.maturity for one project, or null when it has never been scanned. */
export async function getMaturity(db: Queryable, projectId: string): Promise<MaturityView | null> {
  const cells = await latestStageCells(db, projectId);
  const first = cells[0];
  if (!first) return null;
  const byStage = new Map(cells.map((c) => [c.stage, c]));
  const picks = await listOpenProposals(db, projectId, true);
  return {
    engine: first.engineVersion ?? 'unknown',
    scannedAt: clock(first.scannedAt),
    rungNames: [...RUNGS],
    rungs: STAGES.flatMap((stage) => {
      const c = byStage.get(stage);
      if (!c) return [];
      const evidence = c.evidenceNote ?? c.evidence.map((e) => e.label).join(' · ');
      return [{ stage, day0: c.baseRung, now: c.rung, next: c.nextRung, evidence }];
    }),
    proposals: picks
      .filter((p) => p.kind === 'gap' && typeof p.subject.stage === 'string' && STAGE_SET.has(p.subject.stage))
      .map((p) => ({
        id: p.id,
        stage: p.subject.stage as Stage,
        from: Number(p.subject.from),
        to: Number(p.subject.to),
        title: p.title,
        picked: p.subject.picked === true,
        diffLines: Number(p.subject.diffLines),
      })),
  };
}
