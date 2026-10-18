// Who an entry names. The illustrative slice's actors get their caption names; a real event's agent (a service account
// such as "ai-patcher-acme") is shown as it is, even when its name collides with an Object.prototype key.
import { describe, expect, it } from 'vitest';
import { BY_SHORT, WHO } from '../../data/constants';
import type { LedgerEntry } from '../types';
import { shortOf, whoOf } from './who';

const slice = (by: string) => ({ by });
const real = (by: string): Pick<LedgerEntry, 'by' | 'ev'> => ({
  by,
  ev: { at: '2026-10-01T00:00:00Z', kind: 'merged', actionClass: 'merge', tier: 'assisted', iid: 1, hash: 'abcdef12', facts: [] },
});

describe('whoOf', () => {
  it('names every actor of the slice by its caption', () => {
    for (const [by, name] of Object.entries(WHO)) expect(whoOf(slice(by))).toBe(name);
  });

  it('shows a real agent as it is', () => {
    expect(whoOf(slice('ai-patcher-acme'))).toBe('ai-patcher-acme');
    expect(whoOf(slice(''))).toBe('');
  });

  it('never reads an inherited property as an actor', () => {
    for (const by of ['toString', 'constructor', '__proto__', 'hasOwnProperty']) expect(whoOf(slice(by))).toBe(by);
  });
});

describe('a real film', () => {
  it('states only its event agent, even when the id collides with a slice actor', () => {
    for (const by of Object.keys(WHO)) {
      expect(whoOf(real(by))).toBe(by);
      expect(shortOf(real(by))).toBe(by);
    }
  });
});

describe('shortOf', () => {
  it('uses the short tag where the actor has one, else the actor\'s own id', () => {
    for (const [by, tag] of Object.entries(BY_SHORT)) expect(shortOf(slice(by))).toBe(tag);
    expect(shortOf(slice('T1'))).toBe('T1');
    expect(shortOf(slice('T8'))).toBe('T8');
  });

  it('shows a real agent as it is, and never an inherited property', () => {
    expect(shortOf(slice('ai-patcher-acme'))).toBe('ai-patcher-acme');
    for (const by of ['toString', 'constructor', '__proto__']) expect(shortOf(slice(by))).toBe(by);
  });
});
