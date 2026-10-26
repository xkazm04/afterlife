// Two things the probes find that are not lines to save. A CI definition in the repo with no registered pipeline
// behind it ("defined in the repo, never ran": Grinex's pr-validation.yml and nightly-full.yml are not registered in
// Azure Pipelines), and a cloud with no App Insights component, which is a person's step: once the project is saved,
// the save step's "Turn on App Insights" shows the server's exact az commands (enable-app-insights' preview) and runs
// them only on the person's click. No command is spelled here. Both are said only once a probe answered: unknown is
// never a finding.
import type { ProbeResult, Proposal } from '@/schemas/vitals';
import type { Line } from './lines';

const NEVER_RAN = 'defined in the repo, never ran: no pipeline is registered for it';

/** The ids the pipelines listing named, or null while it has not answered ok. */
export function listedIds(r: ProbeResult | undefined): string[] | null {
  return r?.status === 'ok' ? (r.data?.pipelineIds ?? '').split(',').map((s) => s.trim()).filter(Boolean) : null;
}

/**
 * The definition files a registered pipeline runs: the provider's own `pipelineFile:<id>` when it names them, else the
 * proposal's file for each pipeline whose id the listing named (the model matched them from the listed names).
 */
function registeredFiles(p: Proposal, r: ProbeResult, ids: readonly string[]): Set<string> {
  const fromProvider = Object.entries(r.data ?? {}).filter(([k]) => k.startsWith('pipelineFile:')).map(([, v]) => v.replace(/^\/+/, ''));
  if (fromProvider.length) return new Set(fromProvider);
  return new Set(p.ci.pipelines.filter((x) => ids.includes(x.id) && x.file).map((x) => x.file!));
}

/** The repo's CI files no registered pipeline runs, or null while the listing has not answered ok. */
export function neverRanFiles(p: Proposal, ciFiles: readonly string[], r: ProbeResult | undefined): Set<string> | null {
  const ids = listedIds(r);
  if (!r || !ids) return null;
  const reg = registeredFiles(p, r, ids);
  return new Set(ciFiles.filter((f) => !reg.has(f)));
}

/** A finding line for each never-ran file no proposed pipeline already stands for. */
export function neverRanLines(p: Proposal, never: ReadonlySet<string> | null): Line[] {
  if (!never) return [];
  const proposed = new Set(p.ci.pipelines.map((x) => x.file).filter(Boolean));
  return [...never].filter((f) => !proposed.has(f)).map((f) => ({ id: `finding:ci:${f}`, label: f, state: 'finding', summary: NEVER_RAN, finding: true }));
}

export const neverRanSummary = NEVER_RAN;

const NONE = /no App Insights component|was not found|ResourceNotFound|has no appId/i;

/** "Turn on App Insights", when the component probe answered that there is none (not when a login lapsed). */
export function appInsightsStep(p: Proposal, r: ProbeResult | undefined): Line | null {
  if (!r || p.cloud.provider === 'none') return null;
  const none = (r.status === 'fail' && NONE.test(r.summary)) || (r.status === 'ok' && !r.data?.appId);
  if (!none) return null;
  return {
    id: 'person:app-insights',
    label: 'Turn on App Insights',
    detail: 'your step: after Save',
    state: 'you',
    summary: 'No App Insights component: production signals come from the Log Analytics HTTP logs, if any. Save, then Turn on App Insights shows the exact az commands and runs them only on your click.',
    finding: true,
  };
}
