// belay-apply's tripwire sweep: for each target of the paired group, the components' tripwire.mjs in sweep mode, run here
// rather than in the target's own pipelines, so BELAY_POLICY_TOKEN (and the bot token that reads the target's pipelines) is
// never given to a pipeline whose code an agent writes (F4). Each target starts from a fresh clone of belay-policy: the
// last target's commit is then in its history, its Belay-Event keys are skipped, and a refused commit (exit 3) leaves no
// local edit behind for the next target. tripwire.mjs is idempotent by those keys, so a second sweep commits nothing.
// Without BELAY_BOT_TOKEN and BELAY_POLICY_TOKEN it only reports.
//
// Usage: node tripwire-sweep.mjs --config apply.json [--policy-remote <url|path>] [--work .belay]
import fs from 'node:fs';
import path from 'node:path';
import { api, arg, need } from '../components/scripts/lib/lib.mjs';
import { clonePolicy, glue, loadConfig, targetsOf } from './lib.mjs';

const cfg = loadConfig(need('config'));
const work = path.resolve(arg('work', '.belay'));
const say = (m) => console.error(`belay-apply tripwire: ${m}`);
if (!process.env.BELAY_BOT_TOKEN || !process.env.BELAY_POLICY_TOKEN) {
  say('BELAY_BOT_TOKEN and BELAY_POLICY_TOKEN are not both set: reporting only, no target is swept');
  process.exit(0);
}
fs.mkdirSync(work, { recursive: true });

let worst = 0;
for (const t of targetsOf(cfg, say)) {
  let branch;
  try {
    branch = api(`projects/${t.id}`)?.default_branch ?? t.default_branch ?? 'main';
  } catch (e) {
    worst = Math.max(worst, 2);
    say(`${t.path_with_namespace}: cannot read it (${e.message}): skipped`);
    continue;
  }
  const dir = clonePolicy(cfg, arg('policy-remote'), path.join(work, `policy-${t.id}`));
  const r = glue('decide/tripwire.mjs', [
    '--mode', 'sweep', '--policy-dir', dir, '--policy-project', cfg.policy.project, '--policy-branch', cfg.policy.branch,
    '--guardrail-authors', cfg.guardrailAuthors, '--agent-prefix', cfg.agentPrefix, '--lookback-hours', String(cfg.lookbackHours),
    '--write-mode', cfg.policy.writeMode, '--write-token-var', 'BELAY_POLICY_TOKEN',
    '--ledger-project', cfg.ledger.project, '--ledger-branch', cfg.ledger.branch,
  ], { CI_PROJECT_ID: String(t.id), CI_DEFAULT_BRANCH: branch, CI_PIPELINE_ID: '', CI_COMMIT_SHA: '' });
  say(`${t.path_with_namespace}: tripwire exited ${r.code}`);
  worst = Math.max(worst, r.code);
}
process.exit(worst);
