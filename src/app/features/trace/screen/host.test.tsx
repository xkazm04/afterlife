import { createElement, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { SliceFixture } from '@/components/shell/host';
import { DEMO_SHELL, type ShellData } from '@/components/shell/ShellContext';
import { gateOf } from '../components/useGateFacts';
import type { TraceFacts } from '../model/types';
import { screens } from './host';

vi.mock('next/navigation', () => ({ usePathname: () => '/trace', useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }));
vi.mock('next/link', () => ({ default: (p: { href: string; children?: ReactNode }) => createElement('a', { href: p.href }, p.children) }));

const def = screens.find((d) => d.key === 'trace');
const render = (slices: Record<string, unknown>, search = '') => {
  const Frame = def?.Frame ?? (() => null);
  return renderToString(
    <ToastProvider>
      <SliceFixture slices={slices}>
        <Frame params={{}} search={new URLSearchParams(search)} />
      </SliceFixture>
    </ToastProvider>,
  ).replace(/<!-- -->/g, '');
};
const facts = (over: Partial<TraceFacts> = {}): TraceFacts => ({
  mode: 'demo',
  fake: false,
  groupId: '42',
  groupSet: true,
  host: 'gitlab.com',
  gate: null,
  rehearsal: false,
  reason: null,
  projects: null,
  ...over,
});

describe('Trace on the screen host', () => {
  it('is claimed, with its one slice', () => {
    expect(def).toMatchObject({ ready: true, slices: ['facts'] });
    expect(def?.title({}, new URLSearchParams())).toBe('Belay Trace');
  });

  it('unread: the window, Re-check and the six-node wire at once; a dash for the subtitle, the source and the command', () => {
    const html = render({});
    expect(html).toContain('<b>Trace</b>');
    expect(html).toContain('Re-check all');
    expect(html).toContain('which GitLab: not read yet');
    expect(html).toContain('host and group not read yet');
    expect(html).toContain('data-reveal="wait"');
    expect(html).not.toContain('group 42');
  });

  it('facts read: the subtitle, the source chip and the command fill in', () => {
    const html = render({ facts: facts() });
    expect(html).toContain('group 42 on gitlab.com');
    expect(html).toContain('real probes of this machine');
    expect(html).toContain('data-reveal="in"');
  });

  it('the live gate in the facts: the gate copy instead of the intro', () => {
    expect(render({ facts: facts({ mode: 'live', gate: 'empty', projects: 0 }) })).toContain('Afterlife is watching a group with no project');
  });
});

describe('the live gate (LiveGate), from the shell and the facts', () => {
  const live = (group: string): ShellData => ({ mode: 'live', fakeGitlab: false, group, illustrative: false, poll: null });
  it('demo is never gated, and reads nothing', () => {
    expect(gateOf(DEMO_SHELL.data, undefined)).toEqual({ cover: false });
    expect(gateOf(null, undefined)).toEqual({ cover: false });
  });
  it('the shell says live before the first poll: covered at once, before the facts', () => {
    expect(gateOf(live('first poll not finished'), undefined)).toEqual({ cover: true });
  });
  it('the facts decide once read: an empty group covers, a group with projects does not', () => {
    expect(gateOf(live('acme'), undefined).cover).toBe(false);
    expect(gateOf(live('acme'), facts({ mode: 'live', gate: 'empty' })).cover).toBe(true);
    expect(gateOf(live('acme'), facts({ mode: 'live', projects: 3 })).cover).toBe(false);
  });
});
