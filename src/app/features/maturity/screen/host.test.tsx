import { createElement, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SliceFixture } from '@/components/shell/host';
import type { SliceState } from '@/components/shell/host';
import { demoSource, setDataSource } from '@/server/data';
import type { MaturityInput } from '../hooks/useMaturity';
import { MaturityProvider } from '../MaturityProvider';
import { loaders } from './slices';
import { screens } from './host';

vi.mock('@/components/overlays/toast/useToast', () => ({ useToast: () => ({ toast: () => {}, status: () => {}, statusMessage: '' }), useStatusMessage: () => '' }));
vi.mock('@/server/actions/actions', () => ({ previewAction: vi.fn(), confirmAction: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => '/maturity', useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }) }));
vi.mock('next/link', () => ({ default: (p: { href: string; children?: ReactNode }) => createElement('a', { href: p.href }, p.children) }));
afterEach(() => setDataSource(null));

const text = (html: string) => html.replace(/<!-- -->/g, '');
const def = (key: string) => screens.find((d) => d.key === key);
const ctx = (params: Record<string, string> = {}) => ({ params, search: new URLSearchParams(), signal: new AbortController().signal });

async function coreOf(key: 'maturity' | 'maturity/[stage]', params: Record<string, string> = {}) {
  setDataSource(demoSource);
  const r = await loaders[key]?.slices.core?.(ctx(params));
  return r;
}

/** A Frame in its session: `initial` is the session after the core slice landed (the Frame's layout effect hands it over). */
function render(key: string, params: Record<string, string>, slices: Record<string, unknown>, initial: MaturityInput | null = null, states: Record<string, SliceState<unknown>> = {}) {
  const Frame = def(key)?.Frame ?? (() => null);
  return renderToString(
    <MaturityProvider initial={initial}>
      <SliceFixture slices={slices} states={states}>
        <Frame params={params} search={new URLSearchParams()} />
      </SliceFixture>
    </MaturityProvider>,
  );
}

describe('Maturity on the screen host', () => {
  it('both screens are claimed, share one session, with their slices in stream order', () => {
    expect(def('maturity')).toMatchObject({ ready: true, slices: ['core'] });
    expect(def('maturity/[stage]')).toMatchObject({ ready: true, slices: ['core'] });
    expect(def('maturity')?.Session).toBe(def('maturity/[stage]')?.Session);
    expect(def('maturity/[stage]')?.title({ stage: 'secure' }, new URLSearchParams())).toBe('Afterlife · Maturity · secure');
  });

  it('the core slice carries the dataset, the project and the mode; an unknown stage is notFound', async () => {
    const r = await coreOf('maturity');
    expect(r?.status).toBe('ok');
    expect(Object.keys((r as { data: object }).data).sort()).toEqual(['maturity', 'mode', 'project', 'stages']);
    expect((await coreOf('maturity/[stage]', { stage: 'secure' }))?.status).toBe('ok');
    expect((await coreOf('maturity/[stage]', { stage: 'nope' }))?.status).toBe('notFound');
  });

  it('unread: the crag window, its modes and stepper and the nine stage names at once, every value a dash, no zero', () => {
    const html = text(render('maturity', {}, {}));
    expect(html).toContain('<b>Maturity</b>');
    expect(html).toContain('Day 0');
    expect(html).toContain('After merge');
    expect(html).toContain('Secure');
    expect(html).toContain('—');
    expect(html).toContain('data-reveal="wait"');
    expect(html).not.toContain('No gaps proposed yet');
    expect(html).not.toMatch(/>0 deep/);
  });

  it('read: the routes, the gaps and the counts', async () => {
    const r = (await coreOf('maturity')) as { data: MaturityInput };
    const html = text(render('maturity', {}, { core: r.data }, r.data));
    expect(html).toContain('data-reveal="in"');
    expect(html).toContain(r.data.maturity.proposals[0]?.title ?? '?');
    expect(html).toMatch(/9 stages · \d+ deep/);
  });

  it('a stage page: its title at once, its cards a dash until read, then the evidence', async () => {
    const r = (await coreOf('maturity/[stage]', { stage: 'secure' })) as { data: MaturityInput };
    const unread = text(render('maturity/[stage]', { stage: 'secure' }, {}));
    expect(unread).toContain('Secure');
    expect(unread).toContain('<h1');
    expect(unread).toContain('data-reveal="wait"');
    const read = text(render('maturity/[stage]', { stage: 'secure' }, { core: r.data }, r.data));
    expect(read).toContain('Evidence');
    expect(read).toContain('data-reveal="in"');
  });

  it('an unknown stage is not found at once (the nine stages are static)', () => {
    expect(text(render('maturity/[stage]', { stage: 'nope' }, {}))).toContain('Stage not found');
  });

  it('the read failed: the pane says why', () => {
    const html = text(render('maturity', {}, {}, null, { core: { state: 'error', reason: 'unreadable' } }));
    expect(html).toContain('Maturity could not be read: unreadable');
  });
});
