// No DOM here: the demo estate's projects in both Vitals screens, rendered to markup from the generated figures
// (model/demo), beside a real one from the Grinex-shaped fixture.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { deployMarkers } from '@/server/vitals/deploys';
import { NOW, PROJECT, RUNS } from '../data/__fixtures__/grinex';
import { demoRuns } from '../model/demo/ci';
import { demoClock, withoutRemeasure } from '../model/demo/estate';
import { DEMO_PROJECTS } from '../model/demo/projects';
import { demoAdjustments, demoProd } from '../model/demo/signals';
import { listRows } from '../model/slices';
import { buildView, configRow, runsCell } from '../model/view';

vi.mock('next/navigation', () => ({ usePathname: () => '/vitals/ledgerline', useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }) }));
vi.mock('../data/actions', () => ({ refreshVitals: vi.fn(async () => ({ ok: false, error: 'not in tests' })) }));
const { VitalsListScreen } = await import('../VitalsListScreen');
const { VitalsBody } = await import('../VitalsScreen');
const { VitalsInspector } = await import('../components/inspector/VitalsInspector');

const nowMs = demoClock(Date.parse(NOW));
const ledgerline = DEMO_PROJECTS[0]!;
const runs = demoRuns(ledgerline, nowMs);
const built = buildView(ledgerline, runs, demoProd(ledgerline, nowMs), demoAdjustments(ledgerline, nowMs), deployMarkers(runs), NOW);
const view = { ...built, adjustments: withoutRemeasure(built.adjustments), demo: true as const };
const demoRows = DEMO_PROJECTS.map((cfg) => ({ ...configRow(cfg), demo: true as const }));
const bySlug = Object.fromEntries(DEMO_PROJECTS.map((cfg) => [cfg.slug, runsCell(demoRuns(cfg, nowMs))]));

describe('/vitals with the demo estate on', () => {
  it('no real project: the demo ones listed, each marked demo, the page says illustrative and still calls to Onboard', () => {
    const out = renderToStaticMarkup(<VitalsListScreen projects={listRows(demoRows, bySlug)} now={NOW} />);
    for (const t of ['ledgerline', 'payments-gateway', 'gitlab · acme-lab/ledgerline', 'gitlab-ci · 1 pipeline', 'no real project yet · 3 demo', 'illustrative demo data'])
      expect(out).toContain(t);
    expect(out.match(/>demo</g)).toHaveLength(3);
    expect(out).toContain('href="/start"');
    expect(out).not.toContain('No real project yet</h2>');
  });

  it('a real project beside them: listed first, unmarked, and the status line still says the demo rows are illustrative', () => {
    const rows = listRows([configRow(PROJECT), ...demoRows], { ...bySlug, [PROJECT.slug]: runsCell(RUNS) });
    const out = renderToStaticMarkup(<VitalsListScreen projects={rows} now={NOW} />);
    expect(out).toContain('1 real project · 3 demo');
    expect(out.indexOf('Grinex Portal')).toBeLessThan(out.indexOf('ledgerline'));
    expect(out).toContain('illustrative demo data · ');
    expect(out).not.toContain('No real project yet.');
  });
});

describe('/vitals/[project], a demo project', () => {
  const out = renderToStaticMarkup(<VitalsBody view={view} onRefresh={() => {}} />);
  it('draws every band from the illustrative figures and says so', () => {
    for (const t of ['Delivery', 'Production', 'Adjustments', 'main-full', 'mr-feature', 'nightly', 'azure-app-insights · ledgerline-ai', 'Illustrative demo data.', 'illustrative demo data'])
      expect(out).toContain(t);
    expect(out).toContain('data-deploy=');
  });
  it('offers no Refresh and no collect notice', () => {
    expect(out).toMatch(/<button[^>]*disabled=""[^>]*>Refresh/);
    expect(out).not.toContain('Starting a collect');
  });
  it('an adjustment offers no re-measure, it says why', () => {
    const one = renderToStaticMarkup(<VitalsInspector view={view} picked="a:adj-1" />);
    expect(one).toContain('nothing to re-measure');
    expect(one).not.toContain('Measure passively');
  });
});
