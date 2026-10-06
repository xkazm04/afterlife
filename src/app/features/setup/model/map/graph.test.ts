import { describe, expect, it } from 'vitest';
import { GRAPH } from './appGraph';
import { capsOf, downstream, stepFrees, stepFreesAll, upstream, type Graph } from './graph';
import { hotSets, litOf } from './hot';

const tiny: Graph = { needs: { A: [], B: ['A'], C: ['B', 'step:2'] }, capUses: { cap1: ['A'], cap2: [] } };

describe('graph closure', () => {
  it('downstream follows needs transitively', () => {
    expect(downstream(tiny, 'A').sort()).toEqual(['B', 'C']);
    expect(downstream(tiny, 'C')).toEqual([]);
  });
  it('upstream collects tracks, steps and capabilities back to the roots', () => {
    const u = upstream(tiny, 'C');
    expect([...u.tracks].sort()).toEqual(['A', 'B']);
    expect([...u.steps]).toEqual([2]);
    expect([...u.caps]).toEqual(['cap1']);
  });
  it('terminates on a cycle', () => {
    const loop: Graph = { needs: { A: ['B'], B: ['A'] }, capUses: {} };
    expect(downstream(loop, 'A').sort()).toEqual(['A', 'B']);
    expect([...upstream(loop, 'A').tracks].sort()).toEqual(['A', 'B']);
  });
  it('capsOf lists what a track relies on', () => {
    expect(capsOf(tiny, 'A')).toEqual(['cap1']);
    expect(capsOf(tiny, 'C')).toEqual([]);
  });
});

describe('the Belay arm graph', () => {
  it('step 6 frees only T5; step 12 frees T2', () => {
    expect(stepFrees(GRAPH, 6)).toEqual(['T5']);
    expect(stepFrees(GRAPH, 12)).toEqual(['T2']);
    expect(stepFrees(GRAPH, 9)).toEqual([]);
  });
  it('T4 and T3 free the patcher and the gardener', () => {
    expect(downstream(GRAPH, 'T4').sort()).toEqual(['T1', 'T8']);
    expect(downstream(GRAPH, 'T6')).toEqual(['T1']);
  });
  it('stepFreesAll puts direct tracks apart from the ones behind them', () => {
    expect(stepFreesAll(GRAPH, 7)).toEqual({ direct: ['T7'], more: [] });
  });
  it('T1 needs T4, T3 and T6 and the capabilities they rely on', () => {
    const u = upstream(GRAPH, 'T1');
    expect([...u.tracks].sort()).toEqual(['T3', 'T4', 'T6']);
    expect(u.caps.has('Pipelines, MRs, releases')).toBe(true);
    expect(u.caps.has('AI audit event report')).toBe(false);
  });
});

describe('hotSets', () => {
  const doctor = [
    { name: 'cap1', st: 'available' as const },
    { name: 'cap2', st: 'unknown' as const },
  ];
  it('is null with no focus and no filter', () => {
    expect(hotSets(tiny, null, null, doctor)).toBeNull();
  });
  it('a picked step lights the tracks it frees and what is behind them', () => {
    const h = hotSets(tiny, { k: 'step', id: 2 }, null, doctor);
    expect([...(h?.tracks ?? [])]).toEqual(['C']);
    expect(h?.steps.has(2)).toBe(true);
  });
  it('a picked track lights its needs and what it frees', () => {
    const h = hotSets(tiny, { k: 'track', id: 'B' }, null, doctor);
    expect([...(h?.tracks ?? [])].sort()).toEqual(['A', 'B', 'C']);
  });
  it('the lozenge filter lights every capability of that status and the tracks that rely on it', () => {
    const h = hotSets(tiny, null, 'available', doctor);
    expect([...(h?.caps ?? [])]).toEqual(['cap1']);
    expect([...(h?.tracks ?? [])].sort()).toEqual(['A', 'B', 'C']);
  });
  it('a focus wins over the filter', () => {
    const h = hotSets(tiny, { k: 'cap', id: 'cap2' }, 'available', doctor);
    expect([...(h?.caps ?? [])]).toEqual(['cap2']);
  });
  it('litOf marks lit and dimmed nodes, and nothing when nothing is lit', () => {
    const h = hotSets(tiny, { k: 'track', id: 'A' }, null, doctor);
    expect(litOf(h, { k: 'track', id: 'B' })).toBe('hot');
    expect(litOf(h, { k: 'step', id: 2 })).toBe('dim');
    expect(litOf(null, { k: 'step', id: 2 })).toBeUndefined();
  });
});
