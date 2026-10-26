import { createElement, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SliceFixture } from '@/components/shell/host';
import { LIVE } from '../model/fixtures/input';
import { screens } from './host';
import { loaders } from './slices';

vi.mock('next/navigation', () => ({ usePathname: () => '/start', useRouter: () => ({ push: () => undefined, replace: () => undefined, refresh: () => undefined }) }));
vi.mock('next/link', () => ({ default: (p: { href: string; children?: ReactNode }) => createElement('a', { href: p.href }, p.children) }));
vi.mock('@/server/actions/actions', () => ({ previewAction: vi.fn(), confirmAction: vi.fn() }));

const def = screens.find((d) => d.key === 'start');
const render = (slices: Record<string, unknown>, states: Parameters<typeof SliceFixture>[0]['states'] = {}, query = '') => {
  const Frame = def?.Frame ?? (() => null);
  return renderToString(
    <SliceFixture slices={slices} states={states}>
      <Frame params={{}} search={new URLSearchParams(query)} />
    </SliceFixture>,
  ).replace(/<!-- -->/g, '');
};

describe('/start on the screen host', () => {
  it('is claimed, its slices in stream order; only "Your repos" is loopback only', () => {
    expect(def).toMatchObject({ ready: true, slices: ['facts', 'repos'] });
    expect(Object.keys(loaders.start?.slices ?? {})).toEqual(['facts', 'repos']);
    expect(loaders.start?.local).toEqual(['repos']);
    expect(def?.title({}, new URLSearchParams())).toBe('Afterlife · Set up');
  });

  it('unread: the window, its title and Re-check at once; the steps a dash, nothing probed yet', () => {
    const html = render({});
    expect(html).toContain('Set up my first project');
    expect(html).toContain('Re-check');
    expect(html).toContain('steps not read yet');
    expect(html).not.toContain('No Claude Code history');
  });

  it('facts read, repos not: the wizard, with "Your repos" a dash and never an empty history', () => {
    const html = render({ facts: LIVE });
    expect(html).toContain('Set up my first project');
    expect(html).toContain('data-reveal');
    expect(html).not.toContain('steps not read yet');
  });

  it('facts that stand in for the app (live, not ready) draw nothing: the layout gate covers the column', () => {
    expect(render({ facts: { ...LIVE, gate: 'not-ready', projects: null } })).toBe('');
    expect(render({ facts: { ...LIVE, gate: 'not-ready', rehearsal: true } })).toContain('rehearsal');
  });

  it('a facts error says why, in the window', () => {
    expect(render({}, { facts: { state: 'error', reason: 'unreadable' } })).toContain('The setup facts could not be read: unreadable.');
  });
});
