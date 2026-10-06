import { describe, expect, it } from 'vitest';
import { ctx } from '../testCtx';
import { addedLines, commandLines, sendLabel } from './commands';

const gap = (id: string) => {
  const g = ctx.gap(id);
  if (!g) throw new Error(`no gap ${id}`);
  return g;
};

describe('fixtures', () => {
  it('every proposal has its screen data and the diff size the dataset states', () => {
    expect(ctx.gaps.map((g) => g.id)).toEqual(['g1', 'g2', 'g3', 'g4']);
    for (const g of ctx.gaps) expect(addedLines(g), g.id).toBe(g.diffLines);
  });
});

describe('commandLines', () => {
  it('shows the exact commit and MR commands for a gap', () => {
    const lines = commandLines(gap('g1'));
    expect(lines[0]?.note).toBe('# 1 · one commit, 2 file actions, new branch, as you');
    expect(lines[1]?.code).toBe('glab api --method POST "projects/acme-lab%2Fledgerline/repository/commits" \\');
    expect(lines[2]).toEqual({ code: '  --input belay-gap-g1.commit.json', note: '# branch belay/gap-g1-sbom-rederive' });
    expect(lines[4]?.code).toBe('glab mr create --repo acme-lab/ledgerline --source-branch belay/gap-g1-sbom-rederive --target-branch main \\');
    expect(lines[5]?.code).toBe(
      '  --title "Maturity gap g1: Re-derive every scanner finding against the shipped SBOM" --label maturity::gap --related-issue 131',
    );
  });
  it('uses the singular for one file action', () => {
    expect(commandLines(gap('g2'))[0]?.note).toBe('# 1 · one commit, 1 file action, new branch, as you');
  });
  it('writes nothing for the probe', () => {
    const lines = commandLines(gap('g4'));
    expect(lines).toEqual([
      { note: '# reads the alert integration and alerts; writes nothing' },
      { code: 'npx belay probe monitor --project acme-lab/ledgerline --read-only' },
    ]);
  });
});

describe('sendLabel', () => {
  it('counts MRs and mentions a probe riding along', () => {
    expect(sendLabel(2, 0)).toBe('Open 2 MRs as you');
    expect(sendLabel(1, 0)).toBe('Open 1 MR as you');
    expect(sendLabel(0, 1)).toBe('Run probe');
    expect(sendLabel(1, 1)).toBe('Open 1 MR as you + probe');
  });
});
