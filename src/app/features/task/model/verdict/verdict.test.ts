import { describe, expect, it } from 'vitest';
import { loadTasks } from '../build/loadTasks';
import type { TaskView } from '../types';
import { equationTerms, verdictWord } from './equation';
import { verdictOf } from '@/schemas';
import { claimStatus, derivedVerdict, tally, verdictLabel } from './verdict';
import { NO_FILTERS, verdictCounts, visibleTasks } from '../docket/filters';

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
  });

  it('never counts a check a person decides as a pass or as a fail', () => {
    expect(verdictOf([c(true), c(null, 'human')], true)).toBe('pass');
    expect(verdictOf([c(null, 'human'), c(false)], true)).toBe('fail');
    expect(derivedVerdict(get('01J8QC')).verdict).toBe('PASS');
    expect(derivedVerdict(get('01J8Q8')).verdict).toBe('FAIL');
    expect(tally(get('01J8QC'))).toEqual({ ok: 3, bad: 0, unk: 1 });
  });
});

describe('tally', () => {
  it('counts only the terms that have landed', () => {
    expect(tally(get('01J8Q8'))).toEqual({ ok: 3, bad: 1, unk: 0 });
    expect(tally(get('01J8Q8'), (i) => i < 2)).toEqual({ ok: 2, bad: 0, unk: 0 });
  });
  it('counts a struck term (a person decides it) as open whatever its ok, as the equation draws it: never a hold or a fail', () => {
    const q8 = get('01J8Q8');
    const signed = { ...q8, proof: { ...q8.proof, checks: q8.proof.checks.map((c) => ({ ...c, decidedBy: 'human' as const })) } };
    expect(tally(signed)).toEqual({ ok: 0, bad: 0, unk: 4 });
    expect(equationTerms(signed, null, null).map((t) => [t.kind, t.glyph])).toEqual(Array(4).fill(['unk', '?']));
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
    expect(verdictWord(q8, 2)).toMatchObject({ word: 'checking…', waiting: true, fail: false });
    expect(verdictWord(q8, null)).toMatchObject({ word: 'FAIL', waiting: false, fail: true });
  });

  it('marks the selected check and its glyphs', () => {
    const terms = equationTerms(get('01J8Q8'), { side: 'check', id: 'envelope' }, null);
    expect(terms.find((t) => t.selected)?.glyph).toBe('✗');
    expect(terms.filter((t) => t.selected)).toHaveLength(1);
  });
});

describe('derivedVerdict', () => {
  const lie = (): TaskView => {
    const q4 = get('01J8Q4');
    return { ...q4, proof: { ...q4.proof, verdict: 'PASS', checks: q4.proof.checks.map((c, i) => (i === 0 ? { ...c, ok: false } : c)) } };
  };

  it('agrees with the stored word on every fixture task', () => {
    const measured = tasks.map((t) => [t.id, t.proof.verdict, derivedVerdict(t).verdict, derivedVerdict(t).mismatch]);
    expect(measured.filter((m) => m[1] !== m[2] || m[3])).toEqual([]);
  });

  it('lets a false engine check beat a stored PASS, and flags the disagreement', () => {
    const t = lie();
    expect(derivedVerdict(t)).toEqual({ verdict: 'FAIL', stored: 'PASS', mismatch: true });
    expect(verdictWord(t, null)).toMatchObject({ word: 'FAIL', fail: true, mismatch: true, stored: 'PASS' });
    expect(verdictWord(t, 0)).toMatchObject({ word: 'checking…', mismatch: false });
    expect(verdictCounts([t])).toEqual({ all: 1, pass: 0, fail: 1 });
    expect(visibleTasks([t], { ...NO_FILTERS, verdict: 'FAIL' })).toHaveLength(1);
  });

  it('ignores a check a person decides, and never flags an honest task', () => {
    const t = lie();
    const human = { ...t, proof: { ...t.proof, checks: t.proof.checks.map((c, i) => (i === 0 ? { ...c, decidedBy: 'human' as const } : c)) } };
    expect(derivedVerdict(human)).toEqual({ verdict: 'PASS', stored: 'PASS', mismatch: false });
  });

  it('does not read an unknown envelope as a breach, and keeps a task with no proof UNKNOWN', () => {
    expect(derivedVerdict({ ...get('01J8Q4'), envelope: null }).verdict).toBe('PASS');
    expect(derivedVerdict({ ...get('01J8Q4'), envelope: { files: 1, lines: 1, paths: [], within: false } }).verdict).toBe('FAIL');
    expect(derivedVerdict({ envelope: null, proof: { cls: 'x', verdict: 'UNKNOWN', engine: '', digest: '', checks: [] } })).toEqual({ verdict: 'UNKNOWN', stored: 'UNKNOWN', mismatch: false });
  });

  it('fails a known breached envelope even with no checks and no stored word, as verdictOf does', () => {
    const empty = { cls: 'x', verdict: 'UNKNOWN' as const, engine: '', digest: '', checks: [] };
    expect(derivedVerdict({ envelope: { files: 1, lines: 1, paths: [], within: false }, proof: empty }).verdict).toBe('FAIL');
    expect(derivedVerdict({ envelope: { files: 1, lines: 1, paths: [], within: true }, proof: empty }).verdict).toBe('UNKNOWN');
  });
});
