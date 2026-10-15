// Who an entry names. The illustrative slice's actors get their caption names; a real event's agent (a service account
// such as "ai-patcher-acme") is shown as it is, even when its name collides with an Object.prototype key.
import { describe, expect, it } from 'vitest';
import { BY_SHORT, WHO } from '../../data/constants';
import { shortOf, whoOf } from './who';

describe('whoOf', () => {
  it('names every actor of the slice by its caption', () => {
    for (const [by, name] of Object.entries(WHO)) expect(whoOf(by)).toBe(name);
  });

  it('shows a real agent as it is', () => {
    expect(whoOf('ai-patcher-acme')).toBe('ai-patcher-acme');
    expect(whoOf('')).toBe('');
  });

  it('never reads an inherited property as an actor', () => {
    for (const by of ['toString', 'constructor', '__proto__', 'hasOwnProperty']) expect(whoOf(by)).toBe(by);
  });
});

describe('shortOf', () => {
  it('uses the short tag where the actor has one, else the actor\'s own id', () => {
    for (const [by, tag] of Object.entries(BY_SHORT)) expect(shortOf(by)).toBe(tag);
    expect(shortOf('T1')).toBe('T1');
    expect(shortOf('T8')).toBe('T8');
  });

  it('shows a real agent as it is, and never an inherited property', () => {
    expect(shortOf('ai-patcher-acme')).toBe('ai-patcher-acme');
    for (const by of ['toString', 'constructor', '__proto__']) expect(shortOf(by)).toBe(by);
  });
});
