// Live mode shows no fixture as the project's own (the repo's per-part rule, src/server/data/README.md): the credit history,
// the per-rung evidence objects and Day 0 notes, and the demo project, scan age and rescan clock are hidden in live mode,
// and a demo gap's text and files carry a "demo" chip. The probe and the crediting rescan say "simulated" in every mode,
// and two of the four credit checks, which nothing checks, read "not checked". Demo mode keeps its walkthrough.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DEMO, type DemoData } from '@/lib/demo';
import { maturity as narrow } from '@/server/data/live/narrow';
import { RUNGS, STAGES } from '@/schemas/stages';
import { InspectorPanel } from './components/inspector/InspectorPanel';
import { CREDIT_HISTORY } from './data/credit';
import { MAT_META } from './data/meta';
import { STAGE_EVIDENCE } from './data/stageEvidence';
import type { MaturityApi } from './hooks/useMaturity';
import { MaturityScreen } from './MaturityScreen';
import { makeCtx, type MaturityCtx } from './model/ctx';
import { routeViews } from './model/crag/routes';
import { reduce, type Action } from './model/reducer';
import { initialState, pendingIds, type MaturityState } from './model/state';
import { stepsView } from './model/steps';

vi.mock('@/components/overlays/toast/useToast', () => ({ useToast: () => ({ toast: () => {}, status: () => {}, statusMessage: '' }), useStatusMessage: () => '' }));
vi.mock('@/server/actions/actions', () => ({ previewAction: vi.fn(), confirmAction: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => '/maturity', useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }), useSearchParams: () => new URLSearchParams() }));

type Mode = 'demo' | 'live';
const textOf = (html: string): string => html.replace(/<!-- -->/g, '').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"');

const NEVER = narrow(null);
const SCANNED: DemoData['maturity'] = narrow({
  engine: '1.0.0', scannedAt: '14:19', rungNames: [...RUNGS], proposals: [],
  rungs: STAGES.map((stage, i) => ({ stage, day0: i % 3 === 0 ? null : 1, now: i % 4 === 0 ? null : 2, next: i % 4 === 0 ? null : 3, evidence: `scan says ${stage}` })),
});
/** BELAY_GITLAB=fake: the seeded scan and the seeded gap ids, served as the index's. */
const SEEDED: DemoData['maturity'] = DEMO.maturity;

/** The fixtures' own text; a word as short as "active" is left out, since the product's own words use it too. */
const FIXTURE_TEXT: readonly string[] = [
  ...CREDIT_HISTORY.map((c) => c.why),
  ...Object.values(STAGE_EVIDENCE).flatMap((e) => [e.missing, e.day0, ...Object.values(e.objs).flatMap((os) => (os ?? []).flatMap((o) => [o.label, o.ref]))]),
].filter((x) => x.length >= 10).concat([MAT_META.project, MAT_META.project.replace('/', ' / '), `${MAT_META.scanAgeMin} min`, MAT_META.nowClock, MAT_META.rescanEvery]);

const run = (ctx: MaturityCtx, ...a: Action[]) => a.reduce((s, x) => reduce(s, x, ctx), initialState(ctx));
const api = (ctx: MaturityCtx, state: MaturityState): MaturityApi => ({
  ctx, state, dispatch: () => {}, routes: routeViews(state, ctx), steps: stepsView(state, ctx), pending: pendingIds(state, ctx),
  go: () => true, select: () => {}, setMode: () => {},
});

/** The whole screen, and the inspector of every stage with every section open, in the states the walkthrough reaches. */
function everything(m: DemoData['maturity'], mode: Mode): string {
  const ctx = makeCtx(m, DEMO.stages, { mode });
  const sent = run(ctx, { type: 'go', step: 3 }, { type: 'sent', opened: { g1: '!22', g2: null, g4: null }, text: 'x' });
  const merged = [sent, { type: 'merge', id: 'g1' }, { type: 'merge', id: 'g2' }].reduce((s, x) => reduce(s as MaturityState, x as Action, ctx)) as MaturityState;
  const nolift = reduce(merged, { type: 'rescanGap', id: 'g1' }, ctx);
  const credited = [nolift, { type: 'rescanGap', id: 'g2' }, { type: 'ran', id: 'g1' }, { type: 'rescanGap', id: 'g1' }].reduce((s, x) => reduce(s as MaturityState, x as Action, ctx)) as MaturityState;
  const parts = [renderToString(createElement(MaturityScreen, { maturity: m, stages: DEMO.stages, project: 'ledgerline', mode }))];
  for (const state of [initialState(ctx), sent, merged, nolift, credited]) {
    for (const sel of ctx.stages) {
      parts.push(renderToString(createElement(InspectorPanel, { api: api(ctx, { ...state, sel, open: { ev: true, gap: true, day0: true, hist: true } }) })));
    }
  }
  return textOf(parts.join('\n'));
}

describe('live mode: no fixture shows as the project\'s', () => {
  it.each([['never scanned', NEVER], ['scanned', SCANNED], ['the fake group\'s seeded scan', SEEDED]])('%s: no credit history, evidence object, Day 0 note, demo project, scan age or clock', (_n, m) => {
    const t = everything(m, 'live');
    expect(FIXTURE_TEXT.filter((f) => t.includes(f))).toEqual([]);
  });

  it('the window names the project the data source is about, and the scan time is the view\'s, or "not scanned"', () => {
    expect(everything(SCANNED, 'live')).toContain('ledgerline');
    expect(everything(SCANNED, 'live')).toMatch(/scanned <b>14:19<\/b>/);
    expect(everything(NEVER, 'live')).toContain('not scanned');
    expect(everything(NEVER, 'live')).not.toContain('--:--');
  });

  it('the scan\'s own note stands in for the evidence objects', () => {
    expect(everything(SCANNED, 'live')).toContain('scan says verify');
  });

  it('a demo gap\'s text and files carry a demo chip', () => {
    const t = everything(SEEDED, 'live');
    expect(t).toContain(DEMO.maturity.proposals[0]?.title ?? '?');
    expect(t).toMatch(/title="[^"]*demo fixture[^"]*"[^>]*>demo</);
  });
});

describe('every mode', () => {
  it.each(['demo', 'live'] as const)('%s: the probe and the crediting rescan say simulated', (mode) => {
    const ctx = makeCtx(SEEDED, DEMO.stages, { mode });
    const sent = run(ctx, { type: 'go', step: 3 }, { type: 'sent', opened: { g1: '!22', g4: null }, text: 'x' });
    const merged = reduce(sent, { type: 'merge', id: 'g1' }, ctx);
    const panel = (s: MaturityState, sel: MaturityState['sel']) => textOf(renderToString(createElement(InspectorPanel, { api: api(ctx, { ...s, sel, open: { ev: true, gap: true, day0: true, hist: true } }) })));
    expect(panel(merged, 'secure')).toMatch(/Rescan · engine [^<]*<\/button>.*simulated/s);
    expect(panel(sent, 'monitor')).toMatch(/integration active.*simulated|simulated.*integration active/s);
  });

  it.each(['demo', 'live'] as const)('%s: same engine and not detector-only read "not checked"', (mode) => {
    const ctx = makeCtx(SEEDED, DEMO.stages, { mode });
    const s = run(ctx, { type: 'go', step: 3 }, { type: 'sent', opened: { g1: '!22' }, text: 'x' }, { type: 'merge', id: 'g1' }, { type: 'rescanGap', id: 'g1' });
    const t = textOf(renderToString(createElement(InspectorPanel, { api: api(ctx, { ...s, sel: 'secure' }) })));
    expect(t).toContain('same engine · not checked');
    expect(t).toContain('not detector-only · not checked');
  });
});

describe('demo mode keeps its walkthrough', () => {
  const t = everything(SEEDED, 'demo');
  it('shows the demo project, its scan age, the credit history, the evidence objects and the Day 0 notes', () => {
    expect(FIXTURE_TEXT.filter((f) => f !== MAT_META.project && f !== MAT_META.rescanEvery && !t.includes(f))).toEqual([]);
  });
  it('marks nothing "demo": in demo mode all of it is the demo', () => {
    expect(t).not.toMatch(/>demo</);
  });
});
