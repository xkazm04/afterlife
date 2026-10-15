import { describe, expect, it } from 'vitest';
import type { ClassRow } from '../types';
import { buildRows, resolveSelection, stepClass } from './rows';

const row = (id: string, track: string): ClassRow => ({
  id, track, ceiling: 'hands_off', tier: 'supervised', lease_days: null, record: null, lastMove: '', pending: null,
});
const vis = [row('p', 'T8'), row('q', 'T3'), row('r', 'T8'), row('s', 'T1')];

describe('buildRows', () => {
  it('groups by track, a group leading where its first class sorts', () => {
    const v = buildRows(vis, true, []);
    expect(v.groups.map((g) => g.id)).toEqual(['T8', 'T3', 'T1']);
    expect(v.flat).toEqual(['g:T8', 'p', 'r', 'g:T3', 'q', 'g:T1', 's']);
    expect(v.nav[1]).toEqual({ id: 'p', kind: 'row', parent: 'g:T8' });
  });
  it('drops the rows of a collapsed group but keeps its header', () => {
    const v = buildRows(vis, true, ['T8']);
    expect(v.flat).toEqual(['g:T8', 'g:T3', 'q', 'g:T1', 's']);
    expect(v.nav[0]).toMatchObject({ kind: 'group', expanded: false });
  });
  it('a group carries the freshest gate last seen among its classes; none seen: null', () => {
    const seen = (iid: number, at: string) => ({ iid, tierAtTime: 'supervised' as const, at });
    const v = buildRows([{ ...row('p', 'T8'), gateSeen: seen(1, '2026-10-05T10:00:00Z') }, { ...row('r', 'T8'), gateSeen: seen(2, '2026-10-06T10:00:00Z') }, row('q', 'T3')], true, []);
    expect(v.groups.map((g) => [g.id, g.gate?.iid ?? null])).toEqual([['T8', 2], ['T3', null]]);
  });
  it('is one flat list when not grouped, ignoring collapsed groups', () => {
    const v = buildRows(vis, false, ['T8']);
    expect(v.flat).toEqual(['p', 'q', 'r', 's']);
    expect(v.nav.every((n) => n.kind === 'row' && n.parent === undefined)).toBe(true);
  });
});

describe('resolveSelection', () => {
  const flat = ['g:T8', 'p', 'r'];
  it('keeps a selection that is still visible', () => expect(resolveSelection('r', flat)).toBe('r'));
  it('falls back to the first class, or the first row', () => {
    expect(resolveSelection('gone', flat)).toBe('p');
    expect(resolveSelection(null, flat)).toBe('p');
    expect(resolveSelection('x', ['g:T1'])).toBe('g:T1');
    expect(resolveSelection('x', [])).toBe('x');
  });
});

describe('stepClass', () => {
  const flat = ['g:T8', 'p', 'r', 'g:T3', 'q'];
  it('steps over classes and skips group rows', () => {
    expect(stepClass(flat, 'p', 1)).toBe('r');
    expect(stepClass(flat, 'r', 1)).toBe('q');
    expect(stepClass(flat, 'q', -1)).toBe('r');
  });
  it('clamps at both ends', () => {
    expect(stepClass(flat, 'p', -1)).toBe('p');
    expect(stepClass(flat, 'q', 1)).toBe('q');
  });
  it('from a group row, j lands on its first class and k on the class above', () => {
    expect(stepClass(flat, 'g:T3', 1)).toBe('q');
    expect(stepClass(flat, 'g:T3', -1)).toBe('r');
    expect(stepClass(flat, 'g:T8', 1)).toBe('p');
  });
  it('starts from the top with nothing selected, and is null with nothing visible', () => {
    expect(stepClass(flat, null, 1)).toBe('p');
    expect(stepClass([], 'p', 1)).toBeNull();
  });
});
