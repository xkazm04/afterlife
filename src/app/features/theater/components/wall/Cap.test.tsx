// The caption's clock: a real film's entry carries its ledger event's UTC time and says so (clockText), as the status
// line does; an illustrative slice's clock stays bare.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { LedgerEntry } from '../../model/types';
import { Cap } from './Cap';

const slice = { seq: 4, t: '10:00:04', by: 'agent', x: 'opened !44' } as LedgerEntry;
const real = {
  ...slice,
  ev: { at: '2026-10-01T10:00:04Z', kind: 'merged', actionClass: 'merge', tier: 'assisted', iid: 1, hash: 'abcdef12', facts: [] },
} as LedgerEntry;
const text = (e: LedgerEntry) => renderToStaticMarkup(createElement(Cap, { e, y: 0, cut: false, quote: '' })).replace(/<[^>]+>/g, '');

describe('the caption clock', () => {
  it('a real event names its clock UTC', () => {
    expect(text(real)).toContain('seq 4 · 10:00:04 UTC');
  });
  it('an illustrative entry keeps its bare clock', () => {
    expect(text(slice)).toContain('seq 4 · 10:00:04');
    expect(text(slice)).not.toContain('UTC');
  });
});
