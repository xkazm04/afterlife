// Collects the read-only facts the maturity scan scores from. Each fact is either its data or { error }:
// a fact that could not be read is recorded as unknown, never as absent, so the engine can say "inconclusive".
// Every endpoint here is [R] unless noted; see components/README.md.
import fs from 'node:fs';
import { api, apiAll, arg, die, enc, httpStatus } from '../lib/lib.mjs';

const id = process.env.CI_PROJECT_ID ?? die('CI_PROJECT_ID is not set');
const branch = process.env.CI_DEFAULT_BRANCH ?? 'main';
const facts = {};

function take(name, read) {
  try {
    facts[name] = read();
  } catch (e) {
    facts[name] = { error: String(e.message ?? e).split('\n')[0] };
  }
}

const exists = (path) => {
  try {
    api(`projects/${id}/repository/files/${enc(path)}?ref=${enc(branch)}`);
    return true;
  } catch (e) {
    if (httpStatus(e) === 404) return false;
    throw e; // unreadable is unknown, never absent: take() records it as {error}
  }
};

take('project', () => {
  const p = api(`projects/${id}`);
  // web_url: every lit cell cites a GitLab object under it; merge_requires_pipeline decides R3 ("failing it blocks a merge")
  return {
    path: p.path_with_namespace, default_branch: p.default_branch, visibility: p.visibility, web_url: p.web_url,
    merge_requires_pipeline: p.only_allow_merge_if_pipeline_succeeds,
  };
});
take('ci_config', () => api(`projects/${id}/ci/lint?include_jobs=true`)); // merged YAML and jobs [R?]
take('protected_branches', () => api(`projects/${id}/protected_branches`));
take('environments', () => api(`projects/${id}/environments`));
take('approval_rules', () => api(`projects/${id}/approval_rules`));
take('schedules', () => api(`projects/${id}/pipeline_schedules`));
take('codeowners', () => ['CODEOWNERS', '.gitlab/CODEOWNERS', 'docs/CODEOWNERS'].filter(exists));
take('duo_agent_config', () => exists('.gitlab/duo/agent-config.yml'));
take('issue_templates', () => {
  try {
    return api(`projects/${id}/repository/tree?path=${enc('.gitlab/issue_templates')}&ref=${enc(branch)}&per_page=100`).filter((e) => e.type === 'blob').map((e) => e.name);
  } catch (e) {
    if (httpStatus(e) === 404) return []; // no templates folder on the default branch
    throw e;
  }
});
take('latest_pipeline_jobs', () => {
  const [p] = api(`projects/${id}/pipelines?ref=${enc(branch)}&status=success&order_by=id&sort=desc&per_page=1`) ?? [];
  if (!p) return { pipeline: null, jobs: [] };
  // R2 is "ran in the last 14 days and produced an artifact": a job's finish time and artifact types, and its URL as evidence
  const jobs = apiAll(`projects/${id}/pipelines/${p.id}/jobs`, 2).map((j) => ({
    id: j.id, name: j.name, stage: j.stage, status: j.status, web_url: j.web_url, finished_at: j.finished_at ?? null,
    artifacts: (j.artifacts ?? []).map((a) => a.file_type),
  }));
  return { pipeline: { id: p.id, web_url: p.web_url, created_at: p.created_at }, jobs };
});

fs.writeFileSync(arg('out', 'facts.json'), JSON.stringify({ schema: 'belay.facts/0', project_id: Number(id), at: new Date().toISOString(), facts }, null, 2));
console.error(`belay: ${Object.keys(facts).length} facts, ${Object.values(facts).filter((v) => v?.error).length} unreadable`);
