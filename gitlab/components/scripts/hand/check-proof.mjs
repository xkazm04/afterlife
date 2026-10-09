// M1 hand-run step 1 (../../README.md): fetches the target's report-only Proof Block from its belay-proof-<class> job and
// writes it to --out only when the operator may post it. The proof was made in the agent's own MR pipeline, so it is
// posted only where belay-apply would take that pipeline's evidence (F90's step 1):
//   - the MR targets the default branch (F78) and changes no CI configuration: the CI file, .gitlab/ and every local
//     include, failing closed on an include it cannot resolve (F68, ../../../apply/ci-touch.mjs);
//   - the job is a belay-proof-* job of a merge request pipeline of the MR's current head, and that pipeline ran with no
//     pipeline variables (F63: a variable outranks the job's own);
//   - the proof's verdict is pass, and its task.head_sha is the MR's current head.
// Reads only, with the operator's glab login. --out is removed first, so a refusal leaves nothing to post.
// Usage: CI_PROJECT_ID=<id> node check-proof.mjs --mr <iid> --job <job id> --out <dir>/proof.json
// Exit 0 = written; 1 = post nothing, the MR waits for a person (the reasons on stderr); 2 = a read failed.
import fs from 'node:fs';
import { api, die, need, plain } from '../lib/lib.mjs';
import { mrFacts } from './facts.mjs';

const projectId = process.env.CI_PROJECT_ID ?? die('CI_PROJECT_ID is not set');
const iid = need('mr');
const job = need('job');
const out = need('out');
if (!/^\d+$/.test(job) || !/^\d+$/.test(iid)) die('--mr and --job are numbers');
fs.rmSync(out, { force: true });

try {
  const { head, refusal } = mrFacts(projectId, iid);
  const no = refusal ? [refusal] : [];
  const j = api(`projects/${projectId}/jobs/${job}`);
  if (!String(j?.name ?? '').startsWith('belay-proof-')) no.push(`job ${job} is ${plain(j?.name ?? '?')}, not a belay-proof-<class> job`);
  const pid = j?.pipeline?.id;
  if (!Number.isSafeInteger(pid)) throw new Error(`job ${job} names no pipeline`);
  const p = api(`projects/${projectId}/pipelines/${pid}`);
  if (p?.sha !== head) no.push(`pipeline ${pid} ran for ${String(p?.sha).slice(0, 8)}, not the MR's current head ${head.slice(0, 8)}`);
  if (p?.source !== 'merge_request_event') no.push(`pipeline ${pid} is a ${plain(p?.source ?? '?')} pipeline, not a merge request pipeline`);
  const vars = api(`projects/${projectId}/pipelines/${pid}/variables`);
  if (!Array.isArray(vars)) throw new Error(`the variables of pipeline ${pid} could not be read`);
  if (vars.length) no.push(`pipeline ${pid} ran with ${vars.length} pipeline variable(s), which can change what its jobs ran`);
  const text = api(`projects/${projectId}/jobs/${job}/artifacts/.belay/proof.json`, { raw: true });
  let proof = null;
  try {
    proof = JSON.parse(text);
  } catch {
    proof = null;
  }
  if (proof?.schema !== 'belay.proof/1') no.push('the artifact is not a belay.proof/1 block');
  else {
    if (proof.verdict !== 'pass') no.push(`the proof's verdict is ${plain(proof.verdict)}, not pass`);
    if (proof.task?.head_sha !== head) no.push(`the proof is for ${plain(String(proof.task?.head_sha).slice(0, 8))}, not the MR's current head ${head.slice(0, 8)}: stale`);
  }
  if (no.length) {
    console.error(`belay: post nothing on !${iid}; it waits for a person:\n  - ${no.join('\n  - ')}`);
    process.exit(1);
  }
  fs.writeFileSync(out, text);
  console.error(`belay: !${iid} head ${head}: proof pass, pipeline ${pid} with no variables, no CI change. Written to ${out}: post it (step 2).`);
} catch (e) {
  die(`a read failed, nothing written: ${String(e.message ?? e).split('\n')[0]}`);
}
