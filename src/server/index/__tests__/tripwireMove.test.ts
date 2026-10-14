import { describe, expect, it } from 'vitest';
import { lastMove } from '../views/actionClasses';
import { parseMove } from '../seed/parse';
import type { ClassTierRow } from '../repositories/fleet/classTier';

const NOW = new Date('2026-05-01T12:00:00Z');
const row = (move: ClassTierRow['move']) => ({ move, record: null }) as unknown as ClassTierRow;
const at = new Date(NOW.getTime() - 4 * 60_000);

describe('the tripwire move carries the trigger that fired', () => {
  it('names it after tripwire when the move has a note', () => {
    expect(lastMove(row({ kind: 'tripwire', at, note: 'guardrail_high' }), NOW)).toBe('4 min ago · tripwire · guardrail_high');
  });
  it('keeps the older text when no trigger is recorded', () => {
    expect(lastMove(row({ kind: 'tripwire', at, note: null }), NOW)).toBe('4 min ago · tripwire');
    expect(lastMove(row({ kind: 'tripwire', at: null, note: null }), NOW)).toBe('tripwire');
  });
  it('the seed reads both shapes back into a move', () => {
    expect(parseMove('4 min ago · tripwire · guardrail_high', NOW)).toMatchObject({ kind: 'tripwire', note: 'guardrail_high' });
    expect(parseMove('4 min ago · tripwire', NOW)).toMatchObject({ kind: 'tripwire', note: null });
  });
});
