import { describe, expect, it } from 'vitest';
import { fx, policy } from '../__tests__/helpers';
import fs from 'node:fs';
import { checkEnvelope } from './envelope';
import { matchesEnvironment, matchesPath } from './glob';
import { parseDiff } from '../parse/diff';
import { parsePolicy } from './load';

const diffOf = (files: [string, number][]): string =>
  files.map(([p, n]) => `diff --git a/${p} b/${p}\n--- a/${p}\n+++ b/${p}\n@@ -1,0 +1,${n} @@\n${Array.from({ length: n }, (_, i) => `+line ${i}`).join('\n')}\n`).join('');

describe('globs', () => {
  it('keeps * inside a segment and lets ** cross folders', () => {
    expect(matchesPath('.gitlab/**', '.gitlab/ci/build.yml')).toBe(true);
    expect(matchesPath('.gitlab/**', 'src/.gitlab/x.yml')).toBe(false);
    expect(matchesPath('src/*.kt', 'src/A.kt')).toBe(true);
    expect(matchesPath('src/*.kt', 'src/deep/A.kt')).toBe(false);
    expect(matchesPath('**/secrets.yml', 'a/b/secrets.yml')).toBe(true);
    expect(matchesPath('a?c', 'abc')).toBe(true);
    expect(matchesPath('v1.2', 'v1x2')).toBe(false); // the dot is literal
  });
  it('matches a slash-less pattern on the file name at any depth', () => {
    expect(matchesPath('CODEOWNERS', 'CODEOWNERS')).toBe(true);
    expect(matchesPath('CODEOWNERS', '.gitlab/CODEOWNERS')).toBe(true);
    expect(matchesPath('.gitlab-ci.yml', 'services/x/.gitlab-ci.yml')).toBe(true);
    expect(matchesPath('CODEOWNERS', 'docs/CODEOWNERS.md')).toBe(false);
  });
  it('matches environments as whole names', () => {
    expect(matchesEnvironment('review/*', 'review/mr-41')).toBe(true);
    expect(matchesEnvironment('review/*', 'review/a/b')).toBe(false);
    expect(matchesEnvironment('staging', 'staging-2')).toBe(false);
  });
});

describe('envelope', () => {
  const p = policy();
  it('accepts the patcher fix inside the hands-off envelope', () => {
    const r = checkEnvelope(p, 'dep-bump.patch', fs.readFileSync(fx('exploit', 'fix.diff'), 'utf8'), ['review/mr-41', 'staging']);
    expect(r).toMatchObject({ within: true, files: 2, lines: 35, violations: [] });
  });
  it('rejects too many files and too many lines, at the policy limits', () => {
    expect(checkEnvelope(p, 'dep-bump.patch', diffOf(Array.from({ length: 6 }, (_, i) => [`a${i}.kt`, 1] as [string, number]))).within).toBe(true);
    const seven = checkEnvelope(p, 'dep-bump.patch', diffOf(Array.from({ length: 7 }, (_, i) => [`a${i}.kt`, 1] as [string, number])));
    expect(seven.within).toBe(false);
    expect(seven.violations[0]).toMatch(/7 files changed, envelope allows 6/);
    expect(checkEnvelope(p, 'code-fix.patch', diffOf([['a.kt', 120]])).within).toBe(true);
    expect(checkEnvelope(p, 'code-fix.patch', diffOf([['a.kt', 121]])).violations[0]).toMatch(/121 lines changed, envelope allows 120/);
  });
  it('rejects a denied path, including a rename away from one', () => {
    for (const path of ['.gitlab-ci.yml', '.gitlab/ci/x.yml', 'CODEOWNERS', 'docs/CODEOWNERS']) {
      const r = checkEnvelope(p, 'dep-bump.patch', diffOf([[path, 1]]));
      expect(r.within, path).toBe(false);
      expect(r.violations[0]).toMatch(/denied path/);
    }
    const rename = 'diff --git a/CODEOWNERS b/owners.txt\nrename from CODEOWNERS\nrename to owners.txt\n';
    expect(checkEnvelope(p, 'dep-bump.patch', rename).within).toBe(false);
    expect(checkEnvelope(p, 'code-fix.patch', diffOf([['.gitlab-ci.yml', 1]])).within).toBe(true); // only dep-bump denies it
  });
  it('allows review and staging for any class, production only for mechanical proof classes', () => {
    const d = diffOf([['a.kt', 1]]);
    expect(checkEnvelope(p, 'code-fix.patch', d, ['review/mr-9', 'staging']).within).toBe(true);
    expect(checkEnvelope(p, 'code-fix.patch', d, ['production']).within).toBe(true); // exploit-test is mechanical
    expect(checkEnvelope(p, 'pipeline.retry', d, ['production']).within).toBe(true); // rerun-stats too
    const guard = checkEnvelope(p, 'guard.block', d, ['production']);
    expect(guard.within).toBe(false);
    expect(guard.violations[0]).toMatch(/production needs a mechanical proof .*cited-diff/);
    expect(checkEnvelope(p, 'code-fix.patch', d, ['eu-prod']).violations[0]).toMatch(/outside the envelope/);
  });
  it('fails closed on an unknown or human-only class', () => {
    expect(checkEnvelope(p, 'nope.class', diffOf([['a', 1]])).violations[0]).toMatch(/unknown action class/);
    expect(checkEnvelope(p, 'report.submit', '').violations[0]).toMatch(/human_only/);
  });
  it('measures an empty diff as zero', () => {
    expect(checkEnvelope(p, 'code-fix.patch', '')).toMatchObject({ within: true, files: 0, lines: 0 });
    expect(parseDiff('')).toEqual([]);
  });
  it('refuses a malformed policy', () => {
    expect(() => parsePolicy({ version: 2 })).toThrow(/version/);
    expect(() => parsePolicy({ version: 1, classes: { x: { agent: 'a', ceiling: 'god' } } })).toThrow(/ceiling/);
  });
});
