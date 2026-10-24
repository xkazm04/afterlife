// Live mode's Day 0 card: no demo note stands in, so it says what the index holds - not scanned yet, unknown at the first
// stored scan, or that scan's rung with its name.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { DemoData } from '@/lib/demo';
import { DEMO } from '@/lib/demo';
import { maturity as narrow } from '@/server/data/live/narrow';
import { RUNGS, STAGES } from '@/schemas/stages';
import type { MaturityApi } from '../../hooks/useMaturity';
import { makeCtx } from '../../model/ctx';
import { initialState } from '../../model/state';
import { StageDetail } from './StageDetail';

vi.mock('@/components/overlays/toast/useToast', () => ({ useToast: () => ({ toast: () => {}, status: () => {} }) }));

const SCANNED: DemoData['maturity'] = narrow({
  engine: '1.0.0', scannedAt: '14:19', rungNames: [...RUNGS], proposals: [],
  rungs: STAGES.map((stage) => ({ stage, day0: stage === 'plan' ? null : 1, now: 2, next: 3, evidence: `scan says ${stage}` })),
});

const day0 = (m: DemoData['maturity'], stage: 'plan' | 'verify'): string => {
  const ctx = makeCtx(m, DEMO.stages, { mode: 'live' });
  const api = { ctx, state: initialState(ctx), dispatch: () => {} } as unknown as MaturityApi;
  const html = renderToStaticMarkup(createElement(StageDetail, { api, stage })).replace(/<!-- -->/g, '');
  const at = html.indexOf('Day 0');
  return html.slice(at, html.indexOf('Credit history', at));
};

describe('StageDetail Day 0 in live mode', () => {
  it('before any scan, says day 0 is the first scan Belay stores', () => {
    expect(day0(narrow(null), 'verify')).toContain('Not scanned yet: day 0 is the first scan Belay stores.');
  });
  it('a stage unknown at the first stored scan says unknown, never R0', () => {
    expect(day0(SCANNED, 'plan')).toContain('Unknown at the first scan Belay stored.');
  });
  it('a known stage names the rung of the first stored scan', () => {
    expect(day0(SCANNED, 'verify')).toContain(`R1 ${RUNGS[1]} at the first scan Belay stored.`);
  });
});
