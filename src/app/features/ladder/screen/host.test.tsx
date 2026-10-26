import { createElement, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { SliceFixture, type SliceState } from '@/components/shell/host';
import { demoSource, setDataSource } from '@/server/data';
import { loaders } from './slices';
import { screens } from './host';

vi.mock('next/navigation', () => ({ usePathname: () => '/ladder', useRouter: () => ({ push: () => undefined, replace: () => undefined, refresh: () => undefined }) }));
vi.mock('next/link', () => ({ default: (p: { href: string; children?: ReactNode }) => createElement('a', { href: p.href }, p.children) }));
vi.mock('@/server/actions/actions', () => ({ previewAction: vi.fn(() => new Promise(() => undefined)), confirmAction: vi.fn() }));
afterEach(() => setDataSource(null));

const text = (html: string) => html.replace(/<!-- -->/g, '');
const def = (key: string) => screens.find((d) => d.key === key);
const ctx = (params: Record<string, string> = {}) => ({ params, search: new URLSearchParams(), signal: new AbortController().signal });

/** A Frame in its session (Session is the host's: here it is mounted by hand), with pinned slices. */
function render(key: string, params: Record<string, string>, states: Record<string, SliceState<unknown>> = {}) {
  const d = def(key);
  const Frame = d?.Frame ?? (() => null);
  const Session = d?.Session ?? (({ children }: { children: ReactNode }) => <>{children}</>);
  return text(
    renderToString(
      <ToastProvider>
        <Session>
          <SliceFixture states={states}>
            <Frame params={params} search={new URLSearchParams()} />
          </SliceFixture>
        </Session>
      </ToastProvider>,
    ),
  );
}

describe('the Ladder on the screen host', () => {
  it('both screens are claimed, share one session, with their slices in stream order', () => {
    expect(def('ladder')).toMatchObject({ ready: true, slices: ['core', 'ledger'] });
    expect(def('ladder/[class]')).toMatchObject({ ready: true, slices: ['core', 'ledger', 'humanKey'] });
    expect(def('ladder')?.Session).toBe(def('ladder/[class]')?.Session);
    expect(def('ladder/[class]')?.title({ class: 'patch-bump' }, new URLSearchParams())).toBe('Belay Ladder patch-bump');
  });

  it('the slices: core without the moves, the moves on their own, the human key on the class page, notFound for an unknown class', async () => {
    setDataSource(demoSource);
    const core = (await loaders.ladder?.slices.core?.(ctx())) as { status: 'ok'; data: { seed: object } };
    expect(core.status).toBe('ok');
    expect(Object.keys(core.data.seed).sort()).toEqual(['classes', 'head', 'tz']);
    const ledger = (await loaders.ladder?.slices.ledger?.(ctx())) as { status: 'ok'; data: object };
    expect(Object.keys(ledger.data).sort()).toEqual(['ledger', 'quotes']);
    const page = loaders['ladder/[class]'];
    expect((await page?.slices.core?.(ctx({ class: 'patch-bump' })))?.status).toBe('ok');
    expect((await page?.slices.core?.(ctx({ class: 'no-such.class' })))?.status).toBe('notFound');
    expect((await page?.slices.humanKey?.(ctx({ class: 'patch-bump' })))?.status).toBe('ok');
  });

  it('unread list: the window, its toolbar and the table header at once, every count a dash, no "no classes" note', () => {
    const html = render('ladder', {});
    expect(html).toContain('<b>Ladder</b>');
    expect(html).toContain('Filter classes');
    expect(html).toContain('Last move');
    expect(html).toContain('—');
    expect(html).toContain('data-reveal="wait"');
    expect(html).not.toMatch(/No class|no class matches/i);
    expect(html).not.toMatch(/>0 classes/);
  });

  it('unread class page: its title (the URL\'s class) and its cards, each a dash', () => {
    const html = render('ladder/[class]', { class: 'patch-bump' });
    expect(html).toContain('patch-bump');
    expect(html).toContain('Promotion rule');
    expect(html).toContain('data-reveal="wait"');
    expect(html).not.toContain('Class not found');
  });

  it('the classes could not be read: the list says why', () => {
    const html = render('ladder', {}, { core: { state: 'error', reason: 'unreadable' } });
    expect(html).toContain('The classes could not be read: unreadable');
  });
});
