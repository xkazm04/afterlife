// The Send sheet: opening it previews each picked gap (previewAction, nothing runs); the button confirms each preview on
// screen by its own id; each answer says only what the response says. The server actions are mocked: this is the screen's side.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO } from '@/lib/demo';
import type { ActionPreview, ActionResponse } from '@/server/actions/types';
import { SendSheet } from '../components/sheet/SendSheet';
import { gapSend } from './gap';
import type { SheetRow } from './sheet';

const actions = vi.hoisted(() => ({ previewAction: vi.fn(), confirmAction: vi.fn() }));
vi.mock('@/server/actions/actions', () => actions);
const { ask, readyRows, sendReady, toAsk } = await import('./sheet');

const preview = (id: string): ActionPreview => ({
  kind: 'stage-gap-mr', title: `Open the draft MR for gap ${id}`, summary: 's', risk: 'low', previewId: `pv-${id}`, mode: 'demo',
  diff: ['~ .gitlab-ci.yml (hunk: +3 lines)', '+ added line'],
  commands: [{ display: `glab api --method PUT projects/90010001/repository/files/${id}`, argv: [], risk: 'low' }],
});
const row = (id: string): SheetRow => {
  const p = DEMO.maturity.proposals.find((x) => x.id === id);
  if (!p) throw new Error(id);
  return { id, title: p.title, send: gapSend('ledgerline', p, 'demo') };
};
const withView = (r: SheetRow): SheetRow => ({ ...r, view: { kind: 'preview', preview: preview(r.id) } });

beforeEach(() => {
  actions.previewAction.mockReset();
  actions.confirmAction.mockReset();
});

describe('opening Send previews each picked gap', () => {
  it('asks the door for g1 and g2 with their intents, and never for the probe; nothing is confirmed', async () => {
    actions.previewAction.mockImplementation((i: { gap: string }) => Promise.resolve({ status: 'preview', preview: preview(i.gap) } satisfies ActionResponse));
    const rows = [row('g1'), row('g2'), row('g4')];
    expect(toAsk(rows).map((r) => r.id)).toEqual(['g1', 'g2']);
    const views = await Promise.all(toAsk(rows).map(ask));
    expect(views.map((v) => (v.kind === 'preview' ? v.preview.previewId : v.reason))).toEqual(['pv-g1', 'pv-g2']);
    expect(actions.previewAction.mock.calls.map((c) => [c[0].kind, c[0].gap, c[0].project])).toEqual([['stage-gap-mr', 'g1', 'ledgerline'], ['stage-gap-mr', 'g2', 'ledgerline']]);
    expect(actions.confirmAction).not.toHaveBeenCalled();
  });
});

describe("the commands on screen are the preview's", () => {
  const html = (rows: SheetRow[]) =>
    renderToStaticMarkup(createElement(SendSheet, { api: { rows, ready: readyRows(rows).length, sending: false, opened: {}, send: () => {}, retry: () => {} }, onClose: () => {} }));
  it("shows the server's command and diff, and none of the old hand-written ones", () => {
    const out = html([withView(row('g1')), withView(row('g4'))]);
    expect(out).toContain('glab api --method PUT projects/90010001/repository/files/g1');
    expect(out).toContain('added line');
    expect(out).toContain('Open 1 MR as you');
    expect(out).not.toMatch(/glab mr create|repository\/commits|belay probe|belay scan/);
  });
  it('says plainly that the probe is not built, and offers no button for it', () => {
    const out = html([row('g4')]);
    expect(out).toContain('Not built yet');
    expect(out).not.toContain('Open 1 MR');
    expect(out).toContain('Nothing to send yet');
  });
  it('a refused preview shows why and can be asked again; a failed answer says so', () => {
    const out = html([
      { ...row('g1'), view: { kind: 'refused', reason: "the hunk's context lines do not match .gitlab-ci.yml" } },
      { ...withView(row('g2')), answer: { status: 'failed', text: 'Failed · gap g2 · command 2 of 3' } },
    ]);
    expect(out).toContain('context lines do not match');
    expect(out).toContain('Ask again');
    expect(out).toContain('Failed · gap g2 · command 2 of 3');
  });
});

describe('the button', () => {
  it('confirms each gap by its own preview id and names only the MR the response names', async () => {
    const done = (id: string, made: string[]): ActionResponse => ({ status: 'done', preview: preview(id), results: made.map((m) => ({ display: 'd', exit: 0, ok: true, simulated: false, made: m })) });
    actions.confirmAction.mockImplementation((i: { gap: string }) => Promise.resolve(i.gap === 'g1' ? done('g1', ['commit 1a2b3c4d', '!22']) : done('g2', [])));
    const rows = [withView(row('g1')), withView(row('g2')), row('g4')];
    expect(readyRows(rows).map((r) => r.id)).toEqual(['g1', 'g2']);
    const sent = await sendReady(rows);
    expect(actions.confirmAction.mock.calls.map((c) => [c[0].gap, c[1]])).toEqual([['g1', 'pv-g1'], ['g2', 'pv-g2']]);
    expect(sent.map((s) => [s.id, s.answer.status, s.answer.mr])).toEqual([['g1', 'done', '!22'], ['g2', 'done', undefined]]);
    expect(sent[0]?.answer.text).toContain('!22');
    expect(sent[1]?.answer.text).toContain('GitLab named nothing');
  });
  it('changed, refused and failed each say so; changed puts the new write on screen; one failure does not stop the other', async () => {
    actions.confirmAction.mockImplementation((i: { gap: string }) =>
      Promise.resolve(
        i.gap === 'g1'
          ? ({ status: 'changed', preview: preview('new') } satisfies ActionResponse)
          : ({ status: 'failed', preview: preview('g2'), results: [{ display: 'd', exit: 403, ok: false, simulated: false, error: '403 Forbidden' }] } satisfies ActionResponse),
      ),
    );
    const sent = await sendReady([withView(row('g1')), withView(row('g2'))]);
    expect(sent.map((s) => s.answer.status)).toEqual(['changed', 'failed']);
    expect(sent[0]?.view).toEqual({ kind: 'preview', preview: preview('new') });
    expect(sent[1]?.answer.text).toContain('403 Forbidden');
  });
  it('no answer from the server is said, not guessed', async () => {
    actions.confirmAction.mockRejectedValue(new Error('network'));
    const [s] = await sendReady([withView(row('g1'))]);
    expect(s?.answer).toMatchObject({ status: 'failed', text: expect.stringContaining('may or may not have run') });
  });
  it('sends nothing for a gap without a preview on screen, and nothing twice for a gap already done', async () => {
    expect(await sendReady([row('g1'), { ...withView(row('g2')), answer: { status: 'done', text: 'x' } }])).toEqual([]);
    expect(actions.confirmAction).not.toHaveBeenCalled();
  });
});
