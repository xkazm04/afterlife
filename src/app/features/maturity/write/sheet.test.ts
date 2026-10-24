// The Send sheet: opening it previews each picked gap (previewAction, nothing runs); the button confirms each preview on
// screen by its own id; each answer says only what the response says. The server actions are mocked: this is the screen's side.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO } from '@/lib/demo';
import type { ActionPreview, ActionResponse } from '@/server/actions/types';
import { NO_ANSWER } from '@/server/actions/words';
import { SendSheet } from '../components/sheet/SendSheet';
import { gapSend } from './gap';
import { reduce, type Action } from '../model/reducer';
import { initialState, type MaturityState } from '../model/state';
import { ctx } from '../model/testCtx';
import type { SheetRow } from './sheet';

const actions = vi.hoisted(() => ({ previewAction: vi.fn(), confirmAction: vi.fn() }));
vi.mock('@/server/actions/actions', () => actions);
const { ask, readyRows, sendRow, sheetRows, toAsk } = await import('./sheet');
/** The button, as useGapSheet's send runs it: every ready row by its own preview id, one gap's failure not stopping the others. */
const sendReady = (rows: readonly SheetRow[]) => Promise.all(readyRows(rows).map(sendRow));

const preview = (id: string): ActionPreview => ({
  kind: 'stage-gap-mr', title: `Open the draft MR for gap ${id}`, summary: 's', risk: 'low', previewId: `pv-${id}`, mode: 'demo',
  diff: ['~ .gitlab-ci.yml (hunk: +3 lines)', '+ added line'],
  commands: [{ display: `glab api --method PUT projects/90010001/repository/files/${id}`, argv: [], risk: 'low' }],
});
const row = (id: string): SheetRow => {
  const p = DEMO.maturity.proposals.find((x) => x.id === id);
  if (!p) throw new Error(id);
  return { id, title: p.title, tier: ctx.gap(id)?.x.tier ?? null, send: gapSend('ledgerline', p, 'demo') };
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
  const html = (rows: SheetRow[], sending = false) =>
    renderToStaticMarkup(createElement(SendSheet, { api: { rows, ready: readyRows(rows).length, sending, send: () => {}, retry: () => {} }, onClose: () => {} }));
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
  it('Cancel is disabled while sending: a send in flight cannot be walked away from', () => {
    expect(html([withView(row('g1'))], true)).toMatch(/<button[^>]*disabled[^>]*>Cancel<\/button>/);
    expect(html([withView(row('g1'))])).not.toMatch(/<button[^>]*disabled[^>]*>Cancel<\/button>/);
  });
});

describe("the sheet's rows are the layout's state", () => {
  const run = (s: MaturityState, ...actions: Action[]) => actions.reduce((acc, a) => reduce(acc, a, ctx), s);
  const viewed = () => run(initialState(ctx), { type: 'go', step: 3 }, { type: 'ask', ids: ['g1', 'g2'] }, { type: 'viewed', id: 'g1', view: { kind: 'preview', preview: preview('g1') } });
  it('derives view and answer from MaturityState alone: two calls on one state give equal rows (a remount shows the same)', () => {
    const s = run(viewed(), { type: 'sending', ids: ['g1'] }, { type: 'answered', id: 'g1', answer: { status: 'done', text: 'opened !22', mr: '!22' } });
    const a = sheetRows(s, ctx, 'ledgerline', 'demo');
    expect(a).toEqual(sheetRows(s, ctx, 'ledgerline', 'demo'));
    expect(a.map((r) => [r.id, r.view?.kind, r.answer?.mr])).toEqual([['g1', 'preview', '!22'], ['g2', undefined, undefined]]);
    expect(readyRows(a)).toEqual([]);
  });
  it('after Cancel and Send again, g1 is asked for again', () => {
    const s = run(viewed(), { type: 'cancelSheet' }, { type: 'go', step: 3 });
    expect(toAsk(sheetRows(s, ctx, 'ledgerline', 'demo')).map((r) => r.id)).toEqual(['g1', 'g2']);
    expect(toAsk(sheetRows(viewed(), ctx, 'ledgerline', 'demo')).map((r) => r.id)).toEqual([]);
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
  it('no answer from the server is said, not guessed, and keeps why it threw (the digest ties it to the server log)', async () => {
    actions.confirmAction.mockRejectedValue(Object.assign(new Error('network'), { digest: '42' }));
    const [s] = await sendReady([withView(row('g1'))]);
    expect(s?.answer).toEqual({ status: 'failed', text: `${NO_ANSWER} (network (digest 42))` });
  });
  it('sends nothing for a gap without a preview on screen, and nothing twice for a gap already done', async () => {
    expect(await sendReady([row('g1'), { ...withView(row('g2')), answer: { status: 'done', text: 'x' } }])).toEqual([]);
    expect(actions.confirmAction).not.toHaveBeenCalled();
  });
});
