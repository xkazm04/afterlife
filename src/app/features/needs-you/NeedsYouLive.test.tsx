// The live desk as the page draws it, for a given state of the desk (no DOM here, so the hook's state is hand-built):
// band, grouped table with the decided rows last, the inspector with the server's commands and diff, and the outbox with
// Run all. After a done confirm the refresh drops the acted proposal from the rows (only open ones are listed); the
// response's answer, with the MR it named, must stay on screen under "Sent this session".
import { createElement, createRef, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { navigate } from '@/components/table/model/rowNavigation';
import type { NeedsYouItem } from '@/lib/demo';
import type { ActionPreview } from '@/server/actions/types';
import type { DeskGroup, DeskItem, DeskOut } from './model/desk';
import { OUT_EMPTY } from './model/desk';

vi.mock('@/server/actions/actions', () => ({ previewAction: vi.fn(), confirmAction: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => '/needs-you' }));
vi.mock('next/image', () => ({ default: (p: { src: string }) => createElement('img', { src: p.src }) }));
vi.mock('next/link', () => ({
  default: (p: Record<string, unknown>) => {
    const { children, href, ...rest } = p;
    return createElement('a', { href, ...rest }, children as ReactNode);
  },
}));
const { LiveDesk } = await import('./components/live/desk/LiveDesk');
const { navOf } = await import('./hooks/useLiveDesk');
type Desk = import('./hooks/useLiveDesk').LiveDeskState;

const acted: NeedsYouItem = { id: 'promote:p:qa.file-bug', kind: 'promote', title: 'Promote T7 qa · qa.file-bug', from: 'supervised', to: 'hands_off', does: 'Opens a policy MR.' };
const other: NeedsYouItem = { id: 'readmit:p:patch-bump', kind: 'readmit', title: 'Re-admit T8 gardener · patch-bump', does: 'Re-admits.' };
const row = (n: NeedsYouItem, kind: 'promote' | 'readmit'): DeskItem => ({
  id: n.id, kind, project: 'p', title: n.title, openedAt: null, actedAt: null, actedAs: null, group: { kind, project: 'p', deadline: 'none' },
  intent: { kind: 'promote-class', project: 'p', class: n.title.split(' · ')[1]!, to: kind === 'readmit' ? 'assisted' : 'hands_off', proposal: n.id },
  readOnly: null, source: n, decided: null,
});
const decided: DeskItem = {
  id: 'd1', kind: 'decided', project: 'p', title: 'Promote code-fix.patch', openedAt: null, actedAt: '2026-10-22T08:00:00Z', actedAs: 'ops-kim',
  group: { kind: 'decided', project: 'p', deadline: 'none' }, intent: null, readOnly: null, source: null,
  decided: { id: 'd1', kind: 'promote', project: 'p', title: 'Promote code-fix.patch', actedAt: '2026-10-22T08:00:00Z', actedAs: 'ops-kim' },
};
const preview = {
  kind: 'promote-class', title: 'Re-admit', summary: 'Opens a policy MR as @you.', risk: 'policy', previewId: 'pv', mode: 'live',
  diff: ['+     patch-bump: { tier: assisted }'], commands: [{ display: 'glab mr create --title readmit-patch-bump', argv: [], risk: 'policy' }],
} satisfies ActionPreview;
const done = { status: 'done' as const, text: 'Done · qa.file-bug → Hands-off · !22' };

const desk = (rows: DeskItem[], o: Partial<Desk> = {}): Desk => {
  const groups: DeskGroup[] = [
    { id: 'k-promote', name: 'Extend trust', items: rows.filter((r) => r.kind === 'promote') },
    { id: 'k-readmit', name: 'Re-admit', items: rows.filter((r) => r.kind === 'readmit') },
    { id: 'decided', name: 'Decided this week', items: rows.filter((r) => r.kind === 'decided') },
  ].filter((g) => g.items.length);
  const noop = () => {};
  return {
    grouping: 'kind', setGrouping: noop, groups, shut: [], toggleGroup: noop, sel: null, select: noop, selected: null,
    out: OUT_EMPTY, toggleStage: noop, run: noop, runAll: async () => {}, retry: noop, views: {}, answers: {}, sent: {}, sending: [],
    outboxOpen: true, setOutboxOpen: noop, inspectorOpen: true, setInspectorOpen: noop, tableRef: createRef(), inspectorRef: createRef(),
    focusInspector: noop, onKeyDown: noop, ...o,
  } as Desk;
};
const draw = (rows: DeskItem[], d: Desk) => renderToStaticMarkup(
  <ToastProvider>
    <LiveDesk rows={rows} seeded={0} project="p" evidence={{}} runner={[]} now={new Date('2026-10-23T12:00:00Z')} desk={d} />
  </ToastProvider>,
);

describe('the live desk', () => {
  it('draws the band, the groups with the decided ones last, and the inspector with the preview\'s commands and diff', () => {
    const rows = [row(other, 'readmit'), decided];
    const out = draw(rows, desk(rows, { sel: other.id, selected: rows[0]!, views: { [other.id]: { kind: 'preview', preview } } }));
    expect(out).toContain('1 decision · 1 project');
    expect(out).not.toContain('oldest'); // no open row's start is known: the part is left out, never "0d"
    expect(out.indexOf('Re-admit<')).toBeLessThan(out.indexOf('Decided this week'));
    expect(out).toContain('glab mr create --title readmit-patch-bump');
    expect(out).toContain('patch-bump: { tier: assisted }');
    expect(out).toContain('Run · open the re-admit MR');
  });

  it('puts staged writes in the outbox with Run all, in staging order', () => {
    const rows = [row(acted, 'promote'), row(other, 'readmit')];
    const out: DeskOut = { order: [other.id, acted.id], result: { [other.id]: { state: 'staged', text: null }, [acted.id]: { state: 'staged', text: null } }, running: false };
    const html = draw(rows, desk(rows, { out }));
    expect(html).toContain('Run all · 2');
    expect(html.indexOf('Run Re-admit T8')).toBeLessThan(html.indexOf('Run Promote T7'));
  });

  it('names the response\'s MR under Sent this session after the refresh drops the acted item from the rows', () => {
    const rows = [row(other, 'readmit')];
    const html = draw(rows, desk(rows, { answers: { [acted.id]: done }, sent: { [acted.id]: acted } }));
    expect(html).toContain('Sent this session');
    expect(html).toContain('Promote T7 qa · qa.file-bug');
    expect(html).toContain('!22');
  });

  it('shows nothing under Sent this session on the failed path', () => {
    const rows = [row(acted, 'promote')];
    const html = draw(rows, desk(rows, { answers: { [acted.id]: { status: 'failed', text: 'Failed · x' } } }));
    expect(html).not.toContain('Sent this session');
    expect(html).toContain('Promote T7 qa · qa.file-bug');
  });

  it('reads a passed deadline as overdue, not as "due in overdue"', () => {
    const rows = [row({ ...other, dueIn: 'overdue' }, 'readmit')];
    const html = draw(rows, desk(rows));
    expect(html).not.toContain('due in overdue');
    expect(html).toContain('>overdue<');
  });
});

describe('the desk\'s keys', () => {
  it('arrows walk group rows then their rows, and skip a shut group\'s rows', () => {
    const rows = [row(acted, 'promote'), row(other, 'readmit')];
    const { groups } = desk(rows);
    const nav = navOf(groups, []);
    expect(navigate(nav, 'g:k-promote', 'ArrowDown')).toEqual({ type: 'select', id: acted.id });
    expect(navigate(nav, acted.id, 'ArrowDown')).toEqual({ type: 'select', id: 'g:k-readmit' });
    expect(navOf(groups, ['k-promote']).map((n) => n.id)).toEqual(['g:k-promote', 'g:k-readmit', other.id]);
  });
});
