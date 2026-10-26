import { createElement, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { SliceFixture } from '@/components/shell/host';
import { demoSource, setDataSource } from '@/server/data';
import { loadMonitorData } from '../data/loadMonitorData';
import { loadMonitorSignals } from '../data/loadMonitorEstate';
import { screens } from './host';

vi.mock('next/navigation', () => ({ usePathname: () => '/monitor', useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }));
vi.mock('next/link', () => ({ default: (p: { href: string; children?: ReactNode }) => createElement('a', { href: p.href }, p.children) }));
afterEach(() => setDataSource(null));

const def = screens.find((d) => d.key === 'monitor');
const render = (fixture: Parameters<typeof SliceFixture>[0]['slices'], states = {}) => {
  const Frame = def?.Frame ?? (() => null);
  return renderToString(
    <ToastProvider>
      <SliceFixture slices={fixture} states={states}>
        <Frame params={{}} search={new URLSearchParams()} />
      </SliceFixture>
    </ToastProvider>,
  );
};

describe('the Monitor on the screen host', () => {
  it('is claimed, with its slices in stream order', () => {
    expect(def).toMatchObject({ ready: true, slices: ['core', 'estate', 'desk'] });
    expect(def?.title({}, new URLSearchParams())).toBe('Afterlife · Monitor');
  });

  it('unread: the real window at once, a dash for every value, never a zero, no amber number', () => {
    const html = render({});
    expect(html).toContain('<b>Monitor</b>');
    expect(html).toContain('Sweep');
    expect(html).toContain('—');
    expect(html).toContain('data-reveal="wait"');
    expect(html).toMatch(/aria-busy="true"/);
    expect(html).not.toMatch(/>0</);
    expect(html).not.toContain('No projects in this fleet yet');
  });

  it('core read: the fleet fills in; estate and desk still unread say nothing of themselves', () => {
    setDataSource(demoSource);
    const data = loadMonitorData();
    const html = render({ core: data });
    expect(html).toContain(data.org);
    expect(html).toContain('data-reveal="in"');
    expect(html).not.toContain('agents spent');
  });

  it('the estate lands: the week note beside the big number', () => {
    setDataSource(demoSource);
    const html = render({ core: loadMonitorData(), estate: loadMonitorSignals() });
    expect(html).toMatch(/since last week|trend starts/);
  });

  it('the fleet could not be read: says why in the pane', () => {
    const html = render({}, { core: { state: 'error', reason: 'AFTERLIFE_MODE=live, but the first poll has not finished' } });
    expect(html.replace(/<!-- -->/g, '')).toContain('The fleet could not be read: AFTERLIFE_MODE=live, but the first poll has not finished');
  });
});
