// The proposal as the checklist the person reads: one line per thing that would be saved (the host, each component,
// pipeline and variant, the cloud resource), each tied to the probe that confirms it, plus a line for each probe that
// confirms nothing on its own (a login, a runs list). A line is proposed, then probing, then ok or fail, from its
// probe's result; the save keeps exactly the lines that read ok here (server/discover/confirm.ts decides the same).
import type { ProbeKind, ProbeResult, Proposal, VariantRule } from '@/schemas/vitals';
import { appInsightsStep, neverRanFiles, neverRanLines, neverRanSummary } from './findings';

/** `finding`: what a probe found that is not saved (a CI file that never ran); `you`: a step only a person takes. */
export type LineState = 'proposed' | 'probing' | 'ok' | 'fail' | 'skipped' | 'finding' | 'you';
export type GroupName = 'Host' | 'Components' | 'Pipelines & variants' | 'Cloud';
export const GROUPS: readonly GroupName[] = ['Host', 'Components', 'Pipelines & variants', 'Cloud'];

export interface Line {
  id: string;
  label: string;
  detail?: string;
  state: LineState;
  /** The probe's one line once it ran. */
  summary?: string;
  /** The re-login command a failed probe names. */
  relogin?: string;
  /** A probe of its own (a login, a runs list): it confirms nothing that is saved. */
  check?: boolean;
  /** A finding or a person's step (findings.ts): never a line that is saved. */
  finding?: boolean;
  /** The commands a person's step names, shown to copy, never run. */
  commands?: string[];
}

export interface Group {
  name: GroupName;
  lines: Line[];
}

const GROUP_OF: Record<ProbeKind, GroupName> = {
  'git-root': 'Host', 'git-remote': 'Host', 'az-login': 'Host', 'glab-auth': 'Host', 'local-command': 'Components',
  'az-devops-pipelines': 'Pipelines & variants', 'az-devops-runs': 'Pipelines & variants', 'az-devops-timeline': 'Pipelines & variants',
  'glab-pipelines': 'Pipelines & variants', 'glab-jobs': 'Pipelines & variants', 'az-appinsights-component': 'Cloud', 'az-appinsights-query': 'Cloud',
  'az-loganalytics-workspace': 'Cloud', 'az-loganalytics-query': 'Cloud',
};

const CHECK_LABEL: Record<ProbeKind, string> = {
  'git-root': 'Git repository', 'git-remote': 'Remote', 'az-login': 'az login', 'glab-auth': 'glab login', 'local-command': 'Local command',
  'az-devops-pipelines': 'Pipelines list', 'az-devops-runs': 'Recent runs', 'az-devops-timeline': 'Run timeline', 'glab-pipelines': 'Pipelines list',
  'glab-jobs': 'Pipeline jobs', 'az-appinsights-component': 'App Insights component', 'az-appinsights-query': 'App Insights query',
  'az-loganalytics-workspace': 'Log Analytics workspace', 'az-loganalytics-query': 'HTTP logs query',
};

export const reloginOf = (summary: string): string | undefined => /\b(az login|glab auth login)\b/.exec(summary)?.[1];

/** "branch master · LANE=hotfix · reason schedule": how a variant's runs are told apart. */
export function matchText(v: VariantRule): string {
  const m = v.match;
  return [m.branch && `branch ${m.branch}`, m.parameter && `${m.parameter.name}=${m.parameter.value}`, m.reason?.length && `reason ${m.reason.join(', ')}`].filter(Boolean).join(' · ');
}

/** A line's state and summary from its probe: the result once it ran, probing while it runs, else proposed. */
function fromProbe(i: number, results: readonly (ProbeResult | undefined)[], running: number | null): Pick<Line, 'state' | 'summary' | 'relogin'> {
  const r = i >= 0 ? results[i] : undefined;
  if (!r) return { state: i >= 0 && i === running ? 'probing' : 'proposed' };
  const relogin = r.status === 'fail' ? reloginOf(r.summary) : undefined;
  return { state: r.status, summary: r.summary, ...(relogin ? { relogin } : {}) };
}

export function checklist(p: Proposal, results: readonly (ProbeResult | undefined)[], running: number | null, ciFiles: readonly string[] = []): Group[] {
  const used = new Set<number>();
  const find = (ok: (kind: ProbeKind, args: Record<string, string>) => boolean): number => {
    const i = p.probes.findIndex((s) => ok(s.kind, s.args));
    if (i >= 0) used.add(i);
    return i;
  };
  const lines: Record<GroupName, Line[]> = { Host: [], Components: [], 'Pipelines & variants': [], Cloud: [] };
  const h = p.host;
  lines.Host.push({ id: 'host', label: h.kind === 'none' ? 'No host' : h.kind, detail: [h.org, h.project, h.repo, h.path].filter(Boolean).join(' / ') || undefined, ...fromProbe(find((k, a) => k === 'git-remote' && !a.path), results, running) });
  for (const c of p.components) {
    const i = find((k, a) => k === 'git-root' && (a.path ?? '.') === c.path);
    lines.Components.push({ id: `component:${c.id}`, label: c.id, detail: [c.path, c.stack, c.tests?.join(' · ')].filter(Boolean).join(' · '), ...fromProbe(i, results, running) });
  }
  const listing = find((k) => k === 'az-devops-pipelines' || k === 'glab-pipelines');
  const ids = results[listing]?.status === 'ok' ? (results[listing]?.data?.pipelineIds ?? '').split(',').map((s) => s.trim()) : null;
  const never = neverRanFiles(p, ciFiles, results[listing]);
  const pipelineState = (id: string, file?: string): Pick<Line, 'state' | 'summary' | 'relogin'> => {
    const base = fromProbe(listing, results, running);
    if (!ids || ids.includes(id)) return base;
    if (file && never?.has(file)) return { state: 'finding', summary: neverRanSummary };
    return { state: 'fail', summary: `not among the pipelines listed (${ids.filter(Boolean).join(', ') || 'none'})` };
  };
  for (const pl of p.ci.pipelines) {
    lines['Pipelines & variants'].push({ id: `pipeline:${pl.id}`, label: pl.name, detail: [pl.file, `id ${pl.id}`].filter(Boolean).join(' · '), ...pipelineState(pl.id, pl.file) });
    for (const v of p.ci.variants.filter((x) => x.pipelineId === pl.id)) lines['Pipelines & variants'].push({ id: `variant:${pl.id}:${v.id}`, label: `↳ ${v.id}`, detail: matchText(v), ...pipelineState(pl.id, pl.file) });
  }
  lines['Pipelines & variants'].push(...neverRanLines(p, never));
  if (p.cloud.provider !== 'none') {
    const i = find((k) => k === 'az-appinsights-component');
    const base = fromProbe(i, results, running);
    const found = results[i]?.status === 'ok' && !!results[i]?.data?.appId;
    const hint = [p.cloud.hint?.resourceGroup, p.cloud.hint?.name].filter(Boolean).join(' / ');
    lines.Cloud.push({ id: 'cloud', label: 'App Insights', detail: hint || undefined, ...(base.state === 'ok' && !found ? { state: 'fail', summary: `${base.summary}: no component found` } : base) });
    const step = appInsightsStep(p, results[i]);
    if (step) lines.Cloud.push(step);
  }
  p.probes.forEach((s, i) => {
    if (used.has(i)) return;
    const args = Object.values(s.args).join(' · ');
    lines[GROUP_OF[s.kind]].push({ id: `check:${i}`, label: CHECK_LABEL[s.kind], detail: args || undefined, check: true, ...fromProbe(i, results, running) });
  });
  return GROUPS.map((name) => ({ name, lines: lines[name] })).filter((g) => g.lines.length);
}

/** Lines that would be saved (not checks, findings or person steps), and how many of them a probe confirmed. */
export function tally(groups: readonly Group[]): { saved: number; total: number; failed: number } {
  const own = groups.flatMap((g) => g.lines.filter((l) => !l.check && !l.finding && l.state !== 'finding'));
  return { saved: own.filter((l) => l.state === 'ok').length, total: own.length, failed: groups.flatMap((g) => g.lines).filter((l) => l.state === 'fail').length };
}
