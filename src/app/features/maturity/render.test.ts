import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DEMO } from '@/lib/demo';
import { InspectorPanel } from './components/inspector/InspectorPanel';
import { SendSheet } from './components/sheet/SendSheet';
import { Crag } from './components/crag/Crag';
import type { MaturityApi } from './hooks/useMaturity';
import { reduce, type Action } from './model/reducer';
import { routeViews } from './model/crag/routes';
import { initialState, pendingIds, type MaturityState } from './model/state';
import { stepsView } from './model/steps';
import { ctx } from './model/testCtx';

vi.mock('@/components/overlays/toast/useToast', () => ({ useToast: () => ({ toast: () => {}, status: () => {}, statusMessage: '' }) }));

const run = (s: MaturityState, ...a: Action[]) => a.reduce((acc, x) => reduce(acc, x, ctx), s);
const api = (state: MaturityState): MaturityApi => ({
  ctx,
  state,
  dispatch: () => {},
  routes: routeViews(state, ctx),
  steps: stepsView(state, ctx),
  pending: pendingIds(state, ctx),
  go: () => true,
  select: () => {},
  setMode: () => {},
});

const sent = run(initialState(ctx), { type: 'go', step: 3 }, { type: 'send' });
const merged = run(sent, { type: 'merge', id: 'g1' }, { type: 'merge', id: 'g2' });
const nolift = run(merged, { type: 'rescanGap', id: 'g1' });
const credited = run(nolift, { type: 'rescanGap', id: 'g2' }, { type: 'ran', id: 'g1' }, { type: 'rescanGap', id: 'g1' });
const probe = run(initialState(ctx), { type: 'togglePick', id: 'g4' }, { type: 'go', step: 3 }, { type: 'send' });
const states = { initial: initialState(ctx), preview: run(initialState(ctx), { type: 'go', step: 2 }), sent, merged, nolift, credited, probe };

describe('screen parts render in every state', () => {
  for (const [name, state] of Object.entries(states)) {
    for (const stage of ctx.stages) {
      it(`inspector: ${name} / ${stage}`, () => {
        const html = renderToStaticMarkup(createElement(InspectorPanel, { api: api({ ...state, sel: stage, open: { ev: true, gap: true, day0: true, hist: true } }) }));
        expect(html).toContain('Evidence');
      });
    }
    it(`crag: ${name}`, () => {
      const html = renderToStaticMarkup(
        createElement(Crag, { routes: routeViews(state, ctx), mode: state.mode, scannedAt: state.scannedAt, animKey: state.animKey, rungNames: ctx.rungNames, scale: 1.15, onSelect: () => {}, onPick: () => {} }),
      );
      expect(html).toContain('Nine stage routes');
      expect((html.match(/data-stage=/g) ?? []).length).toBe(9);
    });
  }

  it('crag draws the chalk ticks in Target but not in Day 0, where the rope is day 0', () => {
    const draw = (mode: 'target' | 'day0') =>
      renderToStaticMarkup(
        createElement(Crag, {
          routes: routeViews(run(initialState(ctx), { type: 'mode', mode }), ctx),
          mode,
          scannedAt: '14:02',
          animKey: 1,
          rungNames: ctx.rungNames,
          scale: 1,
          onSelect: () => {},
          onPick: () => {},
        }),
      );
    expect(draw('target')).toContain('>d0<');
    expect(draw('target')).toContain('ghost');
    expect(draw('day0')).not.toContain('>d0<');
  });

  it('the send sheet shows the exact commands: the screen\'s while the server plans, then the server\'s', () => {
    const gaps = ctx.gaps.filter((g) => g.picked);
    const planning = renderToStaticMarkup(createElement(SendSheet, { gaps, writes: {}, ready: false, onCancel: () => {}, onSend: () => {} }));
    expect(planning).toContain('Open 2 MRs as you');
    expect(planning).toContain('glab mr create');
    expect(planning).toContain('planning on the server');
    const preview = { kind: 'stage-gap-mr' as const, title: 'Open the draft MR', summary: 's', commands: [{ display: 'glab api --method POST projects/1/merge_requests', argv: [], risk: 'low' as const }], risk: 'low' as const, diff: [], previewId: 'p', mode: 'demo' as const };
    const writes = Object.fromEntries(gaps.map((g) => [g.id, { status: 'preview' as const, preview }]));
    const planned = renderToStaticMarkup(createElement(SendSheet, { gaps, writes, ready: true, onCancel: () => {}, onSend: () => {} }));
    expect(planned).toContain('demo · planned, never executed');
    expect(planned).toContain('projects/1/merge_requests');
    expect(DEMO.maturity.proposals).toHaveLength(4);
  });
});
