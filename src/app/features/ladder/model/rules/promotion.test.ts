import { describe, expect, it } from 'vitest';
import type { ClassRow } from '../types';
import { isEligible, pct, promotion } from './promotion';

const rec = (o: Partial<NonNullable<ClassRow['record']>> = {}) => ({ accepted: 9, needed: 15, noEdit: 1, cleanDays: 6, reverts: 0, ...o });
const subject = (o: Partial<Pick<ClassRow, 'tier' | 'ceiling' | 'record'>>) => ({
  tier: 'supervised' as const,
  ceiling: 'hands_off' as const,
  record: rec(),
  ...o,
});

describe('promotion', () => {
  it('counts the Hands-off rules and says not yet', () => {
    const p = promotion(subject({}), 'repro');
    expect(p.kind).toBe('notyet');
    if (p.kind !== 'notyet') return;
    expect(p.next).toBe('hands_off');
    expect(p.rules.map((r) => r.met)).toEqual([false, true, false, true, true]);
    expect(p.rules[0]).toMatchObject({ value: '9 / 15', cells: [9, 15] });
    expect(p.rules[2]).toMatchObject({ value: '6 / 14', cells: [6, 14] });
  });
  it('is eligible when every rule is met', () => {
    const p = promotion(subject({ record: rec({ accepted: 16, cleanDays: 14, noEdit: 0.94 }) }), 'exploit-test');
    expect(isEligible(p)).toBe(true);
  });
  it('needs a mechanical proof class for Hands-off', () => {
    const r = rec({ accepted: 16, cleanDays: 14 });
    expect(promotion(subject({ record: r }), 'human-review').kind).toBe('notyet');
  });
  it('defaults the threshold to 15 when the record has none', () => {
    const p = promotion(subject({ record: rec({ accepted: 14, needed: null, cleanDays: 14 }) }), 'repro');
    expect(p.kind === 'notyet' && p.rules[0]?.value).toBe('14 / 15');
  });
  it('Assisted to Supervised needs 5 accepted and no reverts', () => {
    const ok = promotion(subject({ tier: 'assisted', record: rec({ accepted: 5 }) }), 'repro');
    expect(ok.kind).toBe('eligible');
    expect(ok.kind === 'eligible' && ok.next).toBe('supervised');
    const bad = promotion(subject({ tier: 'assisted', record: rec({ accepted: 5, reverts: 1 }) }), 'repro');
    expect(bad.kind).toBe('notyet');
  });
  it('has no promotion for the special cases', () => {
    expect(promotion(subject({ tier: 'human_only', ceiling: 'human_only', record: null }), 'x').kind).toBe('never');
    expect(promotion(subject({ tier: 'quarantined' }), 'x').kind).toBe('readmit');
    expect(promotion(subject({ tier: 'hands_off' }), 'x').kind).toBe('ceiling');
    expect(promotion(subject({ ceiling: 'supervised' }), 'x').kind).toBe('ceiling');
    expect(promotion(subject({ record: null }), 'x').kind).toBe('unknown');
  });
  it('formats a ratio as a percentage', () => {
    expect(pct(0.94)).toBe('94 %');
    expect(pct(1)).toBe('100 %');
  });
});
