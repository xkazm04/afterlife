import { describe, expect, it } from 'vitest';
import { pickNeedsYouDemo } from '../../data/pick';
import type { ActionPreview } from '@/server/actions/types';
import { commandsFor } from './commands';

const demo = pickNeedsYouDemo();
describe('commandsFor (Copy Command)', () => {
  it('returns the exact staged commands per decision', () => {
    expect(commandsFor('n2', demo)?.[0]).toContain('glab issue update 131');
    expect(commandsFor('n1', demo)).toBeNull(); // the server has not planned it yet
    const preview = { commands: [{ display: 'a' }, { display: 'b' }] } as unknown as ActionPreview;
    expect(commandsFor('n4', demo, { n4: { kind: 'preview', preview } })).toEqual(['a', 'b']);
    expect(commandsFor('n5', demo)).toEqual(['npx belay doctor']);
  });
  it("a gap has the server's commands once planned, never a hand-written one", () => {
    expect(commandsFor('g1', demo)).toBeNull();
    const preview = { commands: [{ display: 'glab api x' }] } as unknown as ActionPreview;
    expect(commandsFor('g1', demo, { g1: { kind: 'preview', preview } })).toEqual(['glab api x']);
  });
  it('has nothing for a row that writes nothing', () => {
    expect(commandsFor('h0', demo)).toBeNull();
  });
});
