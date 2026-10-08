// A .gitlab-ci.yml (or CI lint's merged YAML) read into jobs and includes. Pure: the caller supplies the parsed YAML and,
// for a checkout, a way to open local includes.
import { isRecord } from '../core/types';
import type { CiConfig, CiJob } from './facts';

const RESERVED = new Set(['stages', 'include', 'variables', 'workflow', 'default', 'image', 'services', 'cache', 'before_script', 'after_script', 'spec']);

const lines = (v: unknown): string[] => (Array.isArray(v) ? v.flatMap(lines) : typeof v === 'string' ? [v] : []);

function job(name: string, v: Record<string, unknown>): CiJob {
  const reports = isRecord(v.artifacts) && isRecord(v.artifacts.reports) ? v.artifacts.reports : {};
  return {
    name,
    stage: typeof v.stage === 'string' ? v.stage : null,
    script: [...lines(v.before_script), ...lines(v.script), ...lines(v.after_script)].join('\n'),
    junit: reports.junit !== undefined,
    release: v.release !== undefined,
    sbom: reports.cyclonedx !== undefined,
  };
}

type Include = { kind: 'local' | 'named' | 'unresolved'; ref: string };

function includesOf(v: unknown): Include[] {
  const list = Array.isArray(v) ? v : v === undefined ? [] : [v];
  return list.flatMap((i): Include[] => {
    if (typeof i === 'string') return [i.startsWith('http') ? { kind: 'unresolved', ref: i } : { kind: 'local', ref: i }];
    if (!isRecord(i)) return [];
    if (typeof i.local === 'string') return [{ kind: 'local', ref: i.local }];
    if (typeof i.template === 'string') return [{ kind: 'named', ref: i.template }];
    if (typeof i.component === 'string') return [{ kind: 'named', ref: i.component.replace(/^\$CI_SERVER_FQDN\//, '') }];
    if (typeof i.project === 'string') return [{ kind: 'unresolved', ref: `${i.project}:${lines(i.file).join(',')}` }];
    if (typeof i.remote === 'string') return [{ kind: 'unresolved', ref: i.remote }];
    return [];
  });
}

/**
 * Reads a parsed CI document. `open(path)` returns a local include's parsed YAML, or undefined when the file is not in
 * the checkout (then it counts as unresolved). Local includes nest up to 10 deep, each file once.
 */
export function readCi(doc: unknown, origin: string, open?: (path: string) => unknown): CiConfig {
  const out: CiConfig = { origin, jobs: [], includes: [], unresolved: [] };
  const seen = new Set<string>();
  const walk = (d: unknown, depth: number): void => {
    if (!isRecord(d)) return;
    for (const [name, v] of Object.entries(d)) {
      if (RESERVED.has(name) || name.startsWith('.') || !isRecord(v)) continue;
      if (v.script !== undefined || v.trigger !== undefined || v.extends !== undefined || v.release !== undefined) out.jobs.push(job(name, v));
    }
    for (const inc of includesOf(d.include)) {
      if (inc.kind === 'named') out.includes.push(inc.ref);
      else if (inc.kind === 'unresolved') out.unresolved.push(inc.ref);
      else if (!seen.has(inc.ref) && depth < 10) {
        seen.add(inc.ref);
        const sub = open?.(inc.ref.replace(/^\//, ''));
        if (sub === undefined) out.unresolved.push(inc.ref);
        else walk(sub, depth + 1);
      }
    }
  };
  walk(doc, 0);
  return out;
}
