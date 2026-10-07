import { describe, expect, it } from 'vitest';
import { makeProject } from '../testProject';
import { INITIAL_SORT, byAttention, columnRole, defaultDir, rankedTier, sortAfterViewChange, sortLabel, sortProjects, sortValue } from './sorting';

const STAGES = ['plan', 'create', 'verify'];
const a = makeProject({ id: 'a', name: 'alpha', needsYou: 0 });
const b = makeProject({ id: 'b', name: 'bravo', needsYou: 3 });
const c = makeProject({ id: 'c', name: 'charlie', needsYou: 3, state: 'stale' });
const d = makeProject({ id: 'd', name: 'delta', state: 'not-set-up', armed: 0, classTiers: {}, needsYou: 9, proofs7d: null, feed: { ageSec: null, ok: null } });

describe('attention rank', () => {
  it('puts needs-you first, then the sickest state, then the name', () => {
    expect([a, b, c, d].sort(byAttention).map((p) => p.id)).toEqual(['d', 'c', 'b', 'a']);
  });
  it('is the default sort', () => {
    expect(sortProjects([a, b, c], INITIAL_SORT).map((p) => p.id)).toEqual(['c', 'b', 'a']);
  });
});

describe('column values', () => {
  it('has unknowns for an unwatched project', () => {
    expect(sortValue(d, 'needs')).toBeNull();
    expect(sortValue(d, 'tier:hands_off')).toBeNull();
    expect(sortValue(d, 'proofs')).toBeNull();
    expect(sortValue(d, 'feed')).toBeNull();
    expect(sortValue(d, 'stages')).toBe(9);
  });
  it('scores proofs as pass minus three fails', () => {
    expect(sortValue(makeProject({ id: 'x', proofs7d: { pass: 10, fail: 2, inconclusive: 5 } }), 'proofs')).toBe(4);
  });
  it('ranks class tiers by autonomy and stage rungs by index', () => {
    const p = makeProject({ id: 'p', classTiers: { x: 'supervised', y: null }, stages: [2, null, 4, 0, 0, 0, 0, 0, 0] });
    expect(sortValue(p, 'class:x')).toBe(4);
    expect(sortValue(p, 'class:y')).toBeNull();
    expect(sortValue(p, 'stage:2')).toBe(4);
    expect(sortValue(p, 'stage:1')).toBeNull();
    expect(sortValue(makeProject({ id: 'q', stages: [null, null, null, null, null, null, null, null, null] }), 'stages')).toBeNull();
  });
});

describe('sorting by a column', () => {
  const x = makeProject({ id: 'x', name: 'x', tiers: { hands_off: 5, supervised: 0, assisted: 0, quarantined: 0, human_only: 0 } });
  const y = makeProject({ id: 'y', name: 'y', tiers: { hands_off: 2, supervised: 0, assisted: 0, quarantined: 0, human_only: 0 } });
  it('sorts descending and ascending', () => {
    expect(sortProjects([y, x], { key: 'tier:hands_off', dir: -1 }).map((p) => p.id)).toEqual(['x', 'y']);
    expect(sortProjects([x, y], { key: 'tier:hands_off', dir: 1 }).map((p) => p.id)).toEqual(['y', 'x']);
  });
  it('always sinks unknowns, in either direction', () => {
    expect(sortProjects([d, x, y], { key: 'tier:hands_off', dir: -1 }).map((p) => p.id)).toEqual(['x', 'y', 'd']);
    expect(sortProjects([d, x, y], { key: 'tier:hands_off', dir: 1 }).map((p) => p.id)).toEqual(['y', 'x', 'd']);
  });
  it('breaks ties by attention', () => {
    expect(sortProjects([a, b], { key: 'feed', dir: -1 }).map((p) => p.id)).toEqual(['b', 'a']);
  });
  it('sorts names ascending first', () => {
    expect(defaultDir('name')).toBe(1);
    expect(defaultDir('tier:assisted')).toBe(-1);
    expect(sortProjects([b, a], { key: 'name', dir: 1 }).map((p) => p.id)).toEqual(['a', 'b']);
  });
});

describe('tier re-rank', () => {
  it('knows the ranked tier and dims the others', () => {
    expect(rankedTier({ key: 'tier:quarantined', dir: -1 })).toBe('quarantined');
    expect(rankedTier(INITIAL_SORT)).toBeNull();
    expect(columnRole('quarantined', 'quarantined')).toBe('ranked');
    expect(columnRole('assisted', 'quarantined')).toBe('dim');
    expect(columnRole('assisted', null)).toBe('plain');
  });
});

describe('view change', () => {
  it('drops a sort on a column the new view lacks', () => {
    expect(sortAfterViewChange({ key: 'tier:assisted', dir: -1 }, 'classes')).toEqual(INITIAL_SORT);
    expect(sortAfterViewChange({ key: 'stages', dir: -1 }, 'classes')).toEqual(INITIAL_SORT);
    expect(sortAfterViewChange({ key: 'stages', dir: -1 }, 'tiers')).toEqual({ key: 'stages', dir: -1 });
    expect(sortAfterViewChange({ key: 'proofs', dir: 1 }, 'stages')).toEqual({ key: 'proofs', dir: 1 });
  });
});

describe('labels', () => {
  it('names every kind of key', () => {
    expect(sortLabel('attention', STAGES)).toBe('Attention');
    expect(sortLabel('feed', STAGES)).toBe('Feed age');
    expect(sortLabel('tier:human_only', STAGES)).toBe('Human only');
    expect(sortLabel('class:qa.file-bug', STAGES)).toBe('qa.file-bug');
    expect(sortLabel('stage:2', STAGES)).toBe('Verify');
  });
});
