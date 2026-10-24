import { describe, expect, it } from 'vitest';
import { keepForeignKeys, selectionHref } from './verdict/reasons';
import { stepTab, tabFromQuery, withTab, type TaskTab } from './tab';

describe('tabFromQuery', () => {
  it('reads chain and ledger; anything else is the Court', () => {
    expect(tabFromQuery({ tab: 'chain' })).toBe('chain');
    expect(tabFromQuery({ tab: 'ledger' })).toBe('ledger');
    expect(tabFromQuery({})).toBe('court');
    expect(tabFromQuery({ tab: 'court' })).toBe('court');
    expect(tabFromQuery({ tab: 'Ledger' })).toBe('court');
  });
  it('reads a repeated key as its first value', () => {
    expect(tabFromQuery({ tab: ['ledger', 'chain'] })).toBe('ledger');
  });
});

describe('withTab', () => {
  it('adds the key for chain and ledger, none for the Court', () => {
    expect(withTab('/task/a', 'court')).toBe('/task/a');
    expect(withTab('/task/a', 'chain')).toBe('/task/a?tab=chain');
    expect(withTab('/task/a?check=c1', 'ledger')).toBe('/task/a?check=c1&tab=ledger');
  });
  it('round-trips through the query and keepForeignKeys', () => {
    for (const tab of ['court', 'chain', 'ledger'] as TaskTab[]) {
      const href = keepForeignKeys(withTab(selectionHref('a b', { side: 'claim', id: 'k1' }), tab), '?xray=1&tab=chain');
      const q = Object.fromEntries(new URL(href, 'http://x').searchParams);
      expect(tabFromQuery(q)).toBe(tab);
      expect(q).toMatchObject({ claim: 'k1', xray: '1' });
    }
  });
});

describe('stepTab', () => {
  it('moves one over with the arrows, clamped at the ends', () => {
    expect(stepTab('court', 'ArrowRight')).toBe('chain');
    expect(stepTab('chain', 'ArrowLeft')).toBe('court');
    expect(stepTab('court', 'ArrowLeft')).toBe('court');
    expect(stepTab('ledger', 'ArrowRight')).toBe('ledger');
  });
  it('goes to the ends with Home and End, and ignores other keys', () => {
    expect(stepTab('chain', 'Home')).toBe('court');
    expect(stepTab('court', 'End')).toBe('ledger');
    expect(stepTab('court', 'ArrowDown')).toBeNull();
    expect(stepTab('court', 'Enter')).toBeNull();
  });
});
