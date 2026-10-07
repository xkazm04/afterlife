import { describe, expect, it } from 'vitest';
import type { ClassRow } from '../types';
import { actsFrom, cellOf, isQuarantine, nothingToRevoke, revokeTarget, revokeTargets, shownName } from './tiers';

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
    expect(nothingToRevoke({ tier: 'human_only' })).toBe('never an agent');
    expect(nothingToRevoke({ tier: 'quarantined' })).toBe('already read and comment only');
    expect(nothingToRevoke({ tier: 'quarantined', cell: 'no_record' })).toMatch(/^no record yet/);
  });
});

describe('what a row shows and acts from', () => {
  const row = (over: Partial<ClassRow>): Pick<ClassRow, 'tier' | 'cell' | 'holders'> => ({ tier: 'quarantined', ...over });
  const split = row({ tier: 'assisted', cell: 'refused', holders: [{ agent: 'ai-a', tier: 'supervised' }, { agent: 'ai-b', tier: 'assisted' }] });

  it('a no-record class is not a quarantine: no rung, nothing to revoke, no Re-admit', () => {
    const c = row({ cell: 'no_record' });
    expect([cellOf(c), shownName(c), actsFrom(c), isQuarantine(c)]).toEqual(['no_record', 'No record yet', null, false]);
    expect(revokeTargets(actsFrom(c))).toEqual([]);
  });
  it('a tripwire quarantine, sent with no cell, is a quarantine', () => {
    expect(isQuarantine(row({}))).toBe(true);
    expect(shownName(row({}))).toBe('Quarantined');
  });
  it('a split class names each holder and revokes from its highest holder', () => {
    expect(shownName(split)).toBe('Split: ai-a Supervised · ai-b Assisted');
    expect(actsFrom(split)).toBe('supervised');
    expect(isQuarantine(split)).toBe(false);
  });
  it('an unknown tier reads unknown, not quarantined', () => {
    const c = row({ cell: null });
    expect([shownName(c), actsFrom(c), isQuarantine(c)]).toEqual(['unknown', null, false]);
  });
});
