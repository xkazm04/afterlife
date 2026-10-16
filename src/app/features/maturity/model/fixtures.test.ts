// The screen's fixtures are hand-copied from one another and from the shared dataset. These pin the copies to their sources.
import { describe, expect, it } from 'vitest';
import { CREDIT_HISTORY } from '../data/credit';
import { PROPOSAL_EXTRAS } from '../data/proposals';
import { STAGE_EVIDENCE } from '../data/stageEvidence';
import { ctx } from './testCtx';

describe('fixtures agree with the dataset and with each other', () => {
  it('each stage lists evidence objects for exactly the rungs it holds (R1..now), so no earned rung reads "1 object" with none listed', () => {
    for (const stage of ctx.stages) {
      const now = ctx.base[stage].now ?? 0;
      const listed = Object.keys(STAGE_EVIDENCE[stage].objs).map(Number).sort();
      expect(listed, stage).toEqual(Array.from({ length: now }, (_, i) => i + 1));
    }
  });

  it('the Plan evidence names the work items the proposals open, no more and no fewer', () => {
    const label = STAGE_EVIDENCE.plan.objs[1]?.find((o) => o.kind === 'work item')?.label ?? '';
    const named = label.match(/#\d+/g) ?? [];
    expect(named.sort()).toEqual(Object.values(PROPOSAL_EXTRAS).map((x) => x.workItem).sort());
  });

  it('a credited MR the history names is the one the stage evidence says added the file', () => {
    const added = (stage: keyof typeof STAGE_EVIDENCE) => Object.values(STAGE_EVIDENCE[stage].objs).flat().map((o) => o?.ref ?? '').join(' ');
    const first = CREDIT_HISTORY.find((c) => c.verdict === 'credited' && c.move === 'R0 → R1');
    expect(first?.stage).toBe('secure');
    expect(added('secure')).toContain(`added by ${first?.mr}`);
  });
});
