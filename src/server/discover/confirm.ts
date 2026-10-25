// What gets saved: only the proposal lines an ok probe confirmed. The host comes from the git-remote probe's data, a
// pipeline only if a pipelines probe listed its id, a variant only with its pipeline, the cloud resource only from
// what the App Insights component probe found, a component only if its path exists. The model's metrics and its
// cloud hint are never saved as such: a hint is what the component probe was asked, not what it found.
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { CloudConfig, Engine, Host, HostKind, ProbeResult, ProjectConfig, Proposal } from '@/schemas/vitals';
import { kebab } from './store/store';

const HOST_KINDS: readonly HostKind[] = ['azure-devops', 'gitlab', 'github', 'none'];

const ok = (results: readonly ProbeResult[], kinds: readonly string[]): ProbeResult[] => results.filter((r) => r.status === 'ok' && kinds.includes(r.kind));

function hostOf(results: readonly ProbeResult[]): Host {
  const d = ok(results, ['git-remote']).find((r) => !r.args.path)?.data;
  const kind = d?.hostKind as HostKind | undefined;
  if (!d || !kind || !HOST_KINDS.includes(kind)) return { kind: 'none' };
  const host: Host = { kind };
  for (const k of ['org', 'project', 'repo', 'path'] as const) if (d[k]) host[k] = d[k];
  return host;
}

function cloudOf(results: readonly ProbeResult[]): CloudConfig {
  for (const r of ok(results, ['az-appinsights-component'])) {
    const { appId, name, resourceGroup, subscription } = r.data ?? {};
    if (appId && name && resourceGroup && subscription) return { provider: 'azure-app-insights', resource: { appId, name, resourceGroup, subscription } };
  }
  return { provider: 'none' };
}

export function confirmProject(proposal: Proposal, results: ProbeResult[], root: string, engine: Engine, now: Date): ProjectConfig {
  const listed = new Set(ok(results, ['az-devops-pipelines', 'glab-pipelines']).flatMap((r) => (r.data?.pipelineIds ?? '').split(',').map((s) => s.trim()).filter(Boolean)));
  const pipelines = proposal.ci.pipelines.filter((p) => listed.has(p.id));
  const kept = new Set(pipelines.map((p) => p.id));
  const variants = proposal.ci.variants.filter((v) => kept.has(v.pipelineId));
  const components = proposal.components.filter((c) => existsSync(path.join(root, c.path)));
  const gates = [...new Set(components.flatMap((c) => c.tests ?? []))];
  const cfg: ProjectConfig = {
    slug: kebab(proposal.name),
    name: proposal.name,
    root,
    onboardedAt: now.toISOString(),
    engine,
    host: hostOf(results),
    components,
    ci: { provider: pipelines.length ? proposal.ci.provider : 'none', pipelines, variants },
    cloud: cloudOf(results),
    probes: results,
  };
  if (gates.length) cfg.runner = { gates };
  return cfg;
}
