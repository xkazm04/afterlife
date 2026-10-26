// The demo estate's projects in Vitals: which show beside the real ones, and that their generated figures fold into
// every band the way collected ones do (variants with stage times, signals with deploys, every adjustment state).
import { describe, expect, it } from 'vitest';
import demoData from '@/lib/demo/data/belay-demo.json';
import { deployMarkers } from '@/server/vitals/deploys';
import { NOW, PROJECT } from '../../../data/__fixtures__/grinex';
import { adjustmentsFold, buildView } from '../../view';
import { demoRuns } from '../ci';
import { demoClock, shownProject, shownProjects, withoutRemeasure } from '../estate';
import { DEMO_GROUP, DEMO_PROJECTS } from '../projects';
import { demoAdjustments, demoProd } from '../signals';

const nowMs = demoClock(Date.parse(NOW));
const demo = (slug: string) => DEMO_PROJECTS.find((p) => p.slug === slug)!;
const viewOf = (slug: string) => {
  const cfg = demo(slug);
  const runs = demoRuns(cfg, nowMs);
  return buildView(cfg, runs, demoProd(cfg, nowMs), demoAdjustments(cfg, nowMs), deployMarkers(runs), new Date(nowMs).toISOString());
};

describe('which projects Vitals shows', () => {
  it('the demo projects are the demo estate fleet’s own, on its group', () => {
    const fleet = new Set(demoData.fleet.projects.map((p) => p.id));
    expect(demoData.portfolio.group).toBe(DEMO_GROUP);
    for (const p of DEMO_PROJECTS) expect(fleet.has(p.slug)).toBe(true);
    expect(DEMO_PROJECTS.map((p) => p.slug)).toContain('ledgerline');
  });

  it('demo off: only the saved projects; on: the saved ones first, then the demo ones, marked', () => {
    expect(shownProjects([PROJECT], false)).toEqual([{ cfg: PROJECT, demo: false }]);
    const on = shownProjects([PROJECT], true);
    expect(on[0]).toEqual({ cfg: PROJECT, demo: false });
    expect(on.slice(1).map((p) => [p.cfg.slug, p.demo])).toEqual(DEMO_PROJECTS.map((p) => [p.slug, true]));
    expect(shownProject([PROJECT], false, 'ledgerline')).toBeNull();
    expect(shownProject([], true, 'ledgerline')?.demo).toBe(true);
  });

  it('a saved project wins its slug: the demo one of that name is not shown', () => {
    const real = { ...PROJECT, slug: 'ledgerline', name: 'ledgerline' };
    const on = shownProjects([real], true);
    expect(on.filter((p) => p.cfg.slug === 'ledgerline')).toEqual([{ cfg: real, demo: false }]);
    expect(shownProject([real], true, 'ledgerline')).toEqual({ cfg: real, demo: false });
  });
});

describe('the demo figures, folded like collected ones', () => {
  it('the same clock gives the same runs', () => {
    expect(demoRuns(demo('ledgerline'), nowMs)).toEqual(demoRuns(demo('ledgerline'), nowMs));
  });

  it('Delivery: a row per configured variant with stage times, a failure rate and one run still running', () => {
    const v = viewOf('ledgerline');
    expect(v.delivery.map((r) => r.id)).toEqual(['main-full', 'mr-feature', 'nightly']);
    for (const r of v.delivery) {
      expect(r.medianMs).toBeGreaterThan(0);
      expect(r.p90Ms).toBeGreaterThanOrEqual(r.medianMs!);
      expect(r.stages.length).toBeGreaterThan(0);
      expect(r.failureRate).toBeGreaterThan(0);
    }
    const main = v.delivery[0]!;
    expect(main.runs - main.counted).toBe(1);
    expect(v.lastCollected).toBeDefined();
  });

  it('Production: every signal over the window, with the deploys marked on it', () => {
    const v = viewOf('ledgerline');
    expect(v.production?.map((r) => r.signal)).toEqual(['requests', 'failed-rate', 'p95-ms', 'exceptions', 'availability']);
    for (const r of v.production ?? []) expect(r.last24).toBeDefined();
    expect(v.production?.[0]?.markers.length).toBeGreaterThan(3);
  });

  it('a signal the source cannot give stays unknown, and no cloud draws no production at all', () => {
    const pay = viewOf('payments-gateway').production?.find((r) => r.signal === 'availability');
    expect(pay?.last24).toBeUndefined();
    expect(pay?.trend.every((c) => c === null)).toBe(true);
    expect(viewOf('ledgerline-web').production).toBeUndefined();
    expect(demoProd(demo('ledgerline-web'), nowMs)).toEqual([]);
  });

  it('Adjustments: one of each state, and no re-measure offered on a demo row', () => {
    const cfg = demo('ledgerline');
    const rows = adjustmentsFold(cfg, demoAdjustments(cfg, nowMs));
    expect(rows.map((r) => r.state).sort()).toEqual(['credited', 'measuring', 'not-earned', 'proposed']);
    expect(rows.some((r) => r.remeasure)).toBe(true);
    expect(withoutRemeasure(rows).some((r) => r.remeasure)).toBe(false);
    expect(viewOf('ledgerline-web').adjustments).toEqual([]);
  });
});
