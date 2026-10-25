// The pre-run form, pure: a repo's defaults, the base choices, readiness, and the one intent it sends.
import { describe, expect, it } from 'vitest';
import { baseChoices, formFor, intentOf, notReady } from './form';

const repo = { slug: 'grinex-portal', path: 'C:/r', base: 'initial/refactoring', laneCapUsd: 2 };

describe('the pre-run form', () => {
  it("opens on propose with the runner's defaults, a repo's own caps as ceilings", () => {
    expect(formFor(repo)).toEqual({ repo: 'grinex-portal', mode: 'propose', branch: 'new', base: 'initial/refactoring', onto: '', waves: 1, lanes: 6, laneCapUsd: 2, waveCapUsd: 25, model: 'sonnet', ideas: [] });
  });
  it('a new repo keeps the choices made and takes its own base, never another repo\'s branch', () => {
    const kept = { ...formFor(repo), mode: 'execute' as const, branch: 'existing' as const, onto: 'feature/x', waves: 5, ideas: ['scan' as const] };
    expect(formFor({ slug: 'alpha', path: 'C:/a', base: 'main' }, kept)).toMatchObject({ repo: 'alpha', mode: 'execute', branch: 'existing', base: 'main', onto: '', waves: 5, ideas: ['scan'] });
  });
  it('offers the fleet base first, then the other local branches', () => {
    expect(baseChoices(repo, [{ name: 'feature/x' }, { name: 'initial/refactoring' }])).toEqual(['initial/refactoring', 'feature/x']);
    expect(baseChoices(undefined, [{ name: 'x' }])).toEqual([]);
  });
  it('propose sends no base, onto or caps difference; the fleet base is not sent', () => {
    expect(intentOf(formFor(repo), repo)).toEqual({ kind: 'start-run', repo: 'grinex-portal', mode: 'propose', waves: 1, lanes: 6, laneCapUsd: 2, waveCapUsd: 25, model: 'sonnet', ideas: [] });
    expect(intentOf({ ...formFor(repo), mode: 'propose', branch: 'existing', onto: 'feature/x', base: 'main' }, repo)).not.toHaveProperty('onto');
    expect(intentOf({ ...formFor(repo), mode: 'execute' }, repo)).not.toHaveProperty('base');
  });
  it('execute sends another base, or the existing branch, never both', () => {
    expect(intentOf({ ...formFor(repo), mode: 'execute', base: 'feature/x' }, repo)).toMatchObject({ mode: 'execute', base: 'feature/x' });
    const onto = intentOf({ ...formFor(repo), mode: 'execute', branch: 'existing', onto: 'feature/x', base: 'main' }, repo);
    expect(onto).toMatchObject({ onto: 'feature/x' });
    expect(onto).not.toHaveProperty('base');
  });
  it('is not ready without a repo, or an existing branch not yet picked', () => {
    expect(notReady({ ...formFor(undefined) })).toBe('pick a repo');
    expect(notReady({ ...formFor(repo), mode: 'execute', branch: 'existing' })).toMatch(/pick the existing branch/);
    expect(intentOf({ ...formFor(repo), mode: 'execute', branch: 'existing' }, repo)).toBeNull();
    expect(notReady({ ...formFor(repo), mode: 'propose', branch: 'existing' })).toBeNull();
  });
});
