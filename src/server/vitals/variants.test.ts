// classifyVariant over rules shaped like Grinex Portal's: the hotfix lane before master full (first match wins),
// nightly by its schedule reason, feature PRs by a branch glob on the PR-validation pipeline.
import { describe, expect, it } from 'vitest';
import type { CiRun, VariantRule } from '@/schemas/vitals';
import { branchGlob, classifyVariant } from './variants';

/** Pipeline 2 is azure-pipelines.yml; 4 is the scheduled one; 9 stands in for pr-validation.yml, not registered in ADO yet. */
const RULES: VariantRule[] = [
  { id: 'master-hotfix', pipelineId: '2', match: { branch: 'master', reason: ['individualCI', 'manual'], parameter: { name: 'LANE', value: 'hotfix' } } },
  { id: 'master-full', pipelineId: '2', match: { branch: 'master', reason: ['individualCI', 'manual'] } },
  { id: 'nightly', pipelineId: '4', match: { reason: ['schedule'] } },
  { id: 'pr-feature', pipelineId: '9', match: { branch: 'feature/*' } },
];

const run = (o: Partial<CiRun>): CiRun => ({
  key: 'k', provider: 'azure-pipelines', pipelineId: '2', pipelineName: 'Grinex Portal', runId: '1', branch: 'master', reason: 'individualCI',
  sha: 's', result: 'succeeded', startedAt: '2026-10-24T00:00:00.000Z', stages: [], fetchedAt: '2026-10-25T00:00:00.000Z', ...o,
});

describe('classifyVariant', () => {
  it.each<[string, Partial<CiRun>, string | undefined]>([
    ['a CI push to master', {}, 'master-full'],
    ['a manual master run', { reason: 'manual' }, 'master-full'],
    ['a master run in the hotfix lane', { parameters: { LANE: 'hotfix', ciPool: 'selfhosted' } }, 'master-hotfix'],
    ['the normal lane is not hotfix', { parameters: { LANE: 'normal' } }, 'master-full'],
    ['a scheduled run of pipeline 2 is no rule of 2', { reason: 'schedule' }, undefined],
    ['the scheduled pipeline', { pipelineId: '4', reason: 'schedule' }, 'nightly'],
    ['a feature PR', { pipelineId: '9', branch: 'feature/login', reason: 'pullRequest' }, 'pr-feature'],
    ['a nested feature branch is not `feature/*`', { pipelineId: '9', branch: 'feature/a/b' }, undefined],
    ['a feature branch on the main pipeline', { branch: 'feature/login' }, undefined],
  ])('%s', (_, o, want) => {
    expect(classifyVariant(run(o), RULES)).toBe(want);
  });

  it('order matters: with master-full first, the hotfix lane is never reached', () => {
    expect(classifyVariant(run({ parameters: { LANE: 'hotfix' } }), [RULES[1], RULES[0]] as VariantRule[])).toBe('master-full');
  });
});

describe('branchGlob', () => {
  it('`*` stays within a segment, `**` crosses them, the rest is literal', () => {
    expect(branchGlob('feature/*').test('feature/x')).toBe(true);
    expect(branchGlob('feature/*').test('feature/x/y')).toBe(false);
    expect(branchGlob('feature/**').test('feature/x/y')).toBe(true);
    expect(branchGlob('release/v1.2').test('release/v1x2')).toBe(false);
    expect(branchGlob('master').test('master2')).toBe(false);
  });
});
