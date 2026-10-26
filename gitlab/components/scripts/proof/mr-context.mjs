// Reads the merge request this pipeline is for and writes a sourceable env file with the few facts the
// components need. Every value is checked against a strict shape first, so the file is safe to `.` source.
// Exit 0 = written, 10 = not an Afterlife MR (no valid Belay-Task trailer, or not an agent account): skip quietly.
// Reads only, so the job token is enough (docs.gitlab.com/ci/jobs/ci_job_token: MR GET endpoints are allowed).
import fs from 'node:fs';
import { api, arg, CLASS_ID, die, need, trailer, ULID } from '../lib/lib.mjs';

const projectId = process.env.CI_PROJECT_ID ?? die('CI_PROJECT_ID is not set');
const commit = arg('commit'); // post-merge: find the MR that put this commit on the default branch
const mr = commit
  ? String((api(`projects/${projectId}/repository/commits/${commit}/merge_requests`) ?? []).find((x) => x.state === 'merged')?.iid ?? '')
  : need('mr');
if (!mr) {
  console.error(`afterlife: no merged MR for commit ${commit}: skipping`);
  process.exit(10);
}
const prefix = arg('agent-prefix', 'ai-');
const out = arg('out', '.belay/mr.env'); // wire name: the templates source this artifact path

const m = api(`projects/${projectId}/merge_requests/${mr}`);
const task = trailer(m.description, 'Belay-Task', ULID);
const author = m.author?.username ?? '';
if (!task || !author.startsWith(prefix)) {
  console.error(`afterlife: MR !${mr} is not an Afterlife task (author ${author || '?'}, trailer ${task ?? 'none'}): skipping`);
  process.exit(10);
}
const klass = trailer(m.description, 'Belay-Class', CLASS_ID) ?? '';
const base = String(m.diff_refs?.base_sha ?? '');
const head = String(m.diff_refs?.head_sha ?? m.sha ?? '');
if (!/^[0-9a-f]{40}$/.test(head) || !/^[0-9a-f]{40}$/.test(base)) die('MR has no usable diff_refs');

fs.mkdirSync(out.replace(/[^/\\]*$/, '') || '.', { recursive: true });
// Each value as AFTERLIFE_<key> and, for one deprecation window, BELAY_<key>: a template pinned before the rename sources
// this file for the BELAY_ names; a newer one reads ${AFTERLIFE_X:-$BELAY_X}.
const values = { MR_IID: Number(mr), TASK_ID: task, ACTION_CLASS: klass, AGENT: author.replace(/[^A-Za-z0-9_.-]/g, ''), BASE_SHA: base, HEAD_SHA: head };
const lines = ['AFTERLIFE', 'BELAY'].flatMap((name) => Object.entries(values).map(([k, v]) => `${name}_${k}=${v}`));
fs.writeFileSync(out, [...lines, ''].join('\n'));
console.error(`afterlife: MR !${mr} task ${task} class ${klass || '(none)'} agent ${author}`);
