import { describe, expect, it } from 'vitest';
import { LEDGER_SEED } from '../../data/ledgerSeed';
import { INITIAL_HEAD } from '../../data/policy';
import { nextSha } from './commit';
import { initialState } from './initial';
import { ladderReducer } from './reducer';
import type { LadderSeed } from './state';

const row = (id: string) => ({ id, track: 'T1', ceiling: 'hands_off' as const, tier: 'hands_off' as const, lease_days: null, lastMove: 'no change', record: { accepted: 5, needed: null, noEdit: 1, cleanDays: 5, reverts: 0 } });
const seed: LadderSeed = { classes: [row('a'), row('b')], ledger: LEDGER_SEED, quotes: {}, head: INITIAL_HEAD };
const SIM = { simulated: true } as const;

describe('the demo commit id has one owner', () => {
  it('two revokes answered before the hook re-rendered keep the two ids the hook named, and both settle', () => {
    const [x, y] = [nextSha(0), nextSha(1)];
    let s = ladderReducer(initialState(seed), { type: 'revoke', id: 'a', to: 'supervised', t: '1', sent: SIM, sha: x });
    s = ladderReducer(s, { type: 'revoke', id: 'b', to: 'supervised', t: '2', sent: SIM, sha: y });
    expect(s.classes.map((c) => c.pending)).toEqual([x, y]);
    s = ladderReducer(ladderReducer(s, { type: 'settle', sha: x, t: '3' }), { type: 'settle', sha: y, t: '4' });
    expect(s.classes.map((c) => c.pending)).toEqual([null, null]);
  });
  it('the id the action carries wins over the one the state would pick', () => {
    const s = ladderReducer(initialState(seed), { type: 'revoke', id: 'a', to: 'supervised', t: '1', sent: SIM, sha: nextSha(3) });
    expect(s.classes.find((c) => c.id === 'a')?.pending).toBe(nextSha(3));
    expect(s.head.sha).toBe(nextSha(3));
  });
});
