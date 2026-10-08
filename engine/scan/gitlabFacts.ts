// Facts from GitLab: the belay.facts/0 file that collect-facts.mjs writes in the maturity-scan job. Each fact there is
// its data or { error }; an error stays "not read". Shapes are [R] from the GitLab API docs (see components/README.md).
import { parse as parseYaml } from 'yaml';
import { EngineError, isRecord } from '../core/types';
import { readCi } from './ci';
import { known, unread, type Fact, type ScanFacts } from './facts';

type Rec = Record<string, unknown>;

function take<T>(facts: Rec, name: string, read: (v: unknown) => T): Fact<T> {
  const v = facts[name];
  if (v === undefined) return unread(`${name} was not collected`);
  if (isRecord(v) && typeof v.error === 'string') return unread(`${name} could not be read: ${v.error}`);
  try {
    return known(read(v));
  } catch (e) {
    return unread(`${name} has an unexpected shape: ${(e as Error).message}`);
  }
}

const list = (v: unknown): unknown[] => {
  if (!Array.isArray(v)) throw new Error('not a list');
  return v;
};

export function gitlabFacts(doc: unknown): ScanFacts {
  if (!isRecord(doc) || doc.schema !== 'belay.facts/0' || !isRecord(doc.facts)) throw new EngineError('facts must be a belay.facts/0 document');
  const f = doc.facts;
  const project = isRecord(f.project) && typeof f.project.path === 'string' ? f.project.path : null;
  const branch = isRecord(f.project) && typeof f.project.default_branch === 'string' ? f.project.default_branch : 'main';
  const owners = take(f, 'codeowners', (v) => list(v).filter((x): x is string => typeof x === 'string'));
  const duo = take(f, 'duo_agent_config', (v) => v === true);
  return {
    source: 'gitlab',
    project,
    files: owners.ok
      ? known(Object.fromEntries([...owners.value.map((p) => [p, null]), ...(duo.ok && duo.value ? [['.gitlab/duo/agent-config.yml', null]] : [])]))
      : unread(owners.why),
    ci: take(f, 'ci_config', (v) => {
      if (!isRecord(v) || typeof v.merged_yaml !== 'string') throw new Error('no merged_yaml');
      return readCi(parseYaml(v.merged_yaml, { logLevel: 'error' }) as unknown, 'CI lint (merged)');
    }),
    pipeline: take(f, 'latest_pipeline_jobs', (v) => {
      if (!isRecord(v)) throw new Error('not an object');
      const jobs = list(v.jobs).filter(isRecord).map((j) => ({ name: String(j.name), status: String(j.status) }));
      return { id: typeof v.pipeline === 'number' ? v.pipeline : null, jobs };
    }),
    protection: take(f, 'protected_branches', (v) => ({ defaultProtected: list(v).some((b) => isRecord(b) && b.name === branch) })),
    approvals: take(f, 'approval_rules', (v) => list(v).filter((r) => isRecord(r) && typeof r.approvals_required === 'number' && r.approvals_required > 0).length),
  };
}
