// The desk's outbox: stage and unstage, then Run all confirms in staging order and never stops on a refused or failed one.
import { describe, expect, it } from 'vitest';
import { OUT_EMPTY, canStage, outReduce, type DeskOut, type DeskOutAction } from '.';

const run = (...a: DeskOutAction[]): DeskOut => a.reduce(outReduce, OUT_EMPTY);
const stage = (id: string): DeskOutAction => ({ type: 'stage', id });
const res = (id: string, state: 'running' | 'done' | 'refused' | 'failed', text: string | null = null): DeskOutAction => ({ type: 'result', id, state, text });

describe('outReduce', () => {
  it('stage appends an id once, in staging order', () => {
    const s = run(stage('b'), stage('a'), stage('b'));
    expect(s.order).toEqual(['b', 'a']);
    expect(s.result).toEqual({ b: { state: 'staged', text: null }, a: { state: 'staged', text: null } });
  });

  it('only a row with a write may stage', () => {
    expect(canStage({ intent: null })).toBe(false);
    expect(canStage({ intent: { kind: 'promote-class', project: 'p', class: 'c', to: 'assisted' } })).toBe(true);
  });

  it('unstage removes an id, but not while a run is going', () => {
    expect(run(stage('a'), stage('b'), { type: 'unstage', id: 'a' })).toEqual({ order: ['b'], result: { b: { state: 'staged', text: null } }, running: false });
    const going = run(stage('a'), { type: 'start' });
    expect(outReduce(going, { type: 'unstage', id: 'a' })).toBe(going);
  });

  it('start runs the staged ids, each back to staged; nothing to run starts nothing', () => {
    const s = run(stage('a'), stage('b'), { type: 'start' }, res('a', 'refused', 'no'), { type: 'finish' }, { type: 'start' });
    expect(s.running).toBe(true);
    expect(s.result).toEqual({ a: { state: 'staged', text: null }, b: { state: 'staged', text: null } });
    expect(run({ type: 'start' })).toBe(OUT_EMPTY);
  });

  it('a refused or failed result never stops the run; finish keeps them with their words and lets the done ones go', () => {
    const s = run(stage('a'), stage('b'), stage('c'), { type: 'start' }, res('a', 'running'), res('a', 'refused', 'already supervised'), res('b', 'failed', 'no answer'), res('c', 'done', '!22'));
    expect(s.running).toBe(true);
    expect(s.result.c).toEqual({ state: 'done', text: '!22' });
    const f = outReduce(s, { type: 'finish' });
    expect(f.running).toBe(false);
    expect(f.order).toEqual(['a', 'b']);
    expect(f.result.a).toEqual({ state: 'refused', text: 'already supervised' });
    expect(f.result.b).toEqual({ state: 'failed', text: 'no answer' });
    expect(f.result.c).toEqual({ state: 'done', text: '!22' });
  });

  it('a result for an id that is not staged changes nothing', () => {
    const s = run(stage('a'), { type: 'start' });
    expect(outReduce(s, res('zz', 'done'))).toBe(s);
  });
});
