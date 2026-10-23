// Every Fleet column header is named by the text it shows; only the icon-only headers are named by their tip.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { fleetColumns } from '../../model/columns';
import { FleetHeader } from './FleetHeader';

const noop = () => undefined;
const meta = { classes: ['dep-bump.patch', 'fix'], stages: ['s'], tiers: DEMO.tiers };
const render = (view: 'tiers' | 'classes' | 'stages', narrow = false) =>
  renderToStaticMarkup(createElement(FleetHeader, { columns: fleetColumns(view, meta), sort: { key: 'attention', dir: 1 }, onSort: noop, narrow }));

/** Each column header's aria-label (null when it has none) and its visible text. */
const headers = (html: string) =>
  [...html.matchAll(/<(?:button|div)\b([^>]*role="columnheader"[^>]*)>(.*?)<\/(?:button|div)>/g)].map((m) => ({
    label: /aria-label="([^"]*)"/.exec(m[1] ?? '')?.[1] ?? null,
    text: (m[2] ?? '').replace(/<svg.*?<\/svg>/g, '').replace(/<[^>]+>/g, ''),
  }));

describe('FleetHeader accessible names', () => {
  it('never replaces a header that shows text with its tip (label in name)', () => {
    for (const view of ['tiers', 'classes', 'stages'] as const) {
      for (const h of headers(render(view))) {
        if (h.text.trim() !== '') expect(h.label === null || h.label.includes(h.text.trim())).toBe(true);
      }
    }
  });

  it('names the state and needs icon headers by their tip', () => {
    const hs = headers(render('classes'));
    expect(hs.map((h) => h.label)).toContain('State');
    expect(hs.map((h) => h.label)).toContain('Needs you');
  });

  it('names a narrow tier letter mark by its tip', () => {
    const tierHeads = headers(render('tiers', true)).filter((h) => h.label?.includes('Click to rank by it'));
    expect(tierHeads.length).toBe(5);
  });
});
