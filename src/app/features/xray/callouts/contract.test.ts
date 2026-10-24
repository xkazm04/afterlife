import { describe, expect, it } from 'vitest';
import { APP_NAV } from '@/components/shell/sidebar/navItems';
import type { CalloutKind } from '../model/types';
import { TOUR } from './tour';

const ORDER: readonly CalloutKind[] = ['module', 'columns', 'activity', 'shell'];
const BANNED = ['role="radiogroup"', 'role="tablist"', 'role="tab"', 'type="search"', 'aria-label="Search'];

describe('X-ray content contract', () => {
  it('tours APP_NAV keys, in sidebar order', () => {
    const keys = TOUR.map((s) => s.key);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys).toEqual(APP_NAV.map((e) => e.key).filter((k) => keys.includes(k)));
  });

  for (const stop of TOUR) {
    describe(stop.key, () => {
      it('has exactly one module callout and it is first', () => {
        expect(stop.callouts.filter((c) => c.kind === 'module')).toHaveLength(1);
        expect(stop.callouts[0]?.kind).toBe('module');
      });

      it('keeps the kinds in contract order', () => {
        const ranks = stop.callouts.map((c) => ORDER.indexOf(c.kind));
        expect(ranks.every((r) => r >= 0)).toBe(true);
        expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
      });

      it('gives every columns callout a legend, and only those', () => {
        for (const c of stop.callouts) {
          if (c.kind === 'columns') expect(c.legend?.length ?? 0).toBeGreaterThan(0);
          else expect(c.legend).toBeUndefined();
        }
      });

      it('never points at a tab, a switch or a search box', () => {
        for (const c of stop.callouts) for (const b of BANNED) expect(c.sel, `${c.id}: ${c.sel}`).not.toContain(b);
      });

      it('has unique ids', () => {
        const ids = stop.callouts.map((c) => c.id);
        expect(new Set(ids).size).toBe(ids.length);
      });
    });
  }
});
