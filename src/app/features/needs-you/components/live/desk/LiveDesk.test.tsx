// The live desk's parts over hand-built DeskItem rows: the band never says "0d", the table draws amber only on rows that
// wait for a person, the inspector shows the server's commands and diff (or where to act, or who decided and when), and an
// outbox card is the staged row's preview. No DOM here: each part is rendered to markup.
import { createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ActionPreview } from '@/server/actions/types';
import type { DeskGroup, DeskItem, DeskOut } from '../../../model/desk';
import { OUT_EMPTY } from '../../../model/desk';

vi.mock('@/server/actions/actions', () => ({ previewAction: vi.fn(), confirmAction: vi.fn() }));
const { bandLine } = await import('./LiveBand');
const { LiveTable, moveOf, rowGlyph } = await import('./LiveTable');
const { LiveInspector } = await import('./LiveInspector');
const { outItemOf } = await import('./LiveOutbox');

const now = new Date('2026-10-23T12:00:00Z');
const base = { actedAt: null, actedAs: null, readOnly: null, decided: null, openedAt: null };
const promote: DeskItem = {
  ...base, id: 'promote:ledgerline:dep-bump', kind: 'promote', project: 'ledgerline', title: 'Promote T8 gardener · dep-bump', openedAt: '2026-10-21T09:00:00Z',
  group: { kind: 'promote', project: 'ledgerline', deadline: 'none' },
  intent: { kind: 'promote-class', project: 'ledgerline', class: 'dep-bump', to: 'hands_off', proposal: 'promote:ledgerline:dep-bump' },
  source: { id: 'promote:ledgerline:dep-bump', kind: 'promote', title: 'Promote T8 gardener · dep-bump', from: 'supervised', to: 'hands_off', does: 'Opens a policy MR.' },
};
const gap: DeskItem = {
  ...base, id: 'gap:ledgerline:secure', kind: 'gap', project: 'ledgerline', title: 'Secure: add the SAST include',
  group: { kind: 'gap', project: 'ledgerline', deadline: 'none' }, intent: null, readOnly: 'Read-only here: write a threat model.',
  source: { id: 'gap:ledgerline:secure', kind: 'gaps', title: 'Secure: add the SAST include', does: 'Raises Secure.', stage: 'secure', rungFrom: null, rungTo: 3 },
};
const decided: DeskItem = {
  ...base, id: 'promote:ledgerline:patch-bump', kind: 'decided', project: 'ledgerline', title: 'Promote patch-bump', actedAt: '2026-10-22T08:15:00Z', actedAs: 'ops-kim',
  group: { kind: 'decided', project: 'ledgerline', deadline: 'none' }, intent: null, source: null,
  decided: { id: 'promote:ledgerline:patch-bump', kind: 'promote', project: 'ledgerline', title: 'Promote patch-bump', actedAt: '2026-10-22T08:15:00Z', actedAs: 'ops-kim' },
};
const groups: DeskGroup[] = [
  { id: 'k-promote', name: 'Extend trust', items: [promote] },
  { id: 'k-gap', name: 'Maturity gaps', items: [gap] },
  { id: 'decided', name: 'Decided this week', items: [decided] },
];
const preview = {
  kind: 'promote-class', title: 'Promote dep-bump', summary: 'Opens a policy MR in acme-lab/belay-policy as @you.', risk: 'policy', previewId: 'pv1', mode: 'live',
  diff: ['-     dep-bump: { tier: supervised }', '+     dep-bump: { tier: hands_off }'],
  commands: [{ display: 'glab mr create --title promote-dep-bump', argv: [], risk: 'policy' }],
} satisfies ActionPreview;

const table = (out: DeskOut = OUT_EMPTY, sent: string[] = []) => renderToStaticMarkup(
  <LiveTable groups={groups} shut={[]} sel={null} out={out} sent={sent} now={now} tableRef={createRef()} onKeyDown={() => {}}
    onSelect={() => {}} onToggleGroup={() => {}} onActivate={() => {}} onStage={() => {}} />,
);
const inspect = (item: DeskItem, view?: { kind: 'preview'; preview: ActionPreview }) => renderToStaticMarkup(
  <LiveInspector item={item} group={null} view={view} answer={undefined} evidence={undefined} sending={false} staged={false} running={false} now={now}
    inspectorRef={createRef()} onRun={() => {}} onRetry={() => {}} onStage={() => {}} />,
);
const AMBER = /var\(--needs-you\)/g;

describe('the band', () => {
  it('counts decisions and projects and names the oldest start, and leaves an unknown oldest out rather than saying 0d', () => {
    expect(bandLine({ count: 3, projects: 2, oldestOpenedAt: '2026-10-21T09:00:00Z' }, now)).toBe('3 decisions · 2 projects · oldest 2d');
    expect(bandLine({ count: 1, projects: 1, oldestOpenedAt: null }, now)).toBe('1 decision · 1 project');
  });
});

describe('the table', () => {
  it('draws the groups with their counts in order, decided last, and each row\'s project, move and age', () => {
    const out = table();
    const at = (s: string) => out.indexOf(s);
    expect(at('Extend trust')).toBeLessThan(at('Maturity gaps'));
    expect(at('Maturity gaps')).toBeLessThan(at('Decided this week'));
    expect(out).toContain('ledgerline');
    expect(out).toContain('>2d<');
    expect(out).toContain('R? → R3');
    expect(moveOf(promote)).toEqual({ kind: 'tiers', from: 'supervised', to: 'hands_off' });
  });

  it('is amber only on rows that wait for a person: not on a decided one, a staged one or one sent', () => {
    // the two waiting rows' glyphs; the decided row's is not amber
    expect(table().match(AMBER)?.length).toBe(2);
    const staged0: DeskOut = { order: [promote.id], result: { [promote.id]: { state: 'staged', text: null } }, running: false };
    expect(table(staged0).match(AMBER)?.length).toBe(1);
    expect(rowGlyph(decided, OUT_EMPTY, []).kind).toBe('ok');
    const staged: DeskOut = { order: [promote.id], result: { [promote.id]: { state: 'staged', text: null } }, running: false };
    expect(rowGlyph(promote, staged, []).kind).toBe('stg');
    expect(rowGlyph(promote, OUT_EMPTY, [promote.id]).kind).toBe('ok');
    expect(rowGlyph(gap, OUT_EMPTY, []).kind).toBe('wait');
  });

  it('offers Stage only on a row with a write, and Unstage once staged', () => {
    expect(table()).toContain(`aria-label="Stage: ${promote.title}"`);
    expect(table()).not.toContain(`Stage: ${gap.title}`);
    const staged: DeskOut = { order: [promote.id], result: { [promote.id]: { state: 'staged', text: null } }, running: false };
    expect(table(staged)).toContain(`aria-label="Unstage: ${promote.title}"`);
  });
});

describe('the inspector', () => {
  it('shows what the click writes: the preview\'s commands and diff, Stage and Run', () => {
    const out = inspect(promote, { kind: 'preview', preview });
    expect(out).toContain('The click');
    expect(out).toContain('glab mr create --title promote-dep-bump');
    expect(out).toContain('dep-bump: { tier: hands_off }');
    expect(out).toContain('>Stage<');
    expect(out).toContain('Run · open the promotion MR');
  });

  it('a read-only row says where to act and offers no Run; a decided one says who and when, in UTC', () => {
    const ro = inspect(gap);
    expect(ro).toContain('Read-only here: write a threat model.');
    expect(ro).not.toContain('Run ·');
    const d = inspect(decided);
    expect(d).toContain('ops-kim');
    expect(d).toContain('2026-10-22 08:15 UTC');
  });
});

describe('an outbox card', () => {
  it('is the staged row\'s preview, and says the server\'s words once it answered', () => {
    const staged: DeskOut = { order: [promote.id], result: { [promote.id]: { state: 'refused', text: 'Refused · dep-bump → Hands-off · no. Nothing ran.' } }, running: false };
    const card = outItemOf(promote, { kind: 'preview', preview }, staged);
    expect(card.commands).toEqual(['glab mr create --title promote-dep-bump']);
    expect(card.ref).toBe('refused');
    expect(card.note).toContain('Nothing ran');
    expect(outItemOf(promote, undefined, OUT_EMPTY).commands).toEqual([]);
  });
});
