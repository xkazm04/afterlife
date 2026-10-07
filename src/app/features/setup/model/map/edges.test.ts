import { describe, expect, it } from 'vitest';
import { getSetup } from '@/lib/demo';
import { createSetupState } from '../flow/state';
import { GRAPH } from './appGraph';
import { arc, buildEdges, curve, type Geometry } from './edges';
import { hotSets } from './hot';

const s = createSetupState(getSetup(), 0);
const box = (y: number, x = 0) => ({ l: { x, y }, r: { x: x + 100, y } });
const geom: Geometry = {
  steps: Object.fromEntries(Array.from({ length: 15 }, (_, n) => [n, box(n * 30)])),
  tracks: Object.fromEntries(['T4', 'T3', 'T6', 'T1', 'T5', 'T2', 'T7', 'T8'].map((id, i) => [id, box(i * 60, 300)])),
  caps: Object.fromEntries(s.doctor.map((r, i) => [r.name, box(i * 40, 600)])),
};

describe('curves', () => {
  it('curve runs from the right of a to the left of b with a 24px minimum handle', () => {
    expect(curve({ x: 0, y: 0 }, { x: 10, y: 20 })).toBe('M0 0 C24 0 -14 20 10 20');
    expect(curve({ x: 0, y: 0 }, { x: 10, y: 20 }, 2)).toBe('M0 0 C48 0 -38 20 10 20');
  });
  it('arc bends out to the left, more for longer spans', () => {
    expect(arc({ x: 100, y: 0 }, { x: 100, y: 0 })).toBe('M100 0 C78 0 78 0 100 0');
    expect(arc({ x: 100, y: 0 }, { x: 100, y: 100 })).toBe('M100 0 C70 0 70 100 100 100');
  });
});

describe('buildEdges', () => {
  const edges = buildEdges(GRAPH, s, geom, null);
  it('draws one edge per need and per capability reliance', () => {
    const needs = Object.values(GRAPH.needs).reduce((n, k) => n + k.length, 0);
    const uses = Object.values(GRAPH.capUses).reduce((n, k) => n + k.length, 0);
    expect(edges).toHaveLength(needs + uses);
    expect(edges.filter((e) => e.kind === 'step')).toHaveLength(3);
    expect(edges.filter((e) => e.kind === 'dep')).toHaveLength(5);
  });
  it('marks a need met only when its step is done or its track armed', () => {
    expect(edges.find((e) => e.id === 'T4>T1')?.met).toBe(true);
    expect(edges.find((e) => e.id === 'T3>T1')?.met).toBe(false);
    expect(edges.find((e) => e.id === 'step:6>T5')?.met).toBe(false);
  });
  it('capability edges are unknown or met by the doctor, never rounded up', () => {
    expect(edges.find((e) => e.id === 'T2>Vulnerability report via GraphQL / MCP')?.unknown).toBe(true);
    expect(edges.find((e) => e.id === 'T3>Pipelines, MRs, releases')).toMatchObject({ met: true, unknown: false });
  });
  it('a picked gate lights its edge amber (waits on you)', () => {
    const hot = hotSets(GRAPH, { k: 'step', id: 6 }, null, s.doctor);
    const e = buildEdges(GRAPH, s, geom, hot).find((x) => x.id === 'step:6>T5');
    expect(e).toMatchObject({ hot: true, wait: true });
  });
  it('a done step is hot but not waiting', () => {
    const done = { ...s, steps: { ...s.steps, 6: { ...s.steps[6]!, st: 'done' as const } } };
    const hot = hotSets(GRAPH, { k: 'step', id: 6 }, null, done.doctor);
    expect(buildEdges(GRAPH, done, geom, hot).find((x) => x.id === 'step:6>T5')).toMatchObject({ hot: true, wait: false, met: true });
  });
  it('skips edges whose nodes are not measured yet', () => {
    expect(buildEdges(GRAPH, s, { steps: {}, tracks: {}, caps: {} }, null)).toEqual([]);
  });
});
