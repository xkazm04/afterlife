import { describe, expect, it } from 'vitest';
import { groupBlocks, navItems, needsSum, proofsSum, stageAverage, tierTotal } from './groups';
import { makeProject } from './testProject';

const P = [
  makeProject({ id: 'a', group: 'core', needsYou: 2 }),
  makeProject({ id: 'b', group: 'pay', needsYou: 1, proofs7d: { pass: 5, fail: 1, inconclusive: 2 } }),
  makeProject({ id: 'c', group: 'pay', state: 'not-set-up', armed: 0, classTiers: {}, needsYou: 4, proofs7d: null, stages: [null, 3, null, null, null, null, null, null, null] }),
];

describe('groupBlocks', () => {
  it('keeps the group order and drops empty groups', () => {
    const blocks = groupBlocks(['pay', 'risk', 'core'], P);
    expect(blocks.map((b) => [b.group, b.projects.length])).toEqual([['pay', 2], ['core', 1]]);
  });
});

describe('navItems', () => {
  const blocks = groupBlocks(['core', 'pay'], P);
  it('lists a group and its rows, with the parent set', () => {
    const items = navItems(blocks, new Set(), true, P);
    expect(items.map((i) => i.id)).toEqual(['g:core', 'a', 'g:pay', 'b', 'c']);
    expect(items[1]).toMatchObject({ kind: 'row', parent: 'g:core' });
    expect(items[0]).toMatchObject({ kind: 'group', expanded: true });
  });
  it('leaves out the rows of a collapsed group', () => {
    const items = navItems(blocks, new Set(['pay']), true, P);
    expect(items.map((i) => i.id)).toEqual(['g:core', 'a', 'g:pay']);
    expect(items[2]).toMatchObject({ expanded: false });
  });
  it('is flat when not grouped', () => {
    expect(navItems(blocks, new Set(), false, P).map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('group totals', () => {
  it('sums needs-you over watched projects only', () => {
    expect(needsSum(P)).toBe(3);
  });
  it('sums tier counts over projects whose tiers are known; none known is unknown, not 0', () => {
    expect(tierTotal(P, 'hands_off')).toBe(2);
    expect(tierTotal([P[2]!], 'hands_off')).toBeNull();
    // a live project: armed 0 (nothing writes it), its tiers known from its class tier rows
    expect(tierTotal([makeProject({ id: 'live', armed: 0 })], 'hands_off')).toBe(1);
  });
  it('sums proofs and ignores unknown ones', () => {
    expect(proofsSum(P)).toEqual({ pass: 8, fail: 1, inconclusive: 2 });
  });
  it('averages a stage over the known rungs', () => {
    expect(stageAverage(P, 0)).toBe(1);
    expect(stageAverage(P, 1)).toBe(2);
    expect(stageAverage([P[2]!], 0)).toBeNull();
  });
});
