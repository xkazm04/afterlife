// A Proposal from model output, strictly. The top level must be an object with a name: anything else is an invalid
// proposal (ProposalError), shown as such. Below it, a line that does not fit its shape is dropped, not repaired, and
// the probe specs dropped are counted, so the A/B can say how often an engine asked for something we do not run.
import type { CiConfig, Component, Host, Pipeline, Proposal, VariantRule } from '@/schemas/vitals';
import type { TechMetric, TechParse } from '@/schemas/run/tech';
import { cleanSpec, specKey } from './probeArgs';

export class ProposalError extends Error {}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown, max = 200): string | undefined => (typeof v === 'string' && v.trim() && v.trim().length <= max ? v.trim() : undefined);
const texts = (v: unknown): string[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const out = v.map((x) => text(x, 400)).filter((x): x is string => !!x);
  return out.length ? out : undefined;
};
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const relPath = (v: unknown): string | undefined => {
  const p = text(v, 300)?.replace(/\\/g, '/').replace(/^\.\/(?=.)/, '').replace(/\/+$/, '');
  return p && !/^([a-z]:|\/)/i.test(p) && !p.split('/').includes('..') ? p : undefined;
};
/** Copies the keys whose value is defined: an absent value is an omitted key. */
const put = <T extends object>(o: T, extra: Partial<T>): T => {
  for (const [k, v] of Object.entries(extra)) if (v !== undefined) (o as Obj)[k] = v;
  return o;
};
const oneOf = <T extends string>(v: unknown, all: readonly T[], fallback: T): T => (all.includes(v as T) ? (v as T) : fallback);

function host(v: unknown): Host {
  const h = isObj(v) ? v : {};
  return put<Host>({ kind: oneOf(h.kind, ['azure-devops', 'gitlab', 'github', 'none'] as const, 'none') }, { org: text(h.org), project: text(h.project), repo: text(h.repo), path: text(h.path) });
}

function component(v: unknown): Component | null {
  if (!isObj(v)) return null;
  const id = text(v.id, 60);
  const path = v.path === '.' ? '.' : relPath(v.path);
  if (!id || !KEBAB.test(id) || !path) return null;
  return put<Component>({ id, path, stack: text(v.stack, 80) ?? '' }, { tests: texts(v.tests), build: texts(v.build) });
}

function pipeline(v: unknown): Pipeline | null {
  if (!isObj(v)) return null;
  const id = typeof v.id === 'number' ? String(v.id) : text(v.id, 40);
  const file = relPath(v.file);
  // A pipeline the model named only by its file is still that pipeline: the probe's listing names it for real.
  const name = text(v.name) ?? file ?? id;
  return id && name ? put<Pipeline>({ id, name }, { file }) : null;
}

function variant(v: unknown, pipelines: ReadonlySet<string>): VariantRule | null {
  if (!isObj(v) || !isObj(v.match)) return null;
  const id = text(v.id, 60);
  const pipelineId = typeof v.pipelineId === 'number' ? String(v.pipelineId) : text(v.pipelineId, 40);
  if (!id || !KEBAB.test(id) || !pipelineId || !pipelines.has(pipelineId)) return null;
  const m = v.match;
  const p = isObj(m.parameter) && text(m.parameter.name) && typeof m.parameter.value === 'string' ? { name: text(m.parameter.name)!, value: m.parameter.value } : undefined;
  // One reason given as a string is that one reason; anything else that is not a list of strings is left out.
  const reason = typeof m.reason === 'string' ? texts([m.reason]) : texts(m.reason);
  const match = put<VariantRule['match']>({}, { branch: text(m.branch), reason, parameter: p });
  return Object.keys(match).length ? { id, pipelineId, match } : null;
}

function parseOf(v: unknown): TechParse | null {
  if (!isObj(v)) return null;
  if (v.kind === 'wall') return put<TechParse>({ kind: 'wall' }, { unit: text(v.unit) });
  if (v.kind === 'regex' && text(v.pattern)) return put<TechParse>({ kind: 'regex', pattern: text(v.pattern)! }, { unit: text(v.unit) });
  if (v.kind === 'json-sum' && text(v.file) && text(v.field)) return put<TechParse>({ kind: 'json-sum', file: text(v.file)!, field: text(v.field)! }, { unit: text(v.unit), scale: typeof v.scale === 'number' ? v.scale : undefined });
  return null;
}

function metric(v: unknown): TechMetric | null {
  if (!isObj(v)) return null;
  const name = text(v.name, 80);
  const parse = parseOf(v.parse);
  const command = v.command === null ? null : text(v.command, 400);
  if (!name || !parse || command === undefined || (v.direction !== 'up' && v.direction !== 'down')) return null;
  const threshold = typeof v.threshold === 'number' && v.threshold > 0 && v.threshold < 1 ? v.threshold : 0.1;
  return { name, command, parse, direction: v.direction, threshold };
}

function ci(v: unknown): CiConfig {
  const c = isObj(v) ? v : {};
  const pipelines = list(c.pipelines).map(pipeline).filter((p): p is Pipeline => !!p);
  const ids = new Set(pipelines.map((p) => p.id));
  const variants = list(c.variants).map((x) => variant(x, ids)).filter((x): x is VariantRule => !!x);
  return { provider: oneOf(c.provider, ['azure-pipelines', 'gitlab-ci', 'none'] as const, 'none'), pipelines, variants };
}

/** The validated proposal, and how many of the model's probe specs were dropped (unknown kind or bad args). */
export function parseProposal(raw: unknown): { proposal: Proposal; dropped: number } {
  if (!isObj(raw)) throw new ProposalError('the model did not answer with one JSON object');
  const name = text(raw.name, 120);
  if (!name) throw new ProposalError('the proposal names no project');
  const cloud = isObj(raw.cloud) ? raw.cloud : {};
  const hint = isObj(cloud.hint) ? put<{ resourceGroup?: string; name?: string }>({}, { resourceGroup: text(cloud.hint.resourceGroup), name: text(cloud.hint.name) }) : {};
  const rawProbes = list(raw.probes);
  const seen = new Set<string>();
  const probes = rawProbes.map(cleanSpec).filter((s): s is NonNullable<typeof s> => !!s && !seen.has(specKey(s)) && !!seen.add(specKey(s)));
  const proposal: Proposal = {
    name,
    host: host(raw.host),
    components: list(raw.components).map(component).filter((c): c is Component => !!c),
    ci: ci(raw.ci),
    cloud: put<Proposal['cloud']>({ provider: oneOf(cloud.provider, ['azure-app-insights', 'none'] as const, 'none') }, { hint: Object.keys(hint).length ? hint : undefined }),
    metrics: list(raw.metrics).map(metric).filter((m): m is TechMetric => !!m),
    probes,
  };
  return { proposal, dropped: rawProbes.length - probes.length };
}
