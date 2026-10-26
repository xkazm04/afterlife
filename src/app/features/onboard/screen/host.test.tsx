import { createElement, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { SliceFixture } from '@/components/shell/host';
import { demoSource, setDataSource } from '@/server/data';
import { loadOnboardData } from '../data/loadOnboardData';
import { reposNote } from '../wizard/model/repos';
import { screens } from './host';
import { loaders } from './slices';

vi.mock('next/navigation', () => ({ usePathname: () => '/onboard', useRouter: () => ({ push: () => undefined, replace: () => undefined, refresh: () => undefined }) }));
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
  it('both keys are claimed, their slices in stream order; the wizard answers only this machine', () => {
    expect(def('onboard')).toMatchObject({ ready: true, slices: ['repos'] });
    expect(def('onboard/estate')).toMatchObject({ ready: true, slices: ['core'] });
    expect(loaders.onboard?.local).toBe(true);
    expect(def('onboard')?.title({}, new URLSearchParams())).toBe('Belay Onboard');
  });

  it('the wizard unread: the window, the engine control and every step at once; the repo count a dash', () => {
    const html = render('onboard', {});
    expect(html).toContain('<b>Onboard</b>');
    expect(html).toContain('Engine');
    expect(html).toContain('Your repos');
    expect(html).toContain('repos not read yet');
    expect(html).not.toContain('No Claude Code history here');
    expect(html).toContain('data-reveal="wait"');
  });

  it('the wizard read: the rows; refused: the "your own machine" note', () => {
    const row = { root: 'C:/x/afterlife', name: 'afterlife', lastUsed: '2026-10-24T09:00:00.000Z', hostKind: 'none' };
    expect(render('onboard', { repos: { repos: [row] } })).toContain('C:/x/afterlife');
    expect(render('onboard', {}, { repos: { state: 'error', reason: 'not-local' } })).toContain(reposNote.notLocal);
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
