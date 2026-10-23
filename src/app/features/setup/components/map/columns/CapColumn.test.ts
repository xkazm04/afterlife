import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { getActionClasses, getSetup, getTracks } from '@/lib/demo';
import type { DoctorRead } from '@/server/data/setup/types';
import { CAP_NOTE } from '../../../data/capabilities';
import { SetupProvider } from '../../../hooks/SetupProvider';
import { CapColumn } from './CapColumn';

vi.mock('next/navigation', () => ({ usePathname: () => '/setup', useRouter: () => ({ push: () => {} }) }));

const at = { at: '2026-10-07T09:30:00.000Z', label: '11:30' };
const events = { onPick: () => {}, onEnter: () => {}, onLeave: () => {} };
function column(doctor: Omit<DoctorRead, 'at' | 'label'> | null): string {
  const steps = Object.fromEntries(Array.from({ length: 15 }, (_, n) => [n, { state: 'unknown' as const, reason: 'not probed' }]));
  const live = doctor && {
    group: 'g', host: 'gitlab.com', project: 'p', projects: ['p'],
    tracks: Object.fromEntries(getSetup().arm.map(([id]) => [id, { state: 'undefined' as const, text: 'not defined' }])),
    tracksAt: at, doctor: { ...at, ...doctor }, steps: { ...at, steps },
  };
  const props = { setup: getSetup(), tracks: getTracks(), classes: getActionClasses(), ...(live ? { live, illustrative: { steps: true, tracks: true } } : {}) };
  return renderToString(createElement(ToastProvider, null, createElement(SetupProvider, props, createElement(CapColumn, { events }))));
}
/** The hidden tip each capability node is described by (aria-describedby). */
const tips = (html: string) => [...html.matchAll(/<span id="[^"]*" hidden="">([^<]*)<\/span>/g)].map((m) => m[1] ?? '');

describe('a capability node says why, as its page does', () => {
  it('live: the tip carries the probe row’s reason', () => {
    const html = column({ error: null, rows: [{ id: 'pipelines', label: 'pipelines and jobs', status: 'unknown', reason: 'answered 403 on /pipelines' }] });
    expect(tips(html)).toEqual(['pipelines and jobs · unknown · answered 403 on /pipelines']);
  });
  it('demo: the tip carries the catalogue’s note where it has one', () => {
    const t = tips(column(null));
    const [name, note] = Object.entries(CAP_NOTE)[0]!;
    expect(t.some((x) => x.startsWith(`${name} · `) && x.endsWith(` · ${note}`))).toBe(true);
  });
});
