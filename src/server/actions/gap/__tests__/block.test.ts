// The gap block as text: where it goes in .gitlab-ci.yml, what it refuses, and that the catalogue says the scan's words.
import { describe, expect, it } from 'vitest';
import { propose } from '../../../../../engine/scan/scan';
import { STAGES } from '@/schemas/stages';
import { GAP_TEMPLATES } from '../../types';
import { gapBlock, gapBlocker, holdsGapBlock, insertGapBlock } from '../block';
import { TEMPLATES, templateFor } from '../templates';

const b = { stage: 'package', id: 'package-build', templates: ['Jobs/Build.gitlab-ci.yml'] } as const;

describe('insertGapBlock', () => {
  it('adds include: at the end when the file has none', () => {
    const r = insertGapBlock('stages: [build]\n', b);
    if (!r.ok) throw new Error(r.reason);
    expect(r.content).toBe(`stages: [build]\n${r.added.join('\n')}\n`);
    expect(r.added.slice(1)).toEqual(['include:', '  - template: Jobs/Build.gitlab-ci.yml', '# belay:gap package package-build end']);
    expect(holdsGapBlock(r.content, b)).toBe(true);
  });

  it('follows a list at the key\'s own indent, and keeps every other line as it was', () => {
    const text = 'include:\n- local: ci/a.yml\n\nbuild:\n  script: make\n';
    const r = insertGapBlock(text, b);
    if (!r.ok) throw new Error(r.reason);
    expect(r.added[1]).toBe('- template: Jobs/Build.gitlab-ci.yml');
    expect(r.content.split('\n').filter((l) => !r.added.includes(l))).toEqual(text.split('\n'));
    expect(holdsGapBlock(r.content, b)).toBe(true);
  });

  it('refuses a one-line include: and an include: that is not a list', () => {
    expect(insertGapBlock('include: ci/a.yml\n', b)).toMatchObject({ ok: false, reason: expect.stringMatching(/on one line/) });
    expect(insertGapBlock('include:\n  local: ci/a.yml\n', b)).toMatchObject({ ok: false, reason: expect.stringMatching(/not a list/) });
  });

  it('marks the block with a digest of exactly its lines', () => {
    const [begin] = gapBlock(b, '  ', false);
    expect(begin).toMatch(/^ {2}# belay:gap package package-build begin [0-9a-f]{12}$/);
    expect(gapBlock(b, '  ', false)).toEqual(gapBlock(b, '  ', false));
    expect(gapBlock({ ...b, templates: ['Jobs/Other.gitlab-ci.yml'] }, '  ', false)[0]).not.toBe(begin);
  });
});

describe('gapBlocker', () => {
  it('refuses a gap block already there, a template already included, and a file that is not YAML', () => {
    const r = insertGapBlock('include:\n  - local: a.yml\n', b);
    if (!r.ok) throw new Error(r.reason);
    expect(gapBlocker(r.content, b)).toMatch(/already has a belay:gap package-build block/);
    expect(gapBlocker('include:\n  - template: Jobs/Build.gitlab-ci.yml\n', b)).toMatch(/already includes Jobs\/Build/);
    expect(gapBlocker('include: { template: Jobs/Build.gitlab-ci.yml }\n', b)).toMatch(/already includes/);
    expect(gapBlocker('include: [\n', b)).toMatch(/not valid YAML/);
    expect(gapBlocker('include:\n  - local: a.yml\n', b)).toBeNull();
  });
});

describe('the template catalogue', () => {
  it('has one entry per GAP_TEMPLATES id, each saying the scan\'s next change for its stage word for word', () => {
    expect(Object.keys(TEMPLATES).sort()).toEqual([...GAP_TEMPLATES].sort());
    const scan = { source: 'gitlab' as const, cells: STAGES.map((stage) => ({ stage, rung: 0 })) };
    const next = new Map(propose(scan).map((p) => [p.stage, p]));
    for (const t of Object.values(TEMPLATES)) expect({ change: t.change, to: t.to }).toEqual({ change: next.get(t.stage)?.change, to: next.get(t.stage)?.to });
  });

  it('refuses a template for another stage or rung', () => {
    expect(templateFor('plan-issue-templates', 'plan', 1)).toBe(TEMPLATES['plan-issue-templates']);
    expect(templateFor('plan-issue-templates', 'secure', 1)).toMatch(/earns plan R1, not secure R1/);
  });
});
