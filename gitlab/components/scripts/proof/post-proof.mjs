// Posts the Proof Block to the MR as a note (fenced `belay-proof` JSON plus the Belay-Task trailer) and
// sets the scoped label proof::pass|fail|inconclusive. Needs a token that may write notes and labels: a
// CI job token cannot (docs.gitlab.com/ci/jobs/ci_job_token), so without BELAY_BOT_TOKEN this only reports.
// If the engine wrote no proof at all (--code 2 and an empty file), the verdict is inconclusive and the note says so.
import fs from 'node:fs';
import { arg, die, fence, glab, need, plain } from '../lib/lib.mjs';

const mr = need('mr');
const repo = process.env.CI_PROJECT_URL ?? die('CI_PROJECT_URL is not set');
const verdicts = ['pass', 'fail', 'inconclusive'];

let proof = null;
try {
  proof = JSON.parse(fs.readFileSync(need('proof'), 'utf8'));
} catch {
  proof = null;
}
if (proof && !verdicts.includes(proof.verdict)) die(`proof has no valid verdict: ${plain(proof.verdict)}`);
const verdict = proof ? proof.verdict : 'inconclusive';

let body;
if (proof) {
  const checks = Array.isArray(proof.checks) ? proof.checks : [];
  const failed = checks.filter((c) => c.ok === false).length;
  const open = checks.filter((c) => c.ok === null).length;
  const raw = String(proof.task?.trailer ?? '');
  const trailerLine = raw.startsWith('Belay-Task:') ? raw : `Belay-Task: ${raw}`;
  body = [
    `**Belay proof: ${verdict.toUpperCase()}** | class \`${proof.class}\` | ${checks.length} checks, ${failed} failed, ${open} undetermined | engine ${plain(proof.engine?.version ?? '?')}`,
    '',
    fence('belay-proof', proof),
    '',
    trailerLine,
  ].join('\n');
} else {
  body = `**Belay proof: INCONCLUSIVE** | the engine wrote no Proof Block (exit ${plain(arg('code', '?'))}); see the job log: ${plain(process.env.CI_JOB_URL ?? '')}`;
}

if (arg('dry') === '1' || !process.env.BELAY_BOT_TOKEN) {
  console.error('belay: BELAY_BOT_TOKEN is not set (or --dry 1): not posting. The proof stays in the job artifact.');
  process.exit(0);
}
glab(['mr', 'note', 'create', mr, '-R', repo, '-m', body]);
const others = verdicts.filter((v) => v !== verdict).map((v) => `proof::${v}`);
glab(['mr', 'update', mr, '-R', repo, '--label', `proof::${verdict}`, '--unlabel', others.join(',')]);
console.error(`belay: posted proof (${verdict}) on !${mr}`);
