import { createElement, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { SliceFixture } from '@/components/shell/host';
import { demoSource, setDataSource } from '@/server/data';
import { loadCyclesData } from '../data/loadCyclesData';
import { loadEstateData } from '../data/loadEstateData';
import { estateCycles, estateSummary } from '../model/estate/split';
import { screens } from './host';
import { loaders } from './slices';

vi.mock('next/navigation', () => ({ usePathname: () => '/cycles', useRouter: () => ({ push: () => undefined, replace: () => undefined, refresh: () => undefined }) }));
vi.mock('next/link', () => ({ default: (p: { href: string; children?: ReactNode }) => createElement('a', { href: p.href }, p.children) }));
afterEach(() => setDataSource(null));

const def = screens.find((d) => d.key === 'cycles');
const render = (fixture: Parameters<typeof SliceFixture>[0]['slices'], query = '') => {
  const Frame = def?.Frame ?? (() => null);
  const html = renderToString(
    <ToastProvider>
      <SliceFixture slices={fixture}>
        <Frame params={{}} search={new URLSearchParams(query)} />
      </SliceFixture>
    </ToastProvider>,
  );
  return html.replace(/<!-- -->/g, '');
};

describe('Cycles on the screen host', () => {
  it('is claimed, with its slices in stream order', () => {
    expect(def).toMatchObject({ ready: true, slices: ['core', 'estate', 'estateCycles'] });
    expect(def?.title({}, new URLSearchParams())).toBe('Afterlife · Cycles');
    expect(Object.keys(loaders.cycles?.slices ?? {})).toEqual(def?.slices);
  });

  it('unread: the real window, the scope switch and every stage row at once, a dash for every value, never a zero', () => {
    const html = render({});
    expect(html).toContain('<b>Cycles</b>');
    expect(html).toContain('Estate');
    expect(html).toContain('>secure<');
    expect(html).toContain('data-reveal="wait"');
    expect(html).toContain('—');
    expect(html).not.toMatch(/>0</);
  });

  it('core read: the grid, the running cycle and the answer band fill in', () => {
    setDataSource(demoSource);
    const data = loadCyclesData();
    const html = render({ core: data });
    expect(html).toContain('data-reveal="in"');
    expect(html).toContain('chain holds');
    expect(html).toContain(data.cycles.find((c) => c.state === 'running')?.id ?? 'none');
  });

  it('the estate scope keeps the project read a moment across a switch, and still draws dashes, never the project', () => {
    setDataSource(demoSource);
    const html = render({ core: loadCyclesData(), estate: {} }, 'scope=estate');
    expect(html).toContain('— / estate');
    expect(html).not.toContain('chain holds');
  });

  it('the estate lands: groups and rows; the cycles slice fills the inspector', () => {
    setDataSource(demoSource);
    const estate = loadEstateData();
    const rows = render({ estate: estateSummary(estate) }, 'scope=estate');
    expect(rows).toContain(`${estate.org} / estate`);
    expect(rows).toContain('cycles not read yet');
    const full = render({ estate: estateSummary(estate), estateCycles: estateCycles(estate) }, 'scope=estate');
    expect(full).not.toContain('cycles not read yet');
  });

  it('?design=1 opens the designer once the data lands', () => {
    setDataSource(demoSource);
    expect(render({ core: loadCyclesData() }, 'design=1')).toContain('Designing');
  });

  it('the slices read only what the scope draws', async () => {
    setDataSource(demoSource);
    const ctx = (q: string) => ({ params: {}, search: new URLSearchParams(q), signal: new AbortController().signal });
    const s = loaders.cycles?.slices ?? {};
    expect(await s.core?.(ctx('scope=estate'))).toEqual({ status: 'ok', data: {} });
    expect(await s.estate?.(ctx(''))).toEqual({ status: 'ok', data: {} });
    const rows = await s.estate?.(ctx('scope=estate'));
    expect(JSON.stringify(rows)).not.toContain('"changes"');
  });
});
