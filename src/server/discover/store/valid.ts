// The shape a saved project file must have to be read back. Structural, not semantic: what each line means was proved by
// its probe when it was saved, and the readers (Vitals, the collector) still check the fields they use.
import { PROBE_KINDS, type ProjectConfig } from '@/schemas/vitals';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const optStr = (v: unknown): boolean => v === undefined || typeof v === 'string';
const strs = (v: unknown): boolean => v === undefined || (Array.isArray(v) && v.every((x) => typeof x === 'string'));

const HOSTS = ['azure-devops', 'gitlab', 'github', 'none'];
const CIS = ['azure-pipelines', 'gitlab-ci', 'none'];
const CLOUDS = ['azure-app-insights', 'none'];
const KINDS: readonly string[] = PROBE_KINDS;

const isHost = (h: unknown): boolean => isObj(h) && HOSTS.includes(h.kind as string) && ['org', 'project', 'repo', 'path'].every((k) => optStr(h[k]));

const isComponent = (c: unknown): boolean => isObj(c) && str(c.id) && str(c.path) && typeof c.stack === 'string' && strs(c.tests) && strs(c.build);

const isVariant = (v: unknown): boolean =>
  isObj(v) && str(v.id) && str(v.pipelineId) && isObj(v.match) && optStr(v.match.branch) && strs(v.match.reason) && (v.match.parameter === undefined || (isObj(v.match.parameter) && str(v.match.parameter.name) && typeof v.match.parameter.value === 'string'));

const isCi = (c: unknown): boolean =>
  isObj(c) && CIS.includes(c.provider as string) && Array.isArray(c.pipelines) && c.pipelines.every((p) => isObj(p) && str(p.id) && typeof p.name === 'string' && optStr(p.file)) && Array.isArray(c.variants) && c.variants.every(isVariant);

const isCloud = (c: unknown): boolean =>
  isObj(c) && CLOUDS.includes(c.provider as string) && (c.resource === undefined || (isObj(c.resource) && ['appId', 'name', 'resourceGroup', 'subscription'].every((k) => str((c.resource as Obj)[k]))));

const isProbe = (p: unknown): boolean => isObj(p) && KINDS.includes(p.kind as string) && isObj(p.args) && ['ok', 'fail', 'skipped'].includes(p.status as string) && typeof p.summary === 'string' && str(p.at) && typeof p.ms === 'number';

export function isProjectConfig(v: unknown): v is ProjectConfig {
  if (!isObj(v)) return false;
  return (
    str(v.slug) && str(v.name) && str(v.root) && str(v.onboardedAt) &&
    isObj(v.engine) && str(v.engine.model) && ['low', 'medium', 'high'].includes(v.engine.effort as string) &&
    isHost(v.host) && Array.isArray(v.components) && v.components.every(isComponent) && isCi(v.ci) && isCloud(v.cloud) &&
    (v.runner === undefined || (isObj(v.runner) && strs(v.runner.gates) && Array.isArray(v.runner.gates))) &&
    Array.isArray(v.probes) && v.probes.every(isProbe)
  );
}
