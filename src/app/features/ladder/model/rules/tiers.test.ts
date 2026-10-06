import { describe, expect, it } from 'vitest';
import { nothingToRevoke, revokeTarget, revokeTargets } from './tiers';

describe('revokeTargets', () => {
  it('lists every lower rung, nearest first', () => {
    expect(revokeTargets('hands_off')).toEqual(['supervised', 'assisted', 'quarantined']);
    expect(revokeTargets('supervised')).toEqual(['assisted', 'quarantined']);
    expect(revokeTargets('assisted')).toEqual(['quarantined']);
  });
  it('has none for Quarantined and Human only', () => {
    expect(revokeTargets('quarantined')).toEqual([]);
    expect(revokeTargets('human_only')).toEqual([]);
  });
});

describe('revokeTarget', () => {
  it('r goes one step, q goes to Quarantined', () => {
    expect(revokeTarget('hands_off')).toBe('supervised');
    expect(revokeTarget('hands_off', 'quarantine')).toBe('quarantined');
    expect(revokeTarget('assisted', 'quarantine')).toBe('quarantined');
  });
  it('is null when there is nowhere lower to go', () => {
    expect(revokeTarget('quarantined')).toBeNull();
    expect(revokeTarget('quarantined', 'quarantine')).toBeNull();
    expect(revokeTarget('human_only')).toBeNull();
    expect(nothingToRevoke('human_only')).toBe('never an agent');
    expect(nothingToRevoke('quarantined')).toBe('already read and comment only');
  });
});
