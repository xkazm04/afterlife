// A gap MR's file paths and branch go to GitLab as a repository path and a git ref. Shapes neither accepts, or that mean
// another file than they spell (./x, a//b, a/./b, a path inside .git), are refused at the door instead of failing after the
// click or reaching a path the preview did not spell.
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
