// A gap MR's file paths and branch go to GitLab as a repository path and a git ref. Shapes neither accepts, or that mean
// another file than they spell (./x, a//b, a/./b, a path inside .git), are refused at the door instead of failing after the
// click or reaching a path the preview did not spell.
import { parseDocument } from 'yaml';
import { describe, expect, it } from 'vitest';
import { parseIntent } from '../../intents';

const gap = (over: Record<string, unknown>) => ({
  kind: 'stage-gap-mr', project: 'ledgerline', gap: 'g1', stage: 'secure', from: 1, to: 2, title: 'x', branch: 'belay/gap-g1',
  files: [{ path: 'n/x.yml', content: 'a: 1\n' }], ...over,
});
const withPath = (path: string) => gap({ files: [{ path, content: 'a: 1\n' }] });
const ok = (raw: unknown) => parseIntent(raw).ok;

describe('a gap file path', () => {
  const BAD = ['.git/config', 'a/.git/hooks/x', '.GIT/x', 'a/.Git/x', './x.yml', 'a/./b.yml', 'a//b.yml', 'a/b/.', '.', 'a/b/'];
  const GOOD = ['.gitlab-ci.yml', '.gitlab/belay/f0.yml', '.gitignore', 'a/.gitattributes', 'x.git/y', 'ci/.gitlab-ci.yml', 'n/x.yml'];

  it.each(BAD)('refuses %s', (path) => expect(ok(withPath(path))).toBe(false));
  it.each(GOOD)('admits %s', (path) => expect(ok(withPath(path))).toBe(true));

  it('refuses two spellings of one file in one MR', () => {
    expect(ok(gap({ files: [{ path: 'a/b.yml', content: 'x' }, { path: 'a//b.yml', content: 'y' }] }))).toBe(false);
  });
});

describe('a gap branch', () => {
  const BAD = ['belay/x/', 'belay/x.', 'belay/x.lock', 'belay//x', 'belay/.x', 'belay/a/.b', 'belay/a.lock/b', 'belay/x..y'];
  const GOOD = ['belay/gap-g1', 'belay/gap_g1.2', 'belay/a/b', 'belay/gap-x', 'belay/v1.0'];

  it.each(BAD)('refuses %s', (branch) => expect(ok(gap({ branch }))).toBe(false));
  it.each(GOOD)('admits %s', (branch) => expect(ok(gap({ branch }))).toBe(true));
});

describe("a gap branch never takes a branch Belay's other writes plan", () => {
  // Derived from the plans themselves: each branch a promote, enroll, arm or disarm preview names is refused as a gap's.
  // A gap on belay/arm-guardrail used to open, and then the operator's arm was refused for the gap's own open MR.
  it('refuses the branch of every other branch MR, as previewed', async () => {
    const { liveRig, policyFiles } = await import('../rig');
    const { previewIntent } = await import('../../run');
    const { DEMO_PIN } = await import('../../arm/config');
    const { gl, deps } = await liveRig();
    const policy = policyFiles(gl);
    const doc = parseDocument(policy['tier-state.yml'] ?? '');
    doc.deleteIn(['agents', 'ai-guardrail-acme-lab']); // so T4 has a class to enroll
    policy['tier-state.yml'] = doc.toString({ lineWidth: 0 });
    const armed = { ...deps, arm: { ok: true as const, pin: DEMO_PIN } };
    const branches: string[] = [];
    for (const intent of [
      { kind: 'promote-class', project: 'ledgerline', class: 'qa.file-bug', to: 'hands_off' },
      { kind: 'enroll-track', project: 'ledgerline', track: 'T4' },
      { kind: 'arm-track', project: 'ledgerline', track: 'T3' },
      { kind: 'disarm-track', project: 'ledgerline', track: 'T4' },
    ]) {
      const p = await previewIntent(armed, intent);
      if (p.status === 'preview' && p.preview.branch) branches.push(p.preview.branch);
    }
    expect(branches).toHaveLength(4);
    for (const branch of branches) expect(ok(gap({ branch })), branch).toBe(false);
  });
});
