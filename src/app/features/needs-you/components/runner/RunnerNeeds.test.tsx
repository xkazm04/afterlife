// No DOM: the strip is rendered to markup for a merge, a park and nothing.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { RunnerNeed } from '@/lib/runs/desk/types';
import { RunnerNeeds } from './RunnerNeeds';

const merge: RunnerNeed = {
  kind: 'merge-wave', id: 'merge:alpha:2', repo: 'alpha', wave: 2, branch: 'belay/wave-2', base: 'main', path: '/w/alpha', landed: 3, costUsd: 1.5, checked: true,
  commands: ['git -C /w/alpha switch main', 'git -C /w/alpha merge --ff-only belay/wave-2', 'git -C /w/alpha push'],
};
const park: RunnerNeed = { kind: 'parked-lane', id: 'park:alpha:2:b', repo: 'alpha', wave: 2, lane: 'b', title: 'Bump the lockfile', parkReason: 'needs a person to pick a version' };

describe('RunnerNeeds', () => {
  it('draws nothing when nothing waits', () => expect(renderToStaticMarkup(<RunnerNeeds needs={[]} />)).toBe(''));
  it("a merge card shows the fleet path's commands and what the wave did; a park card its reason", () => {
    const out = renderToStaticMarkup(<RunnerNeeds needs={[merge, park]} />);
    expect(out).toContain('2 decisions');
    expect(out).toContain('Wave 2 of alpha');
    expect(out).toContain('3 lanes landed · $1.50 · belay/wave-2 into main');
    expect(out).toContain('git -C /w/alpha merge --ff-only belay/wave-2');
    expect(out).toContain('Bump the lockfile');
    expect(out).toContain('needs a person to pick a version');
    expect(out).not.toContain('not in .afterlife/fleet.yml');
  });
  it('says when the repo is not in the fleet file or git could not be asked, and writes nothing', () => {
    const bare = { ...merge, checked: false } as Extract<RunnerNeed, { kind: 'merge-wave' }>;
    delete bare.path;
    const out = renderToStaticMarkup(<RunnerNeeds needs={[bare]} />);
    expect(out).toContain('not in .afterlife/fleet.yml');
    expect(out).toContain('Git could not be asked');
    expect(out).not.toContain('<button');
  });
});
