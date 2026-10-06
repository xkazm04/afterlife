import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { getActionClasses, getSetup, getTracks } from '@/lib/demo';
import { SetupScreen } from './SetupScreen';

vi.mock('next/navigation', () => ({ usePathname: () => '/setup' }));
vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));

// Server render smoke test: the whole screen mounts with the demo data and every part of the map is on the page.
describe('SetupScreen (server render)', () => {
  const has = (s: string) => html.includes(s);
  const html = renderToString(createElement(ToastProvider, null, createElement(SetupScreen, { setup: getSetup(), tracks: getTracks(), classes: getActionClasses() })));

  it('draws all 15 steps, 8 tracks and 9 capabilities as buttons', () => {
    expect(html.match(/data-node="step:/g)).toHaveLength(15);
    expect(html.match(/data-node="track:/g)).toHaveLength(8);
    expect(html.match(/data-node="cap:/g)).toHaveLength(9);
  });
  it('shows the default inspector, the progress and the doctor lozenge', () => {
    expect(has('acme-lab / ledgerline')).toBe(true);
    expect(has('3 of 15 steps probed')).toBe(true);
    expect(has('Only you can do these')).toBe(true);
    expect(has('3/15 steps probed')).toBe(true);
    expect(has('1/8 armed')).toBe(true);
    expect(has('5 need you')).toBe(true);
    expect(has('Re-probe')).toBe(true);
  });
  it('is honest: unknown capabilities are listed, the demo data is labelled', () => {
    expect(has('never rounded up')).toBe(true);
    expect(has('illustrative demo data')).toBe(true);
  });
});
