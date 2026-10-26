// The start-run intent's validator and its one command line: every flag combination, as a string.
import { describe, expect, it } from 'vitest';
import { nodeArgv, runDisplay, runNotes } from '../command';
import { parseStartRun } from '../intent';
import type { StartRun } from '../types';

const ok: StartRun = { kind: 'start-run', repo: 'grinex-portal', mode: 'execute', waves: 5, lanes: 4, laneCapUsd: 3, waveCapUsd: 25, model: 'sonnet', ideas: [] };
const parsed = (raw: unknown): StartRun => {
  const p = parseStartRun(raw);
  if (!p.ok) throw new Error(p.reason);
  return p.intent;
};
const refusal = (raw: unknown): string => {
  const p = parseStartRun(raw);
  if (p.ok) throw new Error('admitted');
  return p.reason;
};
const repo = { slug: 'grinex-portal', path: 'C:/r', base: 'initial/refactoring' };

describe('parseStartRun', () => {
  it('admits a whole intent and drops nothing it was given', () => {
    expect(parsed(ok)).toEqual(ok);
    expect(parsed({ ...ok, base: 'initial/refactoring', ideas: ['lens-scan', 'scan'] })).toEqual({ ...ok, base: 'initial/refactoring', ideas: ['scan', 'lens-scan'] });
    expect(parsed({ ...ok, onto: 'feature/x' })).toMatchObject({ onto: 'feature/x' });
  });
  it('refuses base with onto, and either in propose mode', () => {
    expect(refusal({ ...ok, base: 'main', onto: 'feature/x' })).toMatch(/exclusive/);
    expect(refusal({ ...ok, mode: 'propose', base: 'main' })).toMatch(/propose mode changes no branch/);
    expect(refusal({ ...ok, mode: 'propose', onto: 'x' })).toMatch(/propose mode changes no branch/);
  });
  it.each([
    ['another kind', { ...ok, kind: 'queue-runs' }, /not a start-run/],
    ['a repo that is no slug', { ...ok, repo: 'Grinex Portal' }, /fleet slug/],
    ['an unknown mode', { ...ok, mode: 'yolo' }, /mode/],
    ['a base that reads as an option', { ...ok, base: '--upload-pack=x' }, /base/],
    ['an onto that reads as an option', { ...ok, onto: '-x' }, /onto/],
    ['an onto with ..', { ...ok, onto: 'a..b' }, /onto/],
    ['0 waves', { ...ok, waves: 0 }, /waves/],
    ['11 waves', { ...ok, waves: 11 }, /waves/],
    ['7 lanes', { ...ok, lanes: 7 }, /lanes/],
    ['2.5 lanes', { ...ok, lanes: 2.5 }, /lanes/],
    ['a string wave count', { ...ok, waves: '5' }, /waves/],
    ['a zero lane cap', { ...ok, laneCapUsd: 0 }, /cap/],
    ['a wave cap past the bound', { ...ok, waveCapUsd: 501 }, /cap/],
    ['a NaN cap', { ...ok, laneCapUsd: Number.NaN }, /cap/],
    ['a model with a space', { ...ok, model: 'sonnet & calc' }, /model/],
    ['an unknown idea', { ...ok, ideas: ['scan', 'web'] }, /ideas/],
    ['a repeated idea', { ...ok, ideas: ['scan', 'scan'] }, /ideas/],
    ['ideas that are no list', { ...ok, ideas: 'scan' }, /ideas/],
  ])('refuses %s', (_what, raw, re) => expect(refusal(raw)).toMatch(re));
});

describe('the command line', () => {
  it('execute on a new branch from the fleet base: no --base, caps and ideas', () => {
    expect(nodeArgv({ ...ok, ideas: ['scan', 'lens-scan'] })).toEqual(['cli/belay.mjs', 'run', '--repo', 'grinex-portal', '--mode', 'execute', '--waves', '5', '--lanes', '4', '--lane-cap', '3', '--wave-cap', '25', '--model', 'sonnet', '--ideas', 'scan,lens-scan']);
  });
  it('execute from another base names it; onto names the branch and never a base', () => {
    expect(runDisplay({ ...ok, base: 'initial/refactoring' })).toBe('afterlife run --repo grinex-portal --mode execute --base initial/refactoring --waves 5 --lanes 4 --lane-cap 3 --wave-cap 25 --model sonnet');
    expect(runDisplay({ ...ok, onto: 'feature/x', laneCapUsd: 2.5 })).toBe('afterlife run --repo grinex-portal --mode execute --onto feature/x --waves 5 --lanes 4 --lane-cap 2.5 --wave-cap 25 --model sonnet');
  });
  it('propose takes no branch and no caps flag', () => {
    expect(runDisplay({ ...ok, mode: 'propose', ideas: ['lens-scan'] })).toBe('afterlife run --repo grinex-portal --mode propose --waves 5 --lanes 4 --model sonnet --ideas lens-scan');
  });
  it('the notes say what it will and will not do', () => {
    expect(runNotes({ ...ok, mode: 'propose' }, repo).join(' ')).toMatch(/will not run setup, base gates, lanes or reflect, create a branch or commit/);
    expect(runNotes(ok, repo).join(' ')).toMatch(/from initial\/refactoring \(the fleet base\)/);
    expect(runNotes({ ...ok, onto: 'feature/x' }, repo).join(' ')).toMatch(/straight onto your existing branch feature\/x/);
    expect(runNotes(ok, { ...repo, laneCapUsd: 2 }).join(' ')).toMatch(/fleet's own lane \$2 are ceilings/);
  });
});
