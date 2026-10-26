import { createElement, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SliceFixture, type ScreenKey } from '@/components/shell/host';
import { ADJUSTMENTS, MARKERS, NOW, PROD, PROJECT, RUNS } from '../data/__fixtures__/grinex';
import { adjustmentsFold, ciFold, configRow, configView, prodFold, runsCell } from '../model/view';

vi.mock('next/navigation', () => ({ usePathname: () => '/vitals', useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }) }));
vi.mock('next/link', () => ({ default: (p: { href: string; children?: ReactNode }) => createElement('a', { href: p.href }, p.children) }));
vi.mock('../data/actions', () => ({ refreshVitals: vi.fn(async () => ({ ok: false, error: 'not in tests' })) }));
const { screens } = await import('./host');

const def = (key: ScreenKey) => screens.find((d) => d.key === key);
const render = (key: ScreenKey, fixture: Parameters<typeof SliceFixture>[0]['slices'], params: Record<string, string> = {}, states = {}) => {
  const Frame = def(key)?.Frame ?? (() => null);
  const html = renderToString(
    <SliceFixture slices={fixture} states={states}>
      <Frame params={params} search={new URLSearchParams()} />
    </SliceFixture>,
  );
  return html.replace(/<!-- -->/g, '');
};
const project = { project: PROJECT.slug };

describe('Vitals on the screen host', () => {
  it('is claimed, both keys, with their slices in stream order', () => {
    expect(def('vitals')).toMatchObject({ ready: true, slices: ['config', 'runs'] });
    expect(def('vitals/[project]')).toMatchObject({ ready: true, slices: ['config', 'job', 'ci', 'prod', 'adjustments'] });
    expect(def('vitals/[project]')?.title(project, new URLSearchParams())).toBe('Belay Vitals grinex-portal');
    expect(def('vitals/[project]')?.NotFound).toBeDefined();
  });

  it('the list unread: the window at once, a dash for the count, never "no real project yet"', () => {
    const html = render('vitals', {});
    expect(html).toContain('Vitals');
    expect(html).toContain('— real projects');
    expect(html).not.toContain('No real project yet');
  });

  it('the list with configs only: rows, their last collected and runs stored dashes until the runs land', () => {
    const configs = { projects: [configRow(PROJECT)] };
    const html = render('vitals', { config: configs });
    expect(html).toContain('Grinex Portal');
    expect(html).toContain('aria-label="runs stored not read yet"');
    expect(html).not.toContain('never');
    const full = render('vitals', { config: configs, runs: { now: NOW, bySlug: { [PROJECT.slug]: runsCell(RUNS) } } });
    expect(full).toContain('5 m ago');
    expect(full).toContain(`>${RUNS.length}<`);
  });

  it('the list from another machine: says it answers only here', () => {
    expect(render('vitals', {}, {}, { config: { state: 'error', reason: 'not-local' } })).toContain('Only on this machine.');
  });

  it('a project unread: its slug, the three bands with dashes, no zero runs, no "never", Refresh held', () => {
    const html = render('vitals/[project]', {}, project);
    expect(html).toContain('grinex-portal');
    for (const t of ['Delivery', 'Production', 'Adjustments']) expect(html).toContain(t);
    expect(html).not.toContain('last collected never');
    expect(html).not.toContain('0 runs stored');
    expect(html).not.toContain('No adjustment reported yet');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Refresh/);
  });

  it('a project read band by band', () => {
    const base = { config: { ...configView(PROJECT), now: NOW }, job: {} };
    const ci = render('vitals/[project]', { ...base, ci: ciFold(PROJECT, RUNS) }, project);
    expect(ci).toContain('master-full');
    expect(ci).toContain('last collected 5 m ago');
    expect(ci).toContain('aria-label="Production not read yet"');
    const full = render('vitals/[project]', { ...base, ci: ciFold(PROJECT, RUNS), prod: prodFold(PROJECT, PROD, MARKERS, NOW), adjustments: { adjustments: adjustmentsFold(PROJECT, ADJUSTMENTS) } }, project);
    expect(full).toContain('28,800');
    expect(full).toContain('>credited<');
  });
});
