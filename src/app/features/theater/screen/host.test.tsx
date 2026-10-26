import { createElement, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { SliceFixture } from '@/components/shell/host';
import { TAKES } from '../data/constants';
import { REPLAY_LEDGER } from '../data/ledger';
import { HOLDS } from '../model/film/holds';
import { screens } from './host';

vi.mock('next/navigation', () => ({ usePathname: () => '/theater', useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }));
vi.mock('next/link', () => ({ default: (p: { href: string; children?: ReactNode }) => createElement('a', { href: p.href }, p.children) }));

const def = screens.find((d) => d.key === 'theater');
const render = (search: string, slices: Record<string, unknown>, states = {}) => {
  const Frame = def?.Frame ?? (() => null);
  return renderToString(
    <ToastProvider>
      <SliceFixture slices={slices} states={states}>
        <Frame params={{}} search={new URLSearchParams(search)} />
      </SliceFixture>
    </ToastProvider>,
  ).replace(/<!-- -->/g, '');
};
const empty = { repos: [], totals: { waves: 0, lanes: 0, counts: {} }, skippedLines: 0, meta: {}, generatedAt: 0 };
const film = { film: { source: 'illustrative', entries: REPLAY_LEDGER, takes: TAKES, holds: HOLDS }, demo: null, subtitle: 'acme / ledgerline' };

describe('the Theater on the screen host', () => {
  it('is claimed, with its slices in stream order', () => {
    expect(def).toMatchObject({ ready: true, slices: ['live', 'start', 'film'] });
    expect(def?.title({}, new URLSearchParams())).toBe('Belay Theater');
  });

  it('unread: the real window at once, a dash for the subtitle and the stage, no bars, no "New run…" yet', () => {
    const html = render('', {});
    expect(html).toContain('<b>Theater</b>');
    expect(html).toContain('—');
    expect(html).toMatch(/aria-busy="true"/);
    expect(html).not.toContain('New run');
    expect(html).not.toContain('Loading');
  });

  it('the panel read: "New run…" joins the toolbar before the film', () => {
    expect(render('', { start: { repos: [], branches: {} } })).toContain('New run');
  });

  it('off this machine the panel says why it cannot start a run, instead of hiding', () => {
    const html = render('', {}, { start: { state: 'error', reason: 'not-local' } });
    expect(html).toContain('New run');
  });

  it('no wave running and the replay film read: the film plays, its stage in its reveal region', () => {
    const html = render('', { live: empty, film: { film } });
    expect(html).toContain('acme / ledgerline');
    expect(html).toContain('data-reveal="in"');
  });

  it('?live=1 with the payload read: the live film, polled; no replay film is needed', () => {
    const html = render('live=1', { live: empty });
    expect(html).toContain('Live from .belay/runs');
  });

  it('the film could not be read: says why in the stage', () => {
    const html = render('', { live: empty }, { film: { state: 'error', reason: 'unreadable' } });
    expect(html).toContain('The film could not be read: unreadable.');
  });
});
