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

// Live mode: the same screen from what the server read. No demo state, no demo group, the catalogue parts marked demo.
describe('SetupScreen in live mode (server render)', () => {
  const at = { at: '2026-10-07T09:30:00.000Z', label: '11:30' };
  const steps: Record<number, { state: 'unknown'; reason: string } | { state: 'done'; text: string }> = {};
  for (let n = 0; n <= 14; n++) steps[n] = { state: 'unknown', reason: 'not probed' };
  steps[0] = { state: 'done', text: 'glab api user → 200 · signed in as @kazdanm' };
  const live = {
    group: 'kazdanm', host: 'gitlab.com', project: 'afterlife', projects: ['afterlife', 'belay-pack', 'belay-policy', 'belay-ledger', 'belay-engine'],
    tracks: Object.fromEntries(getSetup().arm.map(([id]) => [id, id === 'T4' ? { state: 'absent' as const, text: 'no T4 arm block' } : { state: 'undefined' as const, text: 'not defined' }])),
    tracksAt: at,
    doctor: { ...at, error: null, rows: [{ id: 'pipelines', label: 'pipelines and jobs', status: 'available' as const, reason: 'answered 200' }] },
    steps: { ...at, steps },
  };
  const html = renderToString(
    createElement(ToastProvider, null, createElement(SetupScreen, { setup: getSetup(), tracks: getTracks(), classes: getActionClasses(), live, illustrative: { steps: true, tracks: true } })),
  );

  it('opens on the paired group with T4 ready to arm, the probe’s rows, and no demo group or demo state', () => {
    expect(html).toContain('kazdanm / afterlife');
    expect(html).toContain('1/15 steps probed');
    expect(html).toContain('0/8 armed');
    expect(html.match(/data-node="cap:/g)).toHaveLength(1);
    expect(html).toContain('not defined');
    expect(html).not.toMatch(/acme-lab|acme-sandbox|14:02/);
  });
  it('a human step nobody could read is still yours: it counts, the map marks it, and it reads unread, never done', () => {
    expect(html).toContain('5 need you');
    expect(html).not.toContain('Nothing waits for you');
    expect(html.match(/>you<\/span>/g)).toHaveLength(5); // the map's step nodes
    expect(html.match(/unread · frees/g)).toHaveLength(5);
  });
  it('marks what is still the demo catalogue’s, per part', () => {
    expect(html.match(/>demo</g)).toHaveLength(2);
  });
});
