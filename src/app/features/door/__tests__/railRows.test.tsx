// The L1 rail lists projects as the city places them: one name collation, not the browser's locale.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FleetProject } from '@/lib/demo/types';
import { Rail } from '../components/rail/Rail';
import { districtsOf } from '../model/city';

vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));

const P = (id: string, extra: Partial<FleetProject> = {}): FleetProject =>
  ({
    id, name: id, what: '', state: 'watching', armed: 0, group: 'g', needsYou: 0, craOpen: 0, stages: Array(9).fill(null),
    tiers: {}, proofs7d: null, demotions7d: null, feed: { ageSec: 5 }, classTiers: {}, ...extra,
  }) as unknown as FleetProject;

const rail = (ps: FleetProject[]) =>
  renderToStaticMarkup(createElement(Rail, { d: districtsOf(['g'], ps)[0]!, hotId: null, onHover: () => undefined, onOpen: () => undefined }));

describe('the rail orders names as the city does', () => {
  const own = String.prototype.localeCompare;
  afterEach(() => void (String.prototype.localeCompare = own));
  it('lists "charts" before "hub" under a cs default locale', () => {
    String.prototype.localeCompare = function (this: string, that: string, loc?: string | string[], o?: Intl.CollatorOptions) {
      return own.call(this, that, loc ?? 'cs', o);
    };
    const html = rail(['hub', 'charts'].map((id) => P(id, { needsYou: 2 })));
    expect(html.indexOf('>charts<')).toBeGreaterThan(-1);
    expect(html.indexOf('>charts<')).toBeLessThan(html.indexOf('>hub<'));
  });
});

describe('the rail says why a project is stale as the readout does', () => {
  it('a stale feed with no error gives its last good poll, not "feed stale"', () => {
    const html = rail([P('old', { state: 'stale', feed: { ageSec: 2820 } } as Partial<FleetProject>)]);
    expect(html).not.toContain('feed stale');
    expect(html).toContain('last good poll 47 min ago');
  });
  it('a feed error keeps its own words and gains the age', () => {
    const html = rail([P('old', { state: 'stale', feed: { ageSec: 2820, error: 'HTTP 503' } } as Partial<FleetProject>)]);
    expect(html).toContain('HTTP 503 · last good poll 47 min ago');
  });
});
