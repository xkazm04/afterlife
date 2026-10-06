// Reads the merge request this pipeline is for and writes a sourceable env file with the few facts the
// components need. Every value is checked against a strict shape first, so the file is safe to `.` source.
// Exit 0 = written, 10 = not a Belay MR (no valid Belay-Task trailer, or not an agent account): skip quietly.
// Reads only, so the job token is enough (docs.gitlab.com/ci/jobs/ci_job_token: MR GET endpoints are allowed).
import fs from 'node:fs';
import { api, arg, CLASS_ID, die, need, trailer, ULID } from '../lib/lib.mjs';

const projectId = process.env.CI_PROJECT_ID ?? die('CI_PROJECT_ID is not set');
const commit = arg('commit'); // post-merge: find the MR that put this commit on the default branch
const mr = commit
  ? String((api(`projects/${projectId}/repository/commits/${commit}/merge_requests`) ?? []).find((x) => x.state === 'merged')?.iid ?? '')
  : need('mr');
if (!mr) {
  console.error(`belay: no merged MR for commit ${commit}: skipping`);
  process.exit(10);
}
const prefix = arg('agent-prefix', 'ai-');
const out = arg('out', '.belay/mr.env');

const m = api(`projects/${projectId}/merge_requests/${mr}`);
const task = trailer(m.description, 'Belay-Task', ULID);
const author = m.author?.username ?? '';
if (!task || !author.startsWith(prefix)) {
  console.error(`belay: MR !${mr} is not a Belay task (author ${author || '?'}, trailer ${task ?? 'none'}): skipping`);
  process.exit(10);
}
const klass = trailer(m.description, 'Belay-Class', CLASS_ID) ?? '';
const base = String(m.diff_refs?.base_sha ?? '');
const head = String(m.diff_refs?.head_sha ?? m.sha ?? '');
if (!/^[0-9a-f]{40}$/.test(head) || !/^[0-9a-f]{40}$/.test(base)) die('MR has no usable diff_refs');

fs.mkdirSync(out.replace(/[^/\\]*$/, '') || '.', { recursive: true });
fs.writeFileSync(
  out,
  [
    `BELAY_MR_IID=${Number(mr)}`,
    `BELAY_TASK_ID=${task}`,
    `BELAY_ACTION_CLASS=${klass}`,
    `BELAY_AGENT=${author.replace(/[^A-Za-z0-9_.-]/g, '')}`,
    `BELAY_BASE_SHA=${base}`,
    `BELAY_HEAD_SHA=${head}`,
    '',
  ].join('\n'),
);
console.error(`belay: MR !${mr} task ${task} class ${klass || '(none)'} agent ${author}`);
