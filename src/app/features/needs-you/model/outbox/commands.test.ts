import { describe, expect, it } from 'vitest';
import { pickNeedsYouDemo } from '../../data/pick';
import { commandsFor, gapCommand } from './commands';

const demo = pickNeedsYouDemo();
const gap = (id: string) => {
  const g = demo.gaps.find((x) => x.id === id);
  if (!g) throw new Error(`no gap ${id}`);
  return g;
};

describe('gap commands', () => {
  it('opens a draft MR on the gap branch, naming the rungs it moves', () => {
    const cmd = gapCommand(gap('g1'), demo.rungNames);
    expect(cmd).toContain('glab mr create -R acme-lab/ledgerline --draft --source-branch belay/gap-secure-r4');
    expect(cmd).toContain('Secure R3 → R4 (enforced → self-proving)');
    expect(cmd).toContain('--label belay::gap');
  });
  it('opens an issue for a probe, which has no branch and so no known diff', () => {
    const cmd = gapCommand(gap('g4'), demo.rungNames);
    expect(cmd.startsWith('glab issue create -R acme-lab/ledgerline')).toBe(true);
    expect(cmd).not.toContain('--draft');
  });
});

describe('commandsFor (Copy Command)', () => {
  it('returns the exact staged commands per decision', () => {
    expect(commandsFor('n2', demo)?.[0]).toContain('glab issue update 131');
    expect(commandsFor('n1', demo)).toHaveLength(4);
    expect(commandsFor('n4', demo)?.[3]).toContain('quarantined → assisted');
    expect(commandsFor('n5', demo)).toEqual(['npx belay doctor --only runner --json']);
  });
  it('has nothing for a row that writes nothing', () => {
    expect(commandsFor('h0', demo)).toBeNull();
  });
});
