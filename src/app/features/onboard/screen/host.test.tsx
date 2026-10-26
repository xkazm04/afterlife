import { createElement, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { SliceFixture } from '@/components/shell/host';
import { demoSource, setDataSource } from '@/server/data';
import { loadOnboardData } from '../data/loadOnboardData';
import { screens } from './host';
import { loaders } from './slices';

vi.mock('next/navigation', () => ({ usePathname: () => '/onboard/estate', useRouter: () => ({ push: () => undefined, replace: () => undefined, refresh: () => undefined }) }));
vi.mock('next/link', () => ({ default: (p: { href: string; children?: ReactNode }) => createElement('a', { href: p.href }, p.children) }));
afterEach(() => setDataSource(null));

const def = (key: string) => screens.find((d) => d.key === key);
const render = (key: string, fixture: Parameters<typeof SliceFixture>[0]['slices'], states: Parameters<typeof SliceFixture>[0]['states'] = {}, query = '') => {
  const Frame = def(key)?.Frame ?? (() => null);
  return renderToString(
    <ToastProvider>
      <SliceFixture slices={fixture} states={states}>
        <Frame params={{}} search={new URLSearchParams(query)} />
      </SliceFixture>
    </ToastProvider>,
  ).replace(/<!-- -->/g, '');
};

describe('Onboard on the screen host', () => {
  it('the demo estate is claimed, its slice in stream order; the wizard is /start now', () => {
    expect(def('onboard')).toBeUndefined();
    expect(def('onboard/estate')).toMatchObject({ ready: true, slices: ['core'] });
    expect(Object.keys(loaders)).toEqual(['onboard/estate']);
    expect(def('onboard/estate')?.title({}, new URLSearchParams())).toBe('Afterlife · Onboard');
  });

  it('the estate unread: the funnel step names and batch sizes at once, every count a dash, never a zero', () => {
    const html = render('onboard/estate', {});
    expect(html).toContain('Discovered');
    expect(html).toContain('5 MRs');
    expect(html).toContain('—');
    expect(html).not.toMatch(/>0</);
    expect(html).not.toContain('Nothing here');
  });

  it('the estate read: the funnel counts and the batch', () => {
    setDataSource(demoSource);
    const data = loadOnboardData();
    const html = render('onboard/estate', { core: data });
    expect(html).toContain(`${data.org} · ${data.host}`);
    expect(html).toContain(`>${data.projects.length}<`);
  });
});
