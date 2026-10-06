import { describe, expect, it } from 'vitest';
import { clampRung, dayCells, rungCells } from './cells';

describe('rungCells (Q A S H)', () => {
  it('marks the current rung and hatches above the ceiling', () => {
    expect(rungCells('supervised', 'hands_off')).toEqual(['in', 'in', 'at', 'in']);
    expect(rungCells('assisted', 'supervised')).toEqual(['in', 'at', 'in', 'out']);
    expect(rungCells('quarantined', 'assisted')).toEqual(['at', 'in', 'out', 'out']);
  });
  it('draws Human only as four hatched cells', () => {
    expect(rungCells('human_only', 'human_only')).toEqual(['out', 'out', 'out', 'out']);
  });
});

describe('dayCells', () => {
  it('fills the newest clean days', () => {
    const c = dayCells(3);
    expect(c).toHaveLength(14);
    expect(c.slice(0, 11).every((x) => x === 'none')).toBe(true);
    expect(c.slice(11)).toEqual(['clean', 'clean', 'clean']);
  });
  it('clamps to the window', () => {
    expect(dayCells(99).every((x) => x === 'clean')).toBe(true);
    expect(dayCells(-4).every((x) => x === 'none')).toBe(true);
  });
  it('shows a revert as a red last cell only when no day is clean', () => {
    expect(dayCells(0, 14, true)[13]).toBe('fail');
    expect(dayCells(2, 14, true)[13]).toBe('clean');
  });
});

describe('clampRung', () => {
  it('clamps to 0..4', () => {
    expect(clampRung(-1)).toBe(0);
    expect(clampRung(2)).toBe(2);
    expect(clampRung(9)).toBe(4);
  });
});
