// Applies the engine's gate decision {decision, tier, reasons[]} to the MR. No model is involved.
//   merge   -> auto-merge when the pipeline succeeds (glab mr merge --auto-merge --sha)
//   approve -> the gate account approves, a person still merges (glab mr approve --sha)
//   wait    -> nothing is granted; the MR waits for a person
//   block   -> nothing is granted and this script exits 1, so the job and the MR pipeline are red
// Also sets belay::tier::<tier> and, with --guardrail, guardrail::pass|block. Without BELAY_BOT_TOKEN, or with --dry 1, it
// only reports: a job token cannot approve, merge, write notes or set labels (docs.gitlab.com/ci/jobs/ci_job_token). Only
// belay-apply (gitlab/apply) runs it with the token; a target pipeline's tier-gate passes --dry 1 (F4).
// `--force wait|block --reason "..."` stands in for the engine when its inputs are missing: fail closed, no tier known.
// `--emit-dir d` writes ledger event bodies for components/ledger-append (kinds proof_verdict, guardrail_verdict, tier_decision).
// The guardrail_verdict states the guardrail file's verdict (`verdict: pass|block`); a file that states neither yields none.
import fs from 'node:fs';
import path from 'node:path';
import { arg, die, glab, need, plain } from '../lib/lib.mjs';

const TIERS = ['quarantined', 'assisted', 'supervised', 'hands_off'];
const DECISIONS = ['merge', 'approve', 'wait', 'block'];
const mr = need('mr');
const sha = need('sha');
const repo = process.env.CI_PROJECT_URL ?? die('CI_PROJECT_URL is not set');
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

const force = arg('force');
const d = force ? { decision: force, tier: null, reasons: [arg('reason', 'inputs missing')] } : readJson(need('decision'));
if (!DECISIONS.includes(d.decision)) die(`gate returned an unknown decision: ${plain(d.decision)}`);
if (d.tier != null && !TIERS.includes(d.tier)) die(`gate returned an unknown tier: ${plain(d.tier)}`);
const reasons = (Array.isArray(d.reasons) ? d.reasons : []).map((r) => `- ${plain(r)}`);

const guardrail = arg('guardrail') && fs.existsSync(arg('guardrail')) ? readJson(arg('guardrail')) : null;
const verdict = guardrail && ['pass', 'block'].includes(guardrail.verdict) ? guardrail.verdict : null;
const labels = [];
const unlabels = [];
if (d.tier) {
  labels.push(`belay::tier::${d.tier}`);
  unlabels.push(...TIERS.filter((t) => t !== d.tier).map((t) => `belay::tier::${t}`));
}
if (verdict) {
  labels.push(`guardrail::${verdict}`);
  unlabels.push(`guardrail::${verdict === 'pass' ? 'block' : 'pass'}`);
}

console.error(`belay: gate says ${d.decision} at tier ${d.tier ?? '?'}\n${reasons.join('\n')}`);
const emit = arg('emit-dir');
if (emit && d.tier && !force) {
  fs.mkdirSync(emit, { recursive: true });
  const base = {
    at: new Date().toISOString(), // [R?] the ledger wants the GitLab event time; the job's clock is the nearest we have here
    agent: arg('agent', 'unknown'),
    action_class: arg('class', 'unknown'),
    tier_at_time: d.tier,
    subject: { project_id: Number(process.env.CI_PROJECT_ID), type: 'mr', iid: Number(mr) },
    payload_ref: `${repo}/-/merge_requests/${mr}`,
    observed_by: 'ci_job', // [R?] not in LedgerEvent.observed_by yet: the schema needs this value
  };
  if (guardrail && !verdict) console.error(`belay: the guardrail file states no pass or block (${plain(guardrail.verdict)}): no guardrail_verdict event`);
  const events = [{ kind: 'proof_verdict' }, ...(verdict ? [{ kind: 'guardrail_verdict', verdict }] : []), { kind: 'tier_decision' }];
  events.forEach((e, i) => fs.writeFileSync(path.join(emit, `${i}-${e.kind}.json`), JSON.stringify({ ...base, ...e })));
}

const bot = arg('dry') === '1' ? undefined : process.env.BELAY_BOT_TOKEN;
if (!bot) console.error('belay: no write token here (or --dry 1): reporting only, nothing applied');
else {
  const body = `**Belay gate: ${d.decision.toUpperCase()}** | tier \`${d.tier ?? 'unknown'}\`\n${reasons.join('\n')}`;
  glab(['mr', 'note', 'create', mr, '-R', repo, '-m', body]);
  if (labels.length) glab(['mr', 'update', mr, '-R', repo, '--label', labels.join(','), '--unlabel', unlabels.join(',')]);
  if (d.decision === 'approve') glab(['mr', 'approve', mr, '-R', repo, '--sha', sha]);
  if (d.decision === 'merge') glab(['mr', 'merge', mr, '-R', repo, '--auto-merge', '--sha', sha, '--yes']);
}
process.exit(d.decision === 'block' ? 1 : 0);
