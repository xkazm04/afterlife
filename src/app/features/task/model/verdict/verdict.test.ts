import { describe, expect, it } from 'vitest';
import { loadTasks } from '../build/loadTasks';
import type { TaskView } from '../types';
import { equationTerms, verdictWord } from './equation';
import { verdictOf } from '@/schemas';
import { claimStatus, isStruck, tally, taskVerdict, verdictLabel } from './verdict';

const tasks = loadTasks();
const get = (id: string): TaskView => {
  const t = tasks.find((x) => x.id === id);
  if (!t) throw new Error(id);
  return t;
};

describe('verdict of a task', () => {
  const c = (ok: boolean | null, decidedBy?: 'engine' | 'human') => ({ claim_id: null, name: 'c', ok, detail: '', decidedBy });

  it('words the schema verdict, and reads the struck terms from decidedBy', () => {
    expect(verdictLabel('pass')).toBe('PASS');
    expect(verdictLabel('fail')).toBe('FAIL');
    expect(isStruck({ decidedBy: 'human' })).toBe(true);
    expect(isStruck({})).toBe(false);
  });

  it('never counts a check a person decides as a pass or as a fail', () => {
    expect(verdictOf([c(true), c(null, 'human')], true)).toBe('pass');
    expect(verdictOf([c(null, 'human'), c(false)], true)).toBe('fail');
    expect(taskVerdict(get('01J8QC'))).toBe('PASS');
    expect(taskVerdict(get('01J8Q8'))).toBe('FAIL');
    expect(tally(get('01J8QC'))).toEqual({ ok: 3, bad: 0, unk: 1 });
  });
});

describe('tally', () => {
  it('counts only the terms that have landed', () => {
    expect(tally(get('01J8Q8'))).toEqual({ ok: 3, bad: 1, unk: 0 });
    expect(tally(get('01J8Q8'), (i) => i < 2)).toEqual({ ok: 2, bad: 0, unk: 0 });
  });
});

describe('claimStatus', () => {
  it('upholds, contradicts, leaves open or gives no weight', () => {
    const q8 = get('01J8Q8');
    expect(claimStatus(q8, q8.claims[2]!)).toEqual({ kind: 'bad', label: '✗ contradicted' });
    expect(claimStatus(q8, q8.claims[0]!).kind).toBe('ok');
    const q4 = get('01J8Q4');
    expect(claimStatus(q4, q4.claims[0]!).label).toBe('✓ upheld · 4');
    expect(claimStatus(q4, q4.claims[1]!)).toEqual({ kind: 'unk', label: '? no weight' });
    const qa = get('01J8QA');
    expect(claimStatus(qa, qa.claims[0]!)).toEqual({ kind: 'unk', label: '? open' });
  });
});

describe('equation', () => {
  it('draws not-yet-replayed terms as not landed, and waits for the verdict', () => {
    const q8 = get('01J8Q8');
    expect(equationTerms(q8, null, null).every((t) => t.landed)).toBe(true);
    expect(equationTerms(q8, null, 2).map((t) => t.landed)).toEqual([true, true, false, false]);
    expect(equationTerms(q8, null, -1).some((t) => t.landed)).toBe(false);
    expect(verdictWord(q8, 2)).toEqual({ word: 'checking…', waiting: true, fail: false });
    expect(verdictWord(q8, null)).toEqual({ word: 'FAIL', waiting: false, fail: true });
  });

  it('marks the selected check and its glyphs', () => {
    const terms = equationTerms(get('01J8Q8'), { side: 'check', id: 'envelope' }, null);
    expect(terms.find((t) => t.selected)?.glyph).toBe('✗');
    expect(terms.filter((t) => t.selected)).toHaveLength(1);
  });
});
