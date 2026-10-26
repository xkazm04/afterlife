import { describe, expect, it } from 'vitest';
import { APP_NAV, NAV_GROUPS, activeNavKey } from '@/components/shell/sidebar/navItems';
import { CHAPTERS, STEPS } from './steps';

describe('the guide’s path', () => {
  it('walks the chapters in the sidebar’s group order, each one whole, never interleaved', () => {
    const order = STEPS.map((s) => s.chapter).filter((c, i, all) => c !== all[i - 1]);
    expect(order).toEqual(NAV_GROUPS.map((g) => g.key));
    expect(CHAPTERS.map((c) => c.label)).toEqual(NAV_GROUPS.map((g) => g.label));
    expect(CHAPTERS.reduce((n, c) => n + c.steps, 0)).toBe(STEPS.length);
  });

  it('visits every screen in the sidebar, each within its own chapter', () => {
    const visited = new Map(STEPS.map((s) => [activeNavKey(s.href), s.chapter]));
    for (const g of NAV_GROUPS) for (const e of g.entries) expect([e.key, visited.get(e.key)]).toEqual([e.key, g.key]);
    expect(APP_NAV.every((e) => visited.has(e.key))).toBe(true);
  });

  it('starts with a text size the person can read, then brings a project in before any screen that needs one', () => {
    expect(STEPS[0]?.href).toBe('/settings/display');
    expect(activeNavKey(STEPS[1]?.href ?? '')).toBe('start');
  });
});
