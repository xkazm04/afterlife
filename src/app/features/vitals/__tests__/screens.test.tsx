// No DOM here: each Vitals state is rendered to markup from the Grinex-shaped fixtures (data/__fixtures__/grinex.ts).
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ADJUSTMENTS, MARKERS, NO_CLOUD, NOW, PROD, PROJECT, RUNS } from '../data/__fixtures__/grinex';
import { listRows } from '../model/slices';
import { buildView, configRow, runsCell } from '../model/view';

vi.mock('next/navigation', () => ({ usePathname: () => '/vitals/grinex-portal', useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }) }));
vi.mock('../data/actions', () => ({ refreshVitals: vi.fn(async () => ({ ok: false, error: 'not in tests' })) }));
const { VitalsListScreen } = await import('../VitalsListScreen');
const { VitalsBody } = await import('../VitalsScreen');
const { VitalsInspector } = await import('../components/inspector/VitalsInspector');

const view = buildView(PROJECT, RUNS, PROD, ADJUSTMENTS, MARKERS, NOW);
const body = (v = view, opts: { starting?: boolean; refused?: string } = {}) => renderToStaticMarkup(<VitalsBody view={v} {...opts} onRefresh={() => {}} />);
const withJob = (job: NonNullable<typeof view.job>) => ({ ...view, job });
const ago = (min: number) => new Date(Date.parse(NOW) - min * 60_000).toISOString();
const inspect = (picked: string) => renderToStaticMarkup(<VitalsInspector view={view} picked={picked} />);

describe('/vitals, the list', () => {
  it('no project: says so and calls to Onboard', () => {
    const out = renderToStaticMarkup(<VitalsListScreen projects={[]} now={NOW} />);
    expect(out).not.toContain('—');
    expect(out).toContain('No real project yet');
    expect(out).toContain('href="/onboard"');
    expect(out).not.toContain('Real projects');
  });
  it('lists each real project: name, root, host, CI, cloud, last collected, runs stored', () => {
    const rows = listRows([configRow(PROJECT), configRow(NO_CLOUD)], { [PROJECT.slug]: runsCell(RUNS), [NO_CLOUD.slug]: runsCell([]) });
    const out = renderToStaticMarkup(<VitalsListScreen projects={rows} now={NOW} />);
    for (const t of ['Grinex Portal', 'C:/work/grinex-portal', 'azure-devops · Grinex / Grinex Portal', 'azure-pipelines · 2 pipelines', 'azure-app-insights · grinex-portal-ai', '5 m ago', '>11<', 'not connected', 'never'])
      expect(out).toContain(t);
    expect(out).toContain('href="/vitals/grinex-portal"');
  });
});

describe('/vitals/[project]', () => {
  it('draws the three bands, the toolbar and the first variant in the inspector', () => {
    const out = body();
    for (const t of ['Delivery', 'Production', 'Adjustments', 'Refresh', 'last collected 5 m ago', 'master-full', '3h 12m', '25%', 'Run Tests · 2h 24m', 'unclassified'])
      expect(out).toContain(t);
    expect(out).toContain('aria-label="master-full stages"');
    expect(out).toContain('aria-label="master-full last runs"');
  });
  it('a variant with no runs: the row says no runs, the inspector says none is stored', () => {
    expect(body()).toContain('no runs');
    expect(inspect('v:nightly')).toContain('No run of this variant is stored yet');
  });
  it('production: the last 24 h figures and the deploy tick on the trend', () => {
    const out = body();
    expect(out).toContain('28,800');
    expect(out).toContain('data-deploy="904"');
    expect(inspect('s:p95-ms')).toContain('run 904 · Swap');
  });
  it('no cloud: the production band says it is not connected and links to Onboard', () => {
    const out = body(buildView(NO_CLOUD, RUNS, [], ADJUSTMENTS, MARKERS, NOW));
    expect(out).toContain('No cloud telemetry is connected');
    expect(out).toContain('href="/onboard"');
    expect(out).not.toContain('aria-label="Production signals"');
  });
  it('no adjustments: the band names belay report', () => {
    const out = body(buildView(PROJECT, RUNS, PROD, [], MARKERS, NOW));
    expect(out).toContain('No adjustment reported yet');
    expect(out).toContain('belay report');
  });
  it('adjustments: the state from the measurement, the agent’s claim labelled beside it', () => {
    const out = body();
    for (const s of ['credited', 'not-earned', 'measuring', 'inconclusive', 'proposed']) expect(out).toContain(`>${s}<`);
    expect(out).toContain('Agent’s claim');
    const one = inspect('a:adj-1');
    expect(one).toContain('Agent’s claim');
    expect(one).toContain('Afterlife’s measurement');
    expect(one).toContain('-39%');
    expect(inspect('a:adj-4')).toContain('Afterlife has not measured this yet');
  });
  it('re-measure: a CI claim offers passive and Queue N runs on its branch; one with no variant or branch says what fits', () => {
    const one = inspect('a:adj-1');
    expect(one).toContain('Measure passively');
    expect(one).toContain('Queue N runs');
    expect(one).toContain('on belay/split-tests');
    expect(one).not.toContain('Measure locally');
    expect(inspect('a:adj-2')).not.toContain('Queue N runs'); // an MR, no branch to queue on
    expect(inspect('a:adj-3')).toContain('No re-measure fits this claim here');
  });
  it('a project with no run collected yet reads never, not an epoch or zero', () => {
    expect(body(buildView(PROJECT, [], [], [], [], NOW))).toContain('last collected never');
  });
});

describe('/vitals/[project], the collect states', () => {
  it('collecting: a job runs in the background; since when, the re-read, and Refresh is disabled', () => {
    const out = body(withJob({ startedAt: ago(2) }));
    expect(out).toContain('aria-busy="true"');
    expect(out).toContain(`Collecting since ${ago(2)} (started 2 m ago)`);
    expect(out).toContain('re-reads every 5 s');
    expect(out).toContain('collecting, started 2 m ago');
    expect(out).toMatch(/<button[^>]*disabled=""[^>]*>Refresh/);
  });
  it('starting: the click is on its way', () => {
    expect(body(view, { starting: true })).toContain('Starting a collect');
  });
  it('provider login expired: the line that said so and the copyable re-login command', () => {
    const probes = [{ kind: 'az-devops-runs' as const, args: {}, status: 'fail' as const, summary: "AADSTS700082: the refresh token has expired. Run 'az login'", at: NOW, ms: 40 }];
    const out = body(withJob({ startedAt: ago(5), done: ago(1), error: 'collect failed', probes }));
    expect(out).toContain('Provider login expired');
    expect(out).toContain('AADSTS700082');
    expect(out).toContain('aria-label="Re-login command"');
    expect(out).toContain('az login');
    expect(out).toContain('Copy command');
  });
  it('a failed collect that is not a login: its reason, and the stored bands stay', () => {
    const out = body(withJob({ startedAt: ago(5), done: ago(1), error: 'vitals: collectProject not built (WP2)' }));
    expect(out).toContain('Collect failed 1 m ago.');
    expect(out).toContain('collectProject not built');
    expect(out).toContain('master-full');
  });
  it('a refused Refresh says why', () => {
    expect(body(view, { refused: 'no saved project has that slug' })).toContain('Refresh refused.');
  });
  it('a collect that worked: how many runs and points it added', () => {
    expect(body(withJob({ startedAt: ago(5), done: ago(1), added: 3, total: 14, prodAdded: 120, probes: [] }))).toContain('Collected 1 m ago: 3 new runs (14 stored), 120 production points.');
  });
});
