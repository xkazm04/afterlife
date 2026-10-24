// The answer block reads in one order: hero, one row of filter chips, a rule, the stats; the locked chip carries its ✕.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Answer } from '../components/ui/Answer';
import { fleetTotals, type MarkKind } from '../model/words';

vi.mock('next/link', () => ({ default: (p: { href: string; className?: string; children?: unknown }) => createElement('a', { href: p.href, className: p.className }, p.children as never) }));

const html = (locked: MarkKind | null = null, over: Partial<ReturnType<typeof fleetTotals>> = {}) =>
  renderToStaticMarkup(
    createElement(Answer, {
      totals: { ...fleetTotals([]), stale: 2, quar: 1, ...over },
      tiers: [{ n: 3, names: ['ledgerline'] }],
      staleTop: null,
      cycles: { projects: 2, gained: 4 },
      intro: false,
      tabbable: true,
      locked,
      onMark: () => undefined,
      onLock: () => undefined,
      onOpen: () => undefined,
    }),
  );
const at = (h: string, s: string) => h.indexOf(s);

describe('the answer block', () => {
  it('goes hero, chips, rule, stats', () => {
    const h = html();
    const order = ['data-role="door-big"', 'data-role="door-big-sub"', 'data-role="door-mark"', '<hr', 'each at', 'href="/cycles"'].map((s) => at(h, s));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
  it('makes every chip the same kind, a pressed-state button, and the cycles stat a link, not a chip', () => {
    const h = html();
    const chips = h.match(/<button[^>]*data-role="door-mark"[^>]*>/g) ?? [];
    expect(chips.length).toBe(5);
    const cls = new Set(chips.map((c) => /class="([^"]+)"/.exec(c)![1]));
    expect(cls.size).toBe(1);
    expect(chips.every((c) => c.includes('aria-pressed="false"'))).toBe(true);
    const link = /<a[^>]*href="\/cycles"[^>]*>/.exec(h)![0];
    expect(link).not.toContain([...cls][0]);
  });
  it('hides the quiet chips at 0 and shows them when not', () => {
    expect(html()).not.toContain('no record yet');
    expect(html(null, { norec: 1, split: 2 })).toMatch(/no record yet[\s\S]*split between agents/);
  });
  it('gives only the locked chip its pressed state and a ✕', () => {
    const h = html('quar');
    expect(h.match(/aria-pressed="true"/g)?.length).toBe(1);
    expect(h.match(/✕/g)?.length).toBe(1);
    expect(at(h, 'aria-pressed="true"')).toBeLessThan(at(h, '✕'));
    expect(at(h, '✕')).toBeLessThan(at(h, '<hr'));
    expect(html()).not.toContain('✕');
  });
});
