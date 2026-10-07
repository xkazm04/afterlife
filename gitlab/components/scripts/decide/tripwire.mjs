// Tripwire: detect demotion events, let the engine decide (`engine tripwire`), commit tier-state.yml to belay-policy.
// A person's promotion MR is the only way up; this only ever writes the engine's own commit, and only to tier-state.yml.
// Idempotent: each event key is written into the commit message as `Belay-Event: <key>`, and the next run skips keys
// that already appear in the policy repo's recent history.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { api, apiAll, arg, die, gql, need } from '../lib/lib.mjs';
import { detect, eventKey } from '../lib/detect.mjs';
import { engine } from '../lib/engine.mjs';
import { writeFile } from '../lib/repo-write.mjs';

const projectId = process.env.CI_PROJECT_ID ?? die('CI_PROJECT_ID is not set');
const dir = need('policy-dir'); // a clone of belay-policy, depth >= 300
const project = need('policy-project');
const branch = process.env.CI_DEFAULT_BRANCH ?? 'main';
const STATE = 'tier-state.yml';

const log = spawnSync('git', ['-C', dir, 'log', '-n', '300', '--format=%B'], { encoding: 'utf8' });
if (log.status !== 0) die('cannot read the belay-policy history');
const seen = new Set([...log.stdout.matchAll(/^Belay-Event: (.+)$/gm)].map((m) => m[1]));

const events = detect({
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

writeFile({
  project,
  branch: arg('policy-branch', 'main'),
  path: STATE,
  content: fs.readFileSync(path.join(dir, STATE), 'utf8'),
  message,
  exists: true,
  mode: arg('write-mode', 'commit'),
});
console.error(`belay: committed ${STATE} to ${project}`);
if (skipped.length) process.exit(2);
