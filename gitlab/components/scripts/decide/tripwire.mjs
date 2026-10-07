// Tripwire: detect demotion events, let the engine decide (`engine tripwire`), commit tier-state.yml to belay-policy.
// A person's promotion MR is the only way up; this only ever writes the engine's own commit, and only to tier-state.yml.
// Idempotent: each event key is written into the commit message as `Belay-Event: <key>`, and the next run skips keys
// that already appear in the policy repo's recent history. The commit never lands over a newer tier-state.yml: GitLab's copy
// must still be the one the engine computed from, and the commit names its last_commit_id, so GitLab refuses it if the
// file moves in between (an operator's revoke, another tripwire). Exit 3: refused as stale, nothing committed.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { api, apiAll, arg, CLASS_ID, die, gql, need } from '../lib/lib.mjs';
import { detect, eventKey, trailerClass } from '../lib/detect.mjs';
import { engine } from '../lib/engine.mjs';
import { fileHead, readFile, writeFile } from '../lib/repo-write.mjs';

const projectId = process.env.CI_PROJECT_ID ?? die('CI_PROJECT_ID is not set');
const dir = need('policy-dir'); // a clone of belay-policy, depth >= 300
const project = need('policy-project');
const branch = process.env.CI_DEFAULT_BRANCH ?? 'main';
const STATE = 'tier-state.yml';

const log = spawnSync('git', ['-C', dir, 'log', '-n', '300', '--format=%B'], { encoding: 'utf8' });
if (log.status !== 0) die('cannot read the belay-policy history');
// Whole lines only: with /m, ^ also starts after U+2028 or U+2029 inside one line (a revoke's one-line reason), and a key
// there would make the run skip an event that was never recorded.
const seen = new Set(log.stdout.split('\n').flatMap((l) => /^Belay-Event: (.+)$/.exec(l.replace(/\r$/, ''))?.slice(1, 2) ?? []));
/** tier-state.yml as cloned: what every engine decision below starts from. */
const base = fs.readFileSync(path.join(dir, STATE), 'utf8');

/**
 * `--ledger-project p [--ledger-branch b]`: an MR's class is the one belay-apply's gate decided on, from the bot's own
 * ledger lines for that MR (their action_class; the last one counts), not the Belay-Class trailer, which the agent can
 * edit after the merge to move a demotion onto another class or onto none (F64). An MR the engine never gated (a forced
 * wait or block) has no such line: its trailer is all there is. An unreadable ledger decides nothing.
 */
function ledgerClasses(project, ledgerBranch) {
  const file = `events/${projectId}.jsonl`;
  let text;
  try {
    text = readFile(project, file, ledgerBranch);
  } catch (e) {
    die(`cannot read ${file} from ${project} (${e.message}): no demotion is decided without it`);
  }
  const gated = new Map();
  for (const line of String(text ?? '').split('\n')) {
    let e;
    try {
      e = line.trim() ? JSON.parse(line) : null;
    } catch {
      continue;
    }
    const s = e?.subject;
    if (s?.type === 'mr' && String(s.project_id) === String(projectId) && CLASS_ID.test(String(e.action_class ?? ''))) gated.set(String(s.iid), e.action_class);
  }
  return (mr) => gated.get(String(mr.iid)) ?? trailerClass(mr);
}
const classOf = arg('ledger-project') ? ledgerClasses(arg('ledger-project'), arg('ledger-branch', 'main')) : undefined;

const events = detect({
  classOf,
  api,
  apiAll,
  gql,
  projectId,
  branch,
  now: Date.now(),
  lookbackHours: Number(arg('lookback-hours', '24')),
  prefix: arg('agent-prefix', 'ai-'),
  guardrailAuthors: need('guardrail-authors'),
  headSha: arg('mode') === 'event' ? process.env.CI_COMMIT_SHA : null,
  // Never read as a finished pipeline: a sweep's own is the schedule's, still running; event mode reads its proof jobs.
  ownPipelineId: process.env.CI_PIPELINE_ID ?? null,
}).filter((e) => !seen.has(eventKey(e)));
console.error(`belay: ${events.length} new demotion event(s)`);

const keys = [];
const messages = [];
const skipped = [];
for (const [i, e] of events.entries()) {
  const eventFile = path.join(dir, `.event-${i}.json`);
  fs.writeFileSync(eventFile, JSON.stringify(e));
  const r = engine(['tripwire', '--policy', path.join(dir, 'trust-policy.yml'), '--state', path.join(dir, STATE), '--event', eventFile]);
  fs.rmSync(eventFile);
  let out;
  try {
    out = JSON.parse(r.stdout);
  } catch {
    out = { error: 'no JSON from the engine' };
  }
  if (r.code !== 0 || out.error) {
    skipped.push(`${eventKey(e)}: ${out.error ?? `exit ${r.code}`}`); // e.g. tier-state has no record for this agent and class
    continue;
  }
  keys.push(eventKey(e));
  if (!out.commit) continue;
  if (out.commit.path !== STATE) die(`engine wants to write ${out.commit.path}: only ${STATE} is allowed`);
  fs.writeFileSync(path.join(dir, STATE), out.commit.content);
  messages.push(String(out.commit.message).split('\n')[0]);
}
if (skipped.length) console.error(`belay: ${skipped.length} event(s) skipped:\n  ${skipped.join('\n  ')}`);
if (messages.length === 0) {
  // An event that moves no tier leaves no commit, so it is simply re-evaluated (harmlessly) on the next sweep.
  console.error('belay: no tier moved; nothing to commit');
  process.exit(skipped.length ? 2 : 0);
}
const message = [`tripwire: ${messages.length} demotion(s)`, '', ...messages.map((m) => `- ${m}`), '', ...keys.map((k) => `Belay-Event: ${k}`)].join('\n');
// Writes may use a different token from reads (BELAY_POLICY_TOKEN / BELAY_LEDGER_TOKEN, named by --write-token-var).
const writeToken = process.env[arg('write-token-var', 'BELAY_BOT_TOKEN')];
if (writeToken) process.env.GITLAB_TOKEN = writeToken;

const policyBranch = arg('policy-branch', 'main');
let head;
try {
  head = fileHead(project, STATE, policyBranch);
} catch (e) {
  die(`cannot read ${STATE} and its last commit from ${project} (${e.message}): nothing committed`);
}
if (!head) die(`cannot read ${STATE} and its last commit from ${project}: nothing committed`);
if (head.content !== base) {
  die(`${STATE} in ${project} changed since it was cloned (a revoke, or another tripwire): not writing over it. Nothing committed; the next run starts from the new one.`, 3);
}
try {
  writeFile({
    project,
    branch: policyBranch,
    path: STATE,
    content: fs.readFileSync(path.join(dir, STATE), 'utf8'),
    message,
    exists: true,
    mode: arg('write-mode', 'commit'),
    lastCommitId: head.lastCommitId,
  });
} catch {
  // glab printed GitLab's answer above: a 400 here is the file moving since it was read (last_commit_id).
  die(`${project} refused the commit of ${STATE} (see GitLab's answer above): nothing committed; the next run tries again.`, 3);
}
console.error(`belay: committed ${STATE} to ${project}`);
if (skipped.length) process.exit(2);
