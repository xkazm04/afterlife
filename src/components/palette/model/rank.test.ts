import { describe, expect, it } from 'vitest';
import { paletteItems } from './items';
import { rank, score } from './rank';

const items = paletteItems([
  { id: 'ledgerline', name: 'ledgerline', group: 'core-banking', state: 'watching' },
  { id: 'ledgerline-web', name: 'ledgerline-web', group: 'core-banking', state: 'watching' },
  { id: 'fx-rates', name: 'fx-rates', group: 'risk', state: 'setting-up' },
  { id: 'legacy-batch', name: 'legacy-batch', group: 'core-banking', state: 'not-set-up' },
]);
const labels = (q: string) => rank(items, q).map((i) => i.label);

describe('palette ranking', () => {
  it('shows the screens and actions, not the projects, before anything is typed', () => {
    const out = rank(items, '', 50);
    expect(out.some((i) => i.kind === 'project')).toBe(false);
    expect(out.map((i) => i.label)).toContain('Cycles');
    expect(out.map((i) => i.label)).toContain('Design the next cycle');
  });
  it('puts a prefix first, and the shorter of two prefixes first', () => {
    expect(labels('ledger').slice(0, 2)).toEqual(['ledgerline', 'ledgerline-web']);
    expect(labels('cyc')[0]).toBe('Cycles');
  });
  it('finds a word inside a label, and a scattered subsequence last', () => {
    expect(labels('batch')).toEqual(['Preview the next onboarding batch', 'legacy-batch']);
    expect(score('onboard', 'onbd')).toBeGreaterThan(0);
    expect(score('onboard', 'zz')).toBe(0);
  });
  it('answers to keywords and to a project group', () => {
    expect(labels('revoke')).toEqual(['Take autonomy back']);
    expect(labels('risk')).toContain('fx-rates');
  });
  it('sends a project to Fleet with it selected, and every screen to its route', () => {
    expect(rank(items, 'fx-rates')[0]?.href).toBe('/fleet?project=fx-rates');
    expect(rank(items, 'onboard')[0]).toMatchObject({ kind: 'screen', href: '/onboard' });
  });
});
