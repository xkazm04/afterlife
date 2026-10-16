// A node's page opens with a title and a one-line answer (nodeHead). Pinned for every kind of focus and every arm state,
// so the wording a person reads before acting cannot drift without a test saying so.
import { describe, expect, it } from 'vitest';
import { getSetup, getTracks } from '@/lib/demo';
import { createSetupState } from '../../../model/flow/state';
import type { ArmState, ArmStatus, SetupState } from '../../../model/types';
import { nodeHead } from '../nodeHead';

const state: SetupState = createSetupState(getSetup(), 0);
const tracks = Object.fromEntries(getTracks().map((t) => [t.id, t]));
const withArm = (id: string, a: Partial<ArmState>): SetupState => ({ ...state, arm: { ...state.arm, [id]: { ...state.arm[id]!, ...a } } });
const lede = (s: SetupState, id = 'T1') => nodeHead(s, tracks, { k: 'track', id })?.lede;

describe('nodeHead: track', () => {
  const cases: [ArmStatus, Partial<ArmState>, string][] = [
    ['armed', { mr: '!7' }, 'Armed by !7: a revert disarms it.'],
    ['armed', {}, 'Armed: a revert disarms it.'],
    ['ready', {}, 'Ready: one MR arms it.'],
    ['open', { mr: '!9' }, 'Only you can merge !9.'],
    ['open', {}, 'Only you can merge the MR.'],
    ['open', { mr: '!5', revert: true }, 'Only you can merge !5 (revert).'],
    ['probing', {}, 'Verifying the merge on main.'],
    ['undefined', {}, 'Not defined in the repo yet.'],
    ['unknown', {}, 'Unknown: the read of main failed.'],
  ];
  it.each(cases)('%s %j reads %s', (st, extra, want) => {
    expect(lede(withArm('T1', { st, ...extra }))).toBe(want);
  });

  it('a locked track names what it waits on', () => {
    expect(lede(withArm('T1', { st: 'locked' }))).toMatch(/^Locked until a probe sees .+\.$/);
  });

  it('the title is the track name, and a track the state does not hold is null', () => {
    expect(nodeHead(state, tracks, { k: 'track', id: 'T1' })?.title).toBe(tracks.T1!.name);
    expect(nodeHead(state, tracks, { k: 'track', id: 'T99' })).toBeNull();
  });
});

describe('nodeHead: step and capability', () => {
  it('a probed step says a read saw it done; an undone one says who can do it', () => {
    const done = Object.values(state.steps).find((s) => s.st === 'done')!;
    const todo = Object.values(state.steps).find((s) => s.st !== 'done' && !s.said)!;
    expect(nodeHead(state, tracks, { k: 'step', id: done.n })?.lede).toBe('Probed: a read saw it done.');
    expect(nodeHead(state, tracks, { k: 'step', id: todo.n })?.lede).toMatch(/^(Only you|An agent or you) can do this/);
    expect(nodeHead(state, tracks, { k: 'step', id: 999 })).toBeNull();
  });

  it('a step the operator said they did is worded as not read, never as probed', () => {
    const n = Object.values(state.steps).find((s) => s.st === 'unknown' || s.st === 'human')!.n;
    const s: SetupState = { ...state, steps: { ...state.steps, [n]: { ...state.steps[n]!, st: 'unknown', said: '14:30' } } };
    expect(nodeHead(s, tracks, { k: 'step', id: n })?.lede).toBe('you said done 14:30 · not read. Belay cannot see it done.');
  });

  it('a capability says its status in the group; live carries the doctor reason in the tip', () => {
    const row = state.doctor[0]!;
    const head = nodeHead(state, tracks, { k: 'cap', id: row.name });
    expect(head?.lede).toBe(`${row.st} in ${state.group}`);
    const live: SetupState = { ...state, live: true, doctor: [{ ...row, reason: 'needs Ultimate' }] };
    expect(nodeHead(live, tracks, { k: 'cap', id: row.name })?.tip).toBe(`${row.name}. needs Ultimate`);
  });
});
