import { describe, expect, it } from 'vitest';
import { pickNeedsYouDemo } from '../../data/pick';
import type { OutItem } from '../types';
import { buildOutItem, stageItem, unstageItem } from './outbox';

const demo = pickNeedsYouDemo();
const item = (key: string, clock = false): OutItem => ({ key, kind: 'k', title: key, ref: key, commands: ['c'], clock });

describe('outbox list', () => {
  it('appends in staging order', () => {
    const out = stageItem(stageItem([], item('a')), item('b'));
    expect(out.map((o) => o.key)).toEqual(['a', 'b']);
  });
  it('keeps the legal clock first in line, and the rest in order', () => {
    const out = [item('a'), item('b'), item('clock', true), item('c')].reduce<readonly OutItem[]>((acc, i) => stageItem(acc, i), []);
    expect(out.map((o) => o.key)).toEqual(['clock', 'a', 'b', 'c']);
  });
  it('staging the same key again replaces it instead of duplicating', () => {
    const out = stageItem(stageItem([], item('a')), { ...item('a'), title: 'again' });
    expect(out).toHaveLength(1);
    expect(out[0]?.title).toBe('again');
  });
  it('unstage removes only that key, and a missing key changes nothing', () => {
    const out = [item('a'), item('b')];
    expect(unstageItem(out, 'a').map((o) => o.key)).toEqual(['b']);
    expect(unstageItem(out, 'zzz')).toHaveLength(2);
  });
});

describe('what each decision stages', () => {
  it('the CRA sign-off is a clock item with its two commands and no diff', () => {
    const o = buildOutItem('n2', demo);
    expect(o).toMatchObject({ key: 'n2', clock: true, ref: 'ledgerline#131' });
    expect(o?.commands).toHaveLength(2);
    expect(o?.diff).toBeUndefined();
  });
  it('a promotion and a re-admission carry the exact diff of tier-state.yml', () => {
    expect(buildOutItem('n1', demo)).toMatchObject({ ref: 'belay-policy!21', file: 'belay-policy/tier-state.yml' });
    expect(buildOutItem('n4', demo)?.diff?.some(([m]) => m === '+')).toBe(true);
  });
  it('a gap is an MR when it has a diff and an issue when it does not', () => {
    expect(buildOutItem('g1', demo)).toMatchObject({ kind: 'gap MR', ref: '!45' });
    expect(buildOutItem('g4', demo)).toMatchObject({ kind: 'gap issue', ref: '#132' });
  });
  it('stages nothing for a row that has no write', () => {
    expect(buildOutItem('n5', demo)).toBeNull();
  });
});
