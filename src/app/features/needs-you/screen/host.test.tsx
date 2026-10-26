import { createElement, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { SliceFixture, type SliceState } from '@/components/shell/host';
import { DEMO_SHELL, ShellProvider } from '@/components/shell/ShellContext';
import { unserialisable } from '@/app/features/screens/stream';
import { demoSource, setDataSource } from '@/server/data';
import { pickNeedsYouDemo } from '../data/pick';
import { NeedsStore } from '../hooks/NeedsStore';
import { NeedsYouScreen } from '../NeedsYouScreen';
import { loaders } from './slices';
import { screens } from './host';

vi.mock('next/navigation', () => ({ usePathname: () => '/needs-you', useRouter: () => ({ push: () => undefined, replace: () => undefined, refresh: () => undefined }) }));
vi.mock('next/link', () => ({ default: (p: { href: string; children?: ReactNode }) => createElement('a', { href: p.href }, p.children) }));
vi.mock('@/server/actions/actions', () => ({ previewAction: vi.fn(() => new Promise(() => undefined)), confirmAction: vi.fn() }));
vi.mock('@/server/runs/readDesk', () => ({ readDesk: async () => ({ needs: [] }) }));
afterEach(() => setDataSource(null));

const text = (html: string) => html.replace(/<!-- -->/g, '');
const def = (key: string) => screens.find((d) => d.key === key);
const ctx = (params: Record<string, string> = {}) => ({ params, search: new URLSearchParams(), signal: new AbortController().signal });
const LIVE_SHELL = { ...DEMO_SHELL, data: { ...DEMO_SHELL.data, mode: 'live' as const } };

function render(key: string, params: Record<string, string>, slices: Record<string, unknown>, opts: { states?: Record<string, SliceState<unknown>>; shell?: typeof DEMO_SHELL } = {}) {
  const Frame = def(key)?.Frame ?? (() => null);
  return text(
    renderToString(
      <ToastProvider>
        <ShellProvider value={opts.shell ?? DEMO_SHELL}>
          <NeedsStore>
            <SliceFixture slices={slices} states={opts.states}>
              <Frame params={params} search={new URLSearchParams()} />
            </SliceFixture>
          </NeedsStore>
        </ShellProvider>
      </ToastProvider>,
    ),
  );
}

describe('Needs you on the screen host', () => {
  it('both screens are claimed, share one desk store, with their slices in stream order', () => {
    expect(def('needs-you')).toMatchObject({ ready: true, slices: ['view', 'desk'] });
    expect(def('needs-you/[item]')).toMatchObject({ ready: true, slices: ['view'] });
    expect(def('needs-you')?.Session).toBe(def('needs-you/[item]')?.Session);
    expect(def('needs-you/[item]')?.title({ item: 'n1' }, new URLSearchParams())).toBe('Belay Needs you n1');
  });

  it('the slices are plain JSON; a decision the desk does not hold is notFound', async () => {
    setDataSource(demoSource);
    const list = loaders['needs-you'];
    for (const name of ['view', 'desk']) {
      const r = await list?.slices[name]?.(ctx());
      expect(r?.status).toBe('ok');
      expect(unserialisable((r as { data: unknown }).data)).toBeNull();
    }
    const item = loaders['needs-you/[item]'];
    expect((await item?.slices.view?.(ctx({ item: 'n1' })))?.status).toBe('ok');
    expect((await item?.slices.view?.(ctx({ item: 'nope' })))?.status).toBe('notFound');
  });

  it('unread, demo shell: the desk\'s window at once, the runner\'s slot held, no amber clock and no zero count', () => {
    const html = render('needs-you', {}, {});
    expect(html).toContain('<b>Needs you</b>');
    expect(html).toContain('Search decisions');
    expect(html).toContain('From the cycle runner');
    expect(html).toContain('CRA early warning');
    expect(html).not.toContain('role="timer"');
    expect(html).toContain('data-reveal="wait"');
    expect(html).not.toMatch(/>0 decisions/);
  });

  it('unread, live shell: the live desk\'s window, the table a dash, never "No decisions"', () => {
    const html = render('needs-you', {}, {}, { shell: LIVE_SHELL });
    expect(html).toContain('By kind');
    expect(html).toContain('Reading your group');
    expect(html).not.toContain('No decisions');
  });

  it('live, nothing from the group: the empty state in the live desk\'s window', () => {
    const html = render('needs-you', {}, { view: { kind: 'empty', seeded: 5 }, desk: { runner: [] } }, { shell: LIVE_SHELL });
    expect(html).toContain('<b>Needs you</b>');
    expect(html).toContain('Belay is reading your GitLab group');
    expect(html).toContain('5 demo items seeded into this index, not shown');
  });

  it('the desk read (the store holds it): the CRA clock and the decisions', () => {
    setDataSource(demoSource);
    const demo = pickNeedsYouDemo();
    const html = text(
      renderToString(
        <ToastProvider>
          <NeedsStore demo={demo}>
            <NeedsYouScreen demo={demo} runner={[]} />
          </NeedsStore>
        </ToastProvider>,
      ),
    );
    expect(html).toContain('role="timer"');
    expect(html).toContain(demo.promote.title);
  });

  it('a re-read of the last visit: each region says when its rows are from, and cannot be acted on', () => {
    setDataSource(demoSource);
    const demo = pickNeedsYouDemo();
    const html = text(
      renderToString(
        <ToastProvider>
          <NeedsStore demo={demo}>
            <NeedsYouScreen demo={demo} runner={[]} stale="2026-10-26T08:49:52.553Z" />
          </NeedsStore>
        </ToastProvider>,
      ),
    );
    expect(html.match(/as of \d\d:\d\d:\d\d · re-reading/g)?.length).toBe(3);
    expect(html).toContain('inert=""');
  });

  it('a decision\'s page before the read: the URL\'s id as its title, its cards a dash', () => {
    const html = render('needs-you/[item]', { item: 'n1' }, {});
    expect(html).toContain('n1');
    expect(html).toContain('data-reveal="wait"');
    expect(html).toContain('—');
  });
});
