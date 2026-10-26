// Posts the Proof Block to the MR as a note (fenced `belay-proof` JSON plus the Belay-Task trailer) and
// sets the scoped label proof::pass|fail|inconclusive. Needs a token that may write notes and labels: a
// CI job token cannot (docs.gitlab.com/ci/jobs/ci_job_token), so without AFTERLIFE_BOT_TOKEN this only reports.
// If the engine wrote no proof at all (--code 2 and an empty file), the verdict is inconclusive and the note says so.
import fs from 'node:fs';
import { arg, die, envOf, fence, glab, need, plain, ULID } from '../lib/lib.mjs';

const mr = need('mr');
const repo = process.env.CI_PROJECT_URL ?? die('CI_PROJECT_URL is not set');
const verdicts = ['pass', 'fail', 'inconclusive'];
// An empty file is the engine's "no proof"; a missing one is a wrong path, or the M1 hand-run's step 1 refusing (it removes
// its --out): neither may become an inconclusive note.
const proofFile = need('proof');
if (!fs.existsSync(proofFile)) die(`no proof file at ${proofFile}: nothing posted`);

let proof = null;
try {
  proof = JSON.parse(fs.readFileSync(proofFile, 'utf8'));
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
  // The class and the trailer sit outside the fence, as the poster's own text: whoever shaped the proof file (an evidence
  // file an agent's job wrote, in evidence_mode provided) must not add a line, a fence or a mention there.
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(String(proof.class))) die(`proof has no valid class: ${plain(proof.class)}`);
  const task = String(proof.task?.trailer ?? '').replace(/^Belay-Task:[ 	]*/, '');
  if (!ULID.test(task)) die(`proof's task.trailer is not "Belay-Task: <ULID>": ${plain(proof.task?.trailer)}`);
  const trailerLine = `Belay-Task: ${task}`;
  body = [
    `**Afterlife proof: ${verdict.toUpperCase()}** | class \`${proof.class}\` | ${checks.length} checks, ${failed} failed, ${open} undetermined | engine ${plain(proof.engine?.version ?? '?')}`,
    '',
    fence('belay-proof', proof),
    '',
    trailerLine,
  ].join('\n');
} else {
  body = `**Afterlife proof: INCONCLUSIVE** | the engine wrote no Proof Block (exit ${plain(arg('code', '?'))}); see the job log: ${plain(process.env.CI_JOB_URL ?? '')}`;
}

if (arg('dry') === '1' || !envOf(process.env, 'BOT_TOKEN')) {
  console.error('afterlife: AFTERLIFE_BOT_TOKEN is not set (or --dry 1): not posting. The proof stays in the job artifact.');
  process.exit(0);
}
glab(['mr', 'note', 'create', mr, '-R', repo, '-m', body]);
const others = verdicts.filter((v) => v !== verdict).map((v) => `proof::${v}`);
glab(['mr', 'update', mr, '-R', repo, '--label', `proof::${verdict}`, '--unlabel', others.join(',')]);
console.error(`afterlife: posted proof (${verdict}) on !${mr}`);
