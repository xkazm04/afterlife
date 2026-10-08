// n1's evidence is qa.file-bug's own: the proofs and the section's aux follow the demo fixture's class record, so a
// fixture change that leaves them behind breaks this.
import { describe, expect, it } from 'vitest';
import { PROMOTE, PROOFS, proofsAux } from './promote';
import { pickNeedsYouDemo } from './pick';

describe('n1 proofs', () => {
  const { promote } = pickNeedsYouDemo();

  it('are the promoted class\'s record: how many, how many edited, and the aux text', () => {
    expect(promote.cls).toBe('qa.file-bug');
    expect(PROOFS).toHaveLength(promote.record.accepted);
    expect(PROOFS.filter((p) => p.edited).length / PROOFS.length).toBeCloseTo(1 - promote.record.noEdit);
    expect(proofsAux(promote.record)).toBe(`${promote.record.accepted} · ${Math.round(promote.record.noEdit * 100)} % no edit`);
    expect(proofsAux(promote.record)).not.toContain('94');
  });

  it('hold QA bug filings and say nothing of the patcher class', () => {
    for (const p of PROOFS) expect(p.ref).toMatch(/^#\d+$/);
    expect(PROOFS.map((p) => p.title).join('\n')).not.toMatch(/bump|patch/i);
    expect(PROMOTE.doesNot.join('\n')).not.toContain('code-fix.patch');
  });
});
