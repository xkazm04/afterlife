// Builds the `engine prove --input` file for one proof class from facts GitLab holds. The input shapes follow
// engine/proofs/* as of 2026-10-06 (exploitTest.ts, citedDiff.ts, rerunStats.ts); the engine owns them, so a change
// there needs a change here. Other classes are engine stubs today and are refused.
// Environment (set by the proof-engine component): BELAY_MR_IID BELAY_TASK_ID BELAY_ACTION_CLASS BELAY_DIFF_FILE.
//   exploit-test : --base-junit f --head-junit f [--base-ref url --head-ref url] [--rescan-base f --rescan-head f]
//                  (claims come from the belay-claims block in the MR description; rescan files are
//                  {"engine_version": "...", "finding_ids": [...]})
//   cited-diff   : --verdict f   (the belay-guardrail block, from fetch-block)
//   rerun-stats  : --verdict f   (the belay-medic block; the runs are read from the jobs API)
import fs from 'node:fs';
import path from 'node:path';
import { api, apiAll, arg, blocks, die, need } from '../lib/lib.mjs';
import { validate } from '../lib/validate.mjs';

const env = process.env;
const cls = need('class');
const out = arg('out', 'belay-evidence.json');
const projectId = env.CI_PROJECT_ID ?? die('CI_PROJECT_ID is not set');
const task = (flow) => ({ flow, run_id: `pipeline-${env.CI_PIPELINE_ID}`, project_id: Number(projectId), mr_iid: Number(env.BELAY_MR_IID), trailer: `Belay-Task: ${env.BELAY_TASK_ID}` });
const file = (f) => ({ $file: path.resolve(f) }); // the engine inlines the file's text
const json = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const optFile = (flag) => (arg(flag) && fs.existsSync(arg(flag)) ? file(arg(flag)) : undefined);
const diff = env.BELAY_DIFF_FILE ? file(env.BELAY_DIFF_FILE) : undefined;

let input;
if (cls === 'exploit-test') {
  const m = api(`projects/${projectId}/merge_requests/${env.BELAY_MR_IID}`);
  const block = blocks(m.description, 'belay-claims').at(-1);
  if (!block) die('the MR description has no belay-claims block', 2);
  const schema = json(path.join(env.BELAY_DIR ?? '.', 'gitlab/flows/schemas/claims.schema.json'));
  const problems = validate(block, schema);
  if (problems.length) die(`belay-claims block is invalid: ${problems.slice(0, 5).join('; ')}`, 2);
  const ids = new Set(block.claims.map((c) => c.id));
  const claim_ids = {};
  for (const [check, id] of [['base-red', 'base-red'], ['names-vector', 'base-red'], ['head-green', 'head-green'], ['same-test-id', 'head-green'], ['test-not-weakened', 'test-not-weakened'], ['finding-closed', 'finding-closed']]) {
    if (ids.has(id)) claim_ids[check] = id;
  }
  const side = (w) => ({ junit: optFile(`${w}-junit`), trace: optFile(`${w}-trace`), job_ref: arg(`${w}-ref`) });
  const rescan = optFile('rescan-base') && optFile('rescan-head')
    ? { finding_id: String(block.finding?.id ?? ''), base: json(arg('rescan-base')), head: json(arg('rescan-head')) }
    : undefined;
  input = { task: task('patcher'), action_class: env.BELAY_ACTION_CLASS, claims: block.claims, claim_ids, test_id: block.test?.id, vector: block.test?.markers, base: side('base'), head: side('head'), diff, rescan };
} else if (cls === 'cited-diff') {
  const v = json(need('verdict'));
  const claims = (v.findings ?? []).map((f, i) => ({ id: `f${i + 1}`, text: `${f.rule} (${f.severity}): ${f.explanation}`, quote: { file: f.file, text: f.quote } }));
  input = { task: task('guardrail'), claims, diff };
} else if (cls === 'rerun-stats') {
  const v = json(need('verdict'));
  if (!v.job) die('the belay-medic block names no job', 2);
  const runs = [];
  for (const p of apiAll(`projects/${projectId}/pipelines?sha=${v.sha}`, 2)) {
    for (const j of apiAll(`projects/${projectId}/pipelines/${p.id}/jobs`, 2)) {
      if (j.name === v.job) runs.push({ job_id: String(j.id), sha: j.pipeline?.sha ?? v.sha, status: j.status, failure_reason: j.failure_reason });
    }
  }
  const mapped = { flaky: 'flake', real: 'real-failure' }[v.classification];
  input = { task: task('medic'), sha: v.sha, job: v.job, claims: [{ id: 'm1', text: `${v.job} is ${v.classification} on ${v.sha.slice(0, 12)}` }], ...(mapped ? { claim: { classification: mapped } } : {}), runs };
} else {
  die(`no evidence builder for ${cls}: the engine has no real checker for it yet`, 2);
}
fs.writeFileSync(out, JSON.stringify(input, null, 2));
console.error(`belay: wrote ${out} for ${cls}`);
