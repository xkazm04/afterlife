// A cycle's warnings, project issues and group error are logged once, when they change, not every poll interval.
import { describe, expect, it } from 'vitest';
import type { CycleResult, ProjectPoll } from '@/server/poller';
import { cycleLine, cycleProblems } from '../../live/cycleLog';

const project = (id: string, over: Partial<ProjectPoll> = {}): ProjectPoll => ({ id, gitlabId: 1, ok: true, tasks: 0, proofs: 0, ledger: 'skipped', issues: [], ...over });
const cycle = (over: Partial<CycleResult> = {}): CycleResult => ({ at: new Date(0), ok: true, projects: [], warnings: [], ...over });

describe('cycleProblems', () => {
  it('names the group error, the warnings, a failed project and every issue, each once', () => {
    const r = cycle({
      ok: false, error: 'HTTP 503',
      warnings: ['no belay-ledger project in the group: the ledger is not imported'],
      projects: [project('a', { ok: false, error: 'HTTP 404' }), project('b', { issues: ['task t1: ignored', 'task t1: ignored'] })],
    });
    expect(cycleProblems(r)).toEqual([
      'group: HTTP 503',
      'no belay-ledger project in the group: the ledger is not imported',
      'a: HTTP 404',
      'b: task t1: ignored',
    ]);
  });

  it('is empty for a clean cycle', () => {
    expect(cycleProblems(cycle({ projects: [project('a')] }))).toEqual([]);
  });
});

describe('cycleLine over a run of fake cycles', () => {
  it('says a problem when it starts and when it clears, and nothing while it stands', () => {
    const runs = [
      cycle(),
      cycle({ warnings: ['policy: bad yaml; class tiers are not updated'] }),
      cycle({ warnings: ['policy: bad yaml; class tiers are not updated'] }),
      cycle({ warnings: ['policy: bad yaml; class tiers are not updated'], projects: [project('a', { issues: ['x'] })] }),
      cycle(),
      cycle(),
    ];
    let prev: string[] | null = null;
    const lines: (string | null)[] = [];
    for (const r of runs) {
      const next = cycleProblems(r);
      lines.push(cycleLine(prev, next));
      prev = next;
    }
    expect(lines).toEqual([
      null,
      'belay: poll cycle 1 new: policy: bad yaml; class tiers are not updated (1 standing)',
      null,
      'belay: poll cycle 1 new: a: x (2 standing)',
      'belay: poll cycle 2 cleared: policy: bad yaml; class tiers are not updated; a: x (0 standing)',
      null,
    ]);
  });

  it('names every problem of the first cycle as new', () => {
    expect(cycleLine(null, ['group: HTTP 503'])).toBe('belay: poll cycle 1 new: group: HTTP 503 (1 standing)');
  });
});
