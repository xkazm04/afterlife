import { createElement, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { SliceFixture, type SliceState } from '@/components/shell/host';
import { getActionClasses, getSetup, getTracks } from '@/lib/demo';
import { SetupProvider, SetupSession } from '../hooks/SetupProvider';
import { screens } from './host';

vi.mock('next/navigation', () => ({ usePathname: () => '/setup', useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }));
vi.mock('next/link', () => ({ default: (p: { href: string; children?: ReactNode }) => createElement('a', { href: p.href }, p.children) }));

const map = screens.find((d) => d.key === 'setup');
const node = screens.find((d) => d.key === 'setup/[node]');
const demo = { setup: getSetup(), tracks: getTracks(), classes: getActionClasses() };
const text = (html: string) => html.replace(/<!-- -->/g, '');

/** A Frame in the empty Session (nothing fed yet: renderToString runs no effect), or in a seeded one (the catalogue read). */
function render(def: typeof map, params: Record<string, string>, opts: { seeded?: boolean; slices?: Record<string, unknown>; states?: Record<string, SliceState<unknown>> } = {}) {
  const Frame = def?.Frame ?? (() => null);
  const body = (
    <SliceFixture slices={opts.slices ?? {}} states={opts.states ?? {}}>
      <Frame params={params} search={new URLSearchParams()} />
    </SliceFixture>
  );
  const session = opts.seeded ? createElement(SetupProvider, demo, body) : createElement(SetupSession, null, body);
  return text(renderToString(createElement(ToastProvider, null, session)));
}

describe('Setup on the screen host', () => {
  it('claims both keys with one Session, the four slices in stream order', () => {
    for (const d of [map, node]) expect(d).toMatchObject({ ready: true, slices: ['catalogue', 'tracks', 'doctor', 'steps'] });
    expect(map?.Session).toBe(node?.Session);
    expect(node?.title({ node: 'step-6' }, new URLSearchParams())).toBe('Belay Setup step-6');
    expect(node?.NotFound).toBeDefined();
  });

  it('unread: the map window at once, its column heads and dashes, no zero, no amber count, no skeleton', () => {
    const html = render(map, {});
    expect(html).toContain('<b>Setup</b>');
    expect(html).toContain('Re-probe');
    expect(html).toContain('Where you stand');
    expect([...html.matchAll(/<b>(Path|Tracks|GitLab)<\/b>/g)].map((m) => m[1])).toEqual(['Path', 'Tracks', 'GitLab']);
    expect(html).toContain('—');
    expect(html).toContain('data-reveal="wait"');
    expect(html).not.toMatch(/<b>0<\/b>|>0 need/);
    expect(html).not.toContain('data-node=');
    expect(html).not.toMatch(/skeleton|Loading…/i);
  });

  it('the catalogue could not be read: the map says why', () => {
    const html = render(map, {}, { states: { catalogue: { state: 'error', reason: 'unreadable' } } });
    expect(html).toContain('Setup could not be read: unreadable');
  });

  it('read: the whole map, its counts, its regions entering', () => {
    const html = render(map, {}, { seeded: true, slices: { catalogue: {} } });
    expect(html.match(/data-node="step:/g)).toHaveLength(15);
    expect(html).toContain('4/15 steps read done');
    expect(html).toContain('data-reveal="in"');
  });

  it('a node page: its heading at once with a dash, then its cards; an unknown node is the not-found card', () => {
    expect(render(node, { node: 'step-6' })).toContain('aria-label="node not read yet"');
    const read = render(node, { node: 'step-6' }, { seeded: true, slices: { catalogue: {} } });
    expect(read).toContain('Runner and billing');
    expect(read).toMatch(/runner/i);
    expect(render(node, { node: 'step-99' }, { seeded: true, slices: { catalogue: {} } })).toContain('Setup node not found');
  });
});
