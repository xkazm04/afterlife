// M1 hand-run step 4 (../../README.md): the gate's ledger events for an MR's current head, derived on the operator's own
// machine from facts GitLab holds, the way belay-apply derives them (../../../apply/sweep.mjs). It never reads a job
// artifact: the target's tier-gate job runs in the agent's own MR pipeline, where a pipeline variable or a CI change
// decides what it emits (F90). It writes nothing to GitLab: apply-gate runs with --dry 1, and the ledger write stays the
// operator's ledger-append.
//   proof      the belay-proof note --proof-authors posted for the current head (step 2), through fetch-block
//   guardrail  the belay-guardrail note --guardrail-authors posted for the current head, schema-checked, through fetch-block.
//              Named on this command line only: BELAY_GUARDRAIL_AUTHORS and every other variable are ignored
//   policy     trust-policy.yml and tier-state.yml as the default branch of --policy-project has them now
//   diff       base to head, from the compare API
// then `engine gate` in the Belay checkout (BELAY_DIR, default the one this script is in), then
// `apply-gate --dry 1 --emit-dir <out>/events --agent --class`. An MR belay-apply would give nothing (another target
// branch, a CI change) or not gate yet (no class, no proof or guardrail verdict for this head) gets no events.
// Usage: CI_PROJECT_ID=<id> node derive-gate.mjs --mr <iid> --proof-authors <you> --guardrail-authors <account>
//          --policy-project <path> --out <new dir> [--agent-prefix ai-]
// Exit 0 = <out>/events written; 3 = nothing to append, the reason on stderr; 2 = a read failed or an input is wrong.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { api, arg, die, enc, need } from '../lib/lib.mjs';
import { engine } from '../lib/engine.mjs';
import { readFile } from '../lib/repo-write.mjs';
import { mrFacts } from './facts.mjs';

const SCRIPTS = path.resolve(import.meta.dirname, '..');
const USERS = /^[A-Za-z0-9_.-]+(,[A-Za-z0-9_.-]+)*$/;
const projectId = process.env.CI_PROJECT_ID ?? die('CI_PROJECT_ID is not set');
const iid = need('mr');
const proofAuthors = need('proof-authors');
const guardrailAuthors = need('guardrail-authors');
const policyProject = need('policy-project');
const out = path.resolve(need('out'));
if (!/^\d+$/.test(iid)) die('--mr is a number');
for (const [flag, v] of [['proof-authors', proofAuthors], ['guardrail-authors', guardrailAuthors]]) if (!USERS.test(v)) die(`--${flag} is a comma-separated list of usernames`);
if (fs.existsSync(out) && fs.readdirSync(out).length) die(`${out} is not empty: give a new directory, so no earlier head's events are appended`);
fs.mkdirSync(out, { recursive: true });
process.env.BELAY_DIR ??= path.resolve(SCRIPTS, '..', '..', '..');

const at = (f) => path.join(out, f);
const nothing = (why) => {
  console.error(`belay: no events for !${iid}: ${why}. Append nothing.`);
  process.exit(3);
};
/** A glue script of this checkout, with the operator's environment minus any write token. */
function glue(script, args, env = {}) {
  const inherited = { ...process.env };
  for (const k of ['BELAY_BOT_TOKEN', 'BELAY_POLICY_TOKEN', 'BELAY_LEDGER_TOKEN', 'BELAY_DISPATCH_TOKEN']) delete inherited[k];
  const r = spawnSync(process.execPath, [path.join(SCRIPTS, script), ...args], { cwd: out, encoding: 'utf8', env: { ...inherited, ...env }, maxBuffer: 64 << 20 });
  if (r.stderr) process.stderr.write(r.stderr);
  return r.status ?? 2;
}

let facts;
try {
  facts = mrFacts(projectId, iid);
} catch (e) {
  die(`a read failed, nothing written: ${String(e.message ?? e).split('\n')[0]}`);
}
const { project, head, base, diff, refusal } = facts;
if (refusal) nothing(`${refusal}: belay-apply gives it nothing, a person reviews it`);
if (!project?.web_url) die(`GitLab's answer for project ${projectId} has no web_url`);

const ctx = glue('proof/mr-context.mjs', ['--mr', iid, '--agent-prefix', arg('agent-prefix', 'ai-'), '--out', at('mr.env')]);
if (ctx === 10) nothing('it is not an agent MR with a Belay-Task trailer');
if (ctx !== 0) die(`mr-context exited ${ctx}`);
const mr = Object.fromEntries(fs.readFileSync(at('mr.env'), 'utf8').split('\n').filter(Boolean).map((l) => l.split(/=(.*)/s).slice(0, 2)));
if (mr.BELAY_HEAD_SHA !== head || mr.BELAY_BASE_SHA !== base) die('the MR moved while it was being read: run it again');
if (!mr.BELAY_ACTION_CLASS) nothing('the MR has no Belay-Class trailer');

let policy;
try {
  const branch = api(`projects/${enc(policyProject)}`)?.default_branch;
  if (!branch) throw new Error(`${policyProject} has no default branch`);
  policy = Object.fromEntries(['trust-policy.yml', 'tier-state.yml'].map((f) => {
    const text = readFile(policyProject, f, branch);
    if (text === null) throw new Error(`${policyProject} has no ${f} on ${branch}`);
    fs.writeFileSync(at(f), text);
    return [f, at(f)];
  }));
} catch (e) {
  die(`a read failed, nothing written: ${String(e.message ?? e).split('\n')[0]}`);
}

const proof = glue('proof/fetch-block.mjs', ['--mr', iid, '--tag', 'belay-proof', '--authors', proofAuthors, '--head-sha', head, '--out', at('proof.json')]);
if (proof === 3) nothing(`no belay-proof note by ${proofAuthors} for head ${head.slice(0, 8)}: post the proof first (steps 1 and 2)`);
if (proof !== 0) nothing(`the belay-proof note for this head cannot be read (fetch-block exited ${proof})`);
const gr = glue('proof/fetch-block.mjs', ['--mr', iid, '--tag', 'belay-guardrail', '--authors', guardrailAuthors, '--head-sha', head,
  '--schema', path.join(SCRIPTS, '..', '..', 'flows', 'schemas', 'guardrail-verdict.schema.json'), '--out', at('guardrail.json'), '--gate-out', at('guardrail-gate.json')]);
if (gr === 3) nothing(`no belay-guardrail verdict by ${guardrailAuthors} for head ${head.slice(0, 8)}: the ledger line waits`);
if (gr === 4) nothing('the guardrail verdict does not match its schema, or its note carries two of them: inconclusive, the gate blocks and ledgers nothing');
if (gr !== 0) die(`reading the guardrail verdict failed (fetch-block exited ${gr})`);

fs.writeFileSync(at('diff.patch'), diff);
const g = engine(['gate', '--policy', policy['trust-policy.yml'], '--state', policy['tier-state.yml'], '--class', mr.BELAY_ACTION_CLASS, '--agent', mr.BELAY_AGENT,
  '--proof', at('proof.json'), '--guardrail', at('guardrail-gate.json'), '--diff', at('diff.patch')]);
fs.writeFileSync(at('decision.json'), g.stdout);
let decided = null;
try {
  decided = JSON.parse(g.stdout);
} catch {
  decided = null;
}
if (typeof decided?.decision !== 'string') die(`engine gate gave no decision (exit ${g.code}): see its message above`);

const applied = glue('decide/apply-gate.mjs', ['--mr', iid, '--sha', head, '--decision', at('decision.json'), '--guardrail', at('guardrail.json'),
  '--agent', mr.BELAY_AGENT, '--class', mr.BELAY_ACTION_CLASS, '--emit-dir', at('events'), '--dry', '1'], { CI_PROJECT_ID: String(projectId), CI_PROJECT_URL: project.web_url });
if (applied > 1) die(`apply-gate exited ${applied}`);
if (!fs.existsSync(at('events'))) nothing(`the gate says ${decided.decision} and emits no events`);
const events = fs.readdirSync(at('events')).sort();
console.error(`belay: !${iid} head ${head}: gate ${decided.decision} at tier ${decided.tier ?? '?'}. ${events.length} event(s) in ${at('events')}: ${events.join(', ')}. Append them with ledger-append.`);
