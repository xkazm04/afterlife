// belay-apply's MR sweep: the only place a Belay write to an agent MR happens (F4, decided 2026-10-07, ask 6696d24d).
// For each open agent MR of each target of the paired group, it reads everything from GitLab with its own token, re-derives
// the Proof Block with its own pinned engine, runs the gate itself, and applies the result with the components' own write
// scripts (post-proof, apply-gate, ledger-append, dispatch), so every note is byte-identical to the one CI used to post.
// It never reads a proof.json, a decision or any other result a target pipeline computed: only its evidence (the artifacts
// of the evidence job, belay-replay), from a finished merge request pipeline of the MR's current head that ran with no
// pipeline variables (F63).
//
// Once per project, MR and head (a second sweep writes nothing), by reading back what the bot already wrote:
//   proof    the bot's newest belay-proof note, if its task.head_sha = head (else it is posted again, F62)
//   gate     a bot "**Belay gate:" note newer than that proof note and not forced for another head, or a forced wait or
//            block whose first reason names the head (F61)
//   ledger   a belay-ledger commit of events/<project>.jsonl carrying `Belay-Head: <project>!<iid>@<head>`
//   dispatch a bot note "**Belay: guardrail review requested** for head `<head>`" (the Flows API lists no runs)
// One write is not once per head: an auto-merge the bot set is cancelled whenever the gate, re-run against the live
// tier-state.yml, no longer says merge (F74), and an approval the bot gave is withdrawn whenever it says neither approve
// nor merge (F89), so a revoke or a tripwire demotion reaches an MR the gate already approved or set.
// Fails closed: a failed read stops that MR's writes with GitLab's message, the other MRs go on, and the job ends red.
// Without BELAY_BOT_TOKEN, or without BELAY_LEDGER_TOKEN, it only reports, as M1 did: the bot token never writes the ledger.
//
// Usage: node sweep.mjs --config apply.json [--policy-remote <url|path>] [--work .belay]
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { api, apiAll, arg, blocks, enc, glab, httpStatus, need, trustedNotes } from '../components/scripts/lib/lib.mjs';
import { engine } from '../components/scripts/lib/engine.mjs';
import { fileHead, readFile } from '../components/scripts/lib/repo-write.mjs';
import { touchesCi } from './ci-touch.mjs';
import { clonePolicy, glue, loadConfig, targetsOf, tokens } from './lib.mjs';

const cfg = loadConfig(need('config'));
const work = path.resolve(arg('work', '.belay'));
const MISSING = ['BELAY_BOT_TOKEN', 'BELAY_LEDGER_TOKEN'].filter((v) => !process.env[v]);
const WRITE = MISSING.length === 0;
const SCHEMAS = path.resolve(import.meta.dirname, '..', 'flows', 'schemas');
const FINISHED = new Set(['success', 'failed', 'canceled', 'skipped']);
const EVIDENCE_SOURCE = 'merge_request_event';
const LEDGER_PAGES = 5;
const say = (m) => console.error(`belay-apply: ${m}`);
if (!WRITE) say(`${MISSING.join(' and ')} ${MISSING.length > 1 ? 'are' : 'is'} not set: reporting only, nothing is written`);

fs.mkdirSync(work, { recursive: true });
const policyDir = clonePolicy(cfg, arg('policy-remote'), path.join(work, 'policy'), 1);
const policyFile = path.join(policyDir, 'trust-policy.yml');
const proofClassOf = (actionClass) => parse(fs.readFileSync(policyFile, 'utf8'))?.classes?.[actionClass]?.proof ?? null;

/** A raw file or artifact, or null on GitLab's 404. Anything else throws (unknown, never absent). */
function raw(p) {
  try {
    return api(p, { raw: true });
  } catch (e) {
    if (httpStatus(e) === 404) return null;
    throw e;
  }
}

/** The MR's diff from base to head as one unified diff, from the compare API; a truncated diff is refused. */
function diffOf(t, base, head) {
  const c = api(`projects/${t.id}/repository/compare?from=${base}&to=${head}&straight=false`);
  if (!c || !Array.isArray(c.diffs)) throw new Error('the compare API gave no diffs');
  if (c.compare_timeout) throw new Error('GitLab timed out comparing the MR: its diff is incomplete');
  const parts = [];
  for (const d of c.diffs) {
    if (d.too_large || d.collapsed) throw new Error(`the diff of ${d.new_path} is too large for GitLab to return: incomplete`);
    const a = d.new_file ? '/dev/null' : `a/${d.old_path}`;
    const b = d.deleted_file ? '/dev/null' : `b/${d.new_path}`;
    parts.push(`diff --git a/${d.old_path} b/${d.new_path}\n${d.new_file ? 'new file mode 100644\n' : ''}${d.deleted_file ? 'deleted file mode 100644\n' : ''}--- ${a}\n+++ ${b}\n${String(d.diff ?? '').replace(/\n?$/, '\n')}`);
  }
  return { text: parts.join(''), changed: c.diffs.flatMap((d) => [d.old_path, d.new_path]) };
}

const GATE = '**Belay gate: ';
/**
 * A forced gate note as apply-gate writes it: its first reason starts with the head it was forced for. Matched at that
 * place only: a reason further on can quote any sha (an agent can name a file after its next head, F61).
 */
const FORCED = /^\*\*Belay gate: ([A-Z]+)\*\* \| tier `unknown`\n- head ([0-9a-f]{40}): /;
const forcedFor = (n) => {
  const m = FORCED.exec(n.body);
  return m ? { decision: m[1], head: m[2] } : null;
};
const INCONCLUSIVE = 'the guardrail verdict does not match its schema, or its note carries two of them: treated as inconclusive';
const dispatchMark = (head) => `**Belay: guardrail review requested** for head \`${head}\``;

/** One agent MR. Returns nothing; throws on a failed read (no write follows it). */
function sweepMr(t, iid) {
  const dir = path.join(work, `${t.id}-${iid}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const base = { CI_PROJECT_ID: String(t.id), CI_PROJECT_URL: t.web_url, CI_PIPELINE_ID: '', CI_COMMIT_SHA: '' };
  const ctx = glue('proof/mr-context.mjs', ['--mr', String(iid), '--agent-prefix', cfg.agentPrefix, '--out', path.join(dir, 'mr.env')], base);
  if (ctx.code === 10) return; // not an agent MR with a Belay-Task trailer: the existing rule (mr-context.mjs)
  if (ctx.code !== 0) throw new Error(`mr-context exited ${ctx.code}`);
  const mr = Object.fromEntries(fs.readFileSync(path.join(dir, 'mr.env'), 'utf8').split('\n').filter(Boolean).map((l) => l.split(/=(.*)/s).slice(0, 2)));
  const head = mr.BELAY_HEAD_SHA;
  const tag = `${t.path_with_namespace}!${iid}@${head.slice(0, 12)}`;
  const env = { ...base, BELAY_MR_IID: String(iid), BELAY_TASK_ID: mr.BELAY_TASK_ID, BELAY_ACTION_CLASS: mr.BELAY_ACTION_CLASS, BELAY_AGENT: mr.BELAY_AGENT, BELAY_HEAD_SHA: head, BELAY_BASE_SHA: mr.BELAY_BASE_SHA };

  // Reads first, all of them; a write follows only when every read answered.
  const m = api(`projects/${t.id}/merge_requests/${iid}`);
  if (String(m.diff_refs?.head_sha ?? m.sha) !== head) throw new Error('the MR moved while it was being read');
  // Only an MR into the default branch (F78): into any other branch its base may be the agent's own code, so base-red
  // would be the agent's to make, and the tier says nothing about that branch.
  if (!t.default_branch || m.target_branch !== t.default_branch) return say(`${tag}: it targets ${m.target_branch}, not the default branch ${t.default_branch ?? '(unknown)'}: Belay gates only MRs into ${t.default_branch ?? 'the default branch'}`);
  const notes = [...trustedNotes(t.id, iid, cfg.bot)];
  const { text: diff, changed } = diffOf(t, mr.BELAY_BASE_SHA, head);
  const diffFile = path.join(dir, 'diff.patch');
  fs.writeFileSync(diffFile, diff);
  const ci = touchesCi({ changed, project: t, readAt: (p) => readFile(t.id, p, head) });

  // The guardrail's verdict for this head, from its own account's notes only.
  const guardrailFile = path.join(dir, 'guardrail.json');
  const gr = glue('proof/fetch-block.mjs', ['--mr', String(iid), '--tag', 'belay-guardrail', '--authors', cfg.guardrailAuthors, '--head-sha', head,
    '--schema', path.join(SCHEMAS, 'guardrail-verdict.schema.json'), '--out', guardrailFile, '--gate-out', path.join(dir, 'guardrail-gate.json')], env, dir);
  if (![0, 3, 4].includes(gr.code)) throw new Error(`reading the guardrail verdict failed (exit ${gr.code})`);
  const guardBlocked = gr.code === 0 && JSON.parse(fs.readFileSync(guardrailFile, 'utf8')).verdict === 'block';
  const actionClass = mr.BELAY_ACTION_CLASS;

  // The ledger's record of this head, read once when first asked: like every other read, before the first write.
  const ledgerKey = `${t.id}!${iid}@${head}`;
  const blockKey = `${ledgerKey}/guardrail-block`; // the guardrail's own block for this head, once its events carry it
  const ledgerFile = `events/${t.id}.jsonl`;
  let ledgerLog;
  const ledgered = (key) => {
    if (!ledgerLog) {
      // Only commits since the MR was opened can carry its key; past the cap the answer is unknown, so the MR stops rather
      // than appending its events again (F76).
      const since = typeof m.created_at === 'string' ? `&since=${enc(m.created_at)}` : '';
      ledgerLog = apiAll(`projects/${enc(cfg.ledger.project)}/repository/commits?ref_name=${enc(cfg.ledger.branch)}&path=${enc(ledgerFile)}${since}`, LEDGER_PAGES);
      if (ledgerLog.length >= LEDGER_PAGES * 100) throw new Error(`more than ${LEDGER_PAGES * 100} commits of ${ledgerFile} since this MR was opened: whether its events were appended is not known`);
    }
    return ledgerLog.some((c) => String(c.message ?? '').split('\n').includes(`Belay-Head: ${key}`));
  };
  const appendLedger = (events, keys) => {
    const l = glue('decide/ledger-append.mjs', ['--events', events, '--project', cfg.ledger.project, '--branch', cfg.ledger.branch, '--path', ledgerFile,
      ...keys.flatMap((k) => ['--key', k]), '--write-token-var', 'BELAY_LEDGER_TOKEN'], { ...env, ...tokens('BELAY_LEDGER_TOKEN') }, dir);
    if (l.code !== 0) throw new Error(`ledger-append exited ${l.code}`);
  };

  // tier-state.yml as belay-policy has it now, not as cloned when the sweep began: a revoke committed while the sweep ran
  // is what the gate reads before it grants anything (F66). Read once, when first asked.
  const statesFile = path.join(dir, 'tier-state.yml');
  let statesRead = false;
  const states = () => {
    if (!statesRead) {
      const live = fileHead(cfg.policy.project, 'tier-state.yml', cfg.policy.branch);
      if (!live) throw new Error(`${cfg.policy.project} has no tier-state.yml`);
      fs.writeFileSync(statesFile, live.content);
      statesRead = true;
    }
    return statesFile;
  };

  // The bot's newest Proof Block stands for this head only if it was made for it. After a push and a return to an earlier
  // head the proof is posted again, so an engine gate note always follows a proof note of its own head; a forced note
  // names its head itself. A gate note made for another head never stands for this one (F62).
  const lastProof = notes.find((n) => blocks(n.body, 'belay-proof').length > 0);
  const proofNote = lastProof && blocks(lastProof.body, 'belay-proof').some((b) => b?.task?.head_sha === head) ? lastProof : undefined;
  const gateDone = Boolean(proofNote) && notes.some((n) => n.id > proofNote.id && n.body.startsWith(GATE) && (forcedFor(n)?.head ?? head) === head);
  /**
   * A gate the engine did not decide: a note that names the head, applied once per decision and head. A guardrail block for
   * this head makes it a block and sets guardrail::block, whatever else is missing (M2's 12 Oct bar); guardrail::pass is set
   * only with a gate the engine decided.
   */
  /**
   * An auto-merge the bot set stands only while the gate still says merge for this head (F74), and an approval the bot
   * gave only while it says approve or merge (F89): it would still count toward the target's approval rules. A revoke or a
   * tripwire demotion changes tier-state.yml, not the MR, so each sweep re-decides an MR that has either and withdraws it
   * on anything else. An auto-merge a person set and a person's approval are theirs and are left alone: the unapprove is
   * the bot's own call, which removes only the bot's approval. The approvals are read only once the gate is done.
   */
  const botAutoMerge = m.merge_when_pipeline_succeeds === true && String(m.merge_user?.username ?? '') === cfg.bot;
  const cancelAutoMerge = (decision, tier) => {
    if (!botAutoMerge) return;
    const why = `the gate now says ${decision}${tier ? ` at tier ${tier}` : ''}`;
    say(`${tag}: cancelling the auto-merge the bot set: ${why}`);
    if (!WRITE) return;
    api(`projects/${t.id}/merge_requests/${iid}/cancel_merge_when_pipeline_succeeds`, { method: 'POST' });
    glab(['mr', 'note', 'create', String(iid), '-R', t.web_url, '-m', `**Belay: auto-merge cancelled** for head \`${head}\`: ${why}. A person decides whether it merges.`]);
  };
  let approvedByBot;
  const botApproved = () => {
    if (!gateDone) return false;
    if (approvedByBot === undefined) {
      const a = api(`projects/${t.id}/merge_requests/${iid}/approvals`);
      if (!Array.isArray(a?.approved_by)) throw new Error('the approvals of the MR could not be read');
      approvedByBot = a.approved_by.some((x) => String(x?.user?.username ?? '') === cfg.bot);
    }
    return approvedByBot;
  };
  const withdrawApproval = (decision, tier) => {
    if (decision === 'approve' || decision === 'merge' || !botApproved()) return;
    const why = `the gate now says ${decision}${tier ? ` at tier ${tier}` : ''}`;
    say(`${tag}: withdrawing the approval the bot gave: ${why}`);
    if (!WRITE) return;
    api(`projects/${t.id}/merge_requests/${iid}/unapprove`, { method: 'POST' });
    glab(['mr', 'note', 'create', String(iid), '-R', t.web_url, '-m', `**Belay: approval withdrawn** for head \`${head}\`: ${why}. A person decides whether it merges.`]);
  };
  /**
   * A forced gate decides no tier, so it ledgers nothing, except the guardrail's own block for this head: a guardrail_verdict
   * block, once per head (`<key>/guardrail-block`), so the poller counts it even if the MR merges later on another head
   * (r2 value-forced-block). Its tier is the one the engine's gate holds the agent and class at, from the live
   * tier-state.yml; with none (no class, no tier record) there is nobody to count it against, and nothing is ledgered.
   * A forced wait or block with any other cause (CI change, an ambiguous or missing verdict) ledgers nothing.
   */
  const blockTier = () => {
    if (!guardBlocked || !actionClass || !mr.BELAY_AGENT || ledgered(blockKey)) return null;
    const g = engine(['gate', '--policy', policyFile, '--state', states(), '--class', actionClass, '--agent', mr.BELAY_AGENT, '--guardrail', path.join(dir, 'guardrail-gate.json')]);
    let tier = null;
    try {
      tier = JSON.parse(g.stdout).tier ?? null;
    } catch {
      tier = null;
    }
    if (!tier) say(`${tag}: the gate holds ${mr.BELAY_AGENT} at no tier for ${actionClass}: the guardrail's block is not ledgered`);
    return tier;
  };
  const force = (decision, reason) => {
    const d = guardBlocked ? 'block' : decision;
    const why = guardBlocked && decision !== 'block' ? `the guardrail blocked this head; also, ${reason}` : reason;
    const tier = blockTier(); // reads, before any write
    cancelAutoMerge(d, null);
    withdrawApproval(d, null);
    const said = gateDone || notes.some((n) => forcedFor(n)?.decision === d.toUpperCase() && forcedFor(n).head === head);
    say(said ? `${tag}: ${d} already said for this head` : `${tag}: ${d}: ${why}`);
    if (said && !tier) return;
    const events = path.join(dir, 'events');
    const r = glue('decide/apply-gate.mjs', ['--mr', String(iid), '--sha', head, '--force', d, '--reason', `head ${head}: ${why}`,
      ...(guardBlocked ? ['--guardrail', guardrailFile] : []),
      ...(tier ? ['--agent', mr.BELAY_AGENT, '--class', actionClass, '--ledger-tier', tier, '--emit-dir', events] : []),
      ...(WRITE && !said ? [] : ['--dry', '1'])], { ...env, ...tokens('BELAY_BOT_TOKEN') }, dir);
    if (r.code > 1) throw new Error(`apply-gate exited ${r.code}`);
    if (!tier || !fs.existsSync(events)) return;
    if (!WRITE) return say(`${tag}: the guardrail's block is not ledgered (reporting only)`);
    appendLedger(events, [blockKey]);
  };

  /** No guardrail verdict for this head yet: the guardrail is started once (its dispatch note names the head). */
  const requestGuardrail = (what) => {
    say(`${tag}: no guardrail verdict for this head yet: ${what}`);
    const consumer = Number(t.conf.guardrail_consumer_id);
    if (!Number.isSafeInteger(consumer) || consumer <= 0) return;
    if (notes.some((n) => n.body.startsWith(dispatchMark(head)))) return say(`${tag}: guardrail review already requested`);
    if (!process.env.BELAY_DISPATCH_TOKEN || !WRITE) return say(`${tag}: BELAY_DISPATCH_TOKEN is not set: the guardrail is not started`);
    const d = glue('ops/dispatch.mjs', ['--goal', String(iid), '--consumer-id', String(consumer)], { ...env, GITLAB_TOKEN: process.env.BELAY_DISPATCH_TOKEN });
    if (d.code !== 0) throw new Error(`dispatch exited ${d.code}`);
    const run = (() => {
      try {
        return JSON.parse(d.stdout).id;
      } catch {
        return null;
      }
    })();
    glab(['mr', 'note', 'create', String(iid), '-R', t.web_url, '-m', `${dispatchMark(head)} (flow run ${Number.isSafeInteger(run) ? run : '?'}).`]);
  };

  if (ci) {
    force('wait', `${ci}. This MR controls which jobs made its evidence, so Belay grants nothing and gives no proof; a person reviews it.`);
    if (WRITE && (m.labels ?? []).includes('proof::pass')) glab(['mr', 'update', String(iid), '-R', t.web_url, '--unlabel', 'proof::pass']);
    return;
  }
  if (!actionClass) return force('wait', 'this MR has no Belay-Class trailer');
  const proofClass = proofClassOf(actionClass);
  if (!proofClass) return force('wait', `trust-policy.yml names no proof class for ${actionClass}`);

  // Evidence: for exploit-test, the artifacts of the evidence job in a finished pipeline of this very head.
  const args = [];
  let pipelineId = 'none';
  if (proofClass === 'exploit-test') {
    const ev = { job: 'belay-replay', base_junit: 'evidence/base/junit.xml', head_junit: 'evidence/head/junit.xml', rescan_base: 'evidence/base/scan.json', rescan_head: 'evidence/head/scan.json', ...(t.conf.evidence ?? {}) };
    // Only a merge request pipeline (F63). Anyone who may push to the MR's branch can start another pipeline of the same
    // sha (Run pipeline, the API, a trigger, a schedule, a push option, a downstream trigger), and each of those can carry
    // pipeline variables, which outrank the job's own and so change what the evidence job ran without a CI file change.
    // And a merge request pipeline that still carries one is not evidence either: the MR waits for a person.
    const row = apiAll(`projects/${t.id}/merge_requests/${iid}/pipelines`, 1).find((x) => x.sha === head && (x.source ?? EVIDENCE_SOURCE) === EVIDENCE_SOURCE);
    const p = row ? api(`projects/${t.id}/pipelines/${row.id}`) : null;
    if (!p || p.sha !== head || p.source !== EVIDENCE_SOURCE || !FINISHED.has(p.status)) return say(`${tag}: no finished merge request pipeline for this head yet: nothing to prove`);
    const vars = api(`projects/${t.id}/pipelines/${p.id}/variables`);
    if (!Array.isArray(vars)) throw new Error(`the variables of pipeline ${p.id} could not be read`);
    if (vars.length) return force('wait', `pipeline ${p.id} of this head ran with ${vars.length} pipeline variable(s), which can change what its evidence job ran, so Belay gives it no proof; a person reviews it.`);
    pipelineId = String(p.id);
    const job = apiAll(`projects/${t.id}/pipelines/${p.id}/jobs`, 5).find((j) => j.name === ev.job);
    if (job) {
      for (const [flag, key] of [['base-junit', 'base_junit'], ['head-junit', 'head_junit'], ['rescan-base', 'rescan_base'], ['rescan-head', 'rescan_head']]) {
        const text = raw(`projects/${t.id}/jobs/${job.id}/artifacts/${String(ev[key]).split('/').map(enc).join('/')}`);
        if (text === null) continue;
        const f = path.join(dir, 'evidence', key);
        fs.mkdirSync(path.dirname(f), { recursive: true });
        fs.writeFileSync(f, text);
        args.push(`--${flag}`, f);
      }
      if (job.web_url) args.push('--base-ref', job.web_url, '--head-ref', job.web_url);
    } else say(`${tag}: pipeline ${p.id} has no ${ev.job} job: the proof is derived without its evidence`);
  } else if (proofClass === 'cited-diff') {
    // The guardrail's verdict is this class's evidence, so without one this class never reached the dispatch below and
    // waited for ever, and an inconclusive one was never said (F77): both are handled here.
    if (gr.code === 4) return force('block', INCONCLUSIVE);
    if (gr.code !== 0) return requestGuardrail('nothing to prove');
    args.push('--verdict', guardrailFile);
  } else if (proofClass === 'rerun-stats') {
    const md = glue('proof/fetch-block.mjs', ['--mr', String(iid), '--tag', 'belay-medic', '--authors', cfg.medicAuthors, '--out', path.join(dir, 'medic.json')], env, dir);
    if (md.code === 3) return say(`${tag}: no belay-medic verdict yet: nothing to prove`);
    if (md.code !== 0) throw new Error(`reading the medic verdict failed (exit ${md.code})`);
    args.push('--verdict', path.join(dir, 'medic.json'));
  }

  // The ledger's record of this head and the live tier-state.yml: read, like every other read, before the first write.
  const ledgerDone = ledgered(ledgerKey);
  states();

  // The Proof Block, re-derived here. Never one a target pipeline made.
  const evidence = path.join(dir, 'evidence.json');
  const be = glue('proof/build-evidence.mjs', ['--class', proofClass, '--out', evidence, ...args], { ...env, CI_PIPELINE_ID: pipelineId, BELAY_DIFF_FILE: diffFile }, dir);
  let proof = null;
  if (be.code === 0) {
    const r = engine(['prove', '--class', proofClass, '--input', evidence, '--policy', policyFile, '--files-root', dir]);
    try {
      proof = JSON.parse(r.stdout);
    } catch {
      proof = null;
    }
    if (proof && (proof.schema !== 'belay.proof/1' || proof.task?.head_sha !== head)) proof = null;
  }
  if (!proof) return force('wait', `no Proof Block could be derived for this head (${proofClass}): see the belay-apply job log`);
  const proofFile = path.join(dir, 'proof.json');
  fs.writeFileSync(proofFile, JSON.stringify(proof));
  say(`${tag}: proof ${proof.verdict}`);
  if (!proofNote) {
    const r = glue('proof/post-proof.mjs', ['--proof', proofFile, '--mr', String(iid), ...(WRITE ? [] : ['--dry', '1'])], { ...env, ...tokens('BELAY_BOT_TOKEN') }, dir);
    if (r.code !== 0) throw new Error(`post-proof exited ${r.code}`);
  }

  if (gr.code === 3) return requestGuardrail('the gate waits');
  if (gr.code === 4) return force('block', INCONCLUSIVE);

  // The gate, decided here, and its ledger events.
  // F81: a guardrail block for this head that came after its gate was applied. The gate, re-run below, withdraws what the
  // bot granted (F74, F89); the block is also applied (the BLOCK note and guardrail::block) while the MR lacks that label,
  // and ledgered once (`<key>/guardrail-block`) when the head's events were appended without it.
  const relabel = gateDone && guardBlocked && !(m.labels ?? []).includes('guardrail::block');
  const blockOwed = guardBlocked && ledgerDone && !ledgered(blockKey);
  const settled = gateDone && ledgerDone && !relabel && !blockOwed;
  if (settled && !botAutoMerge && !botApproved()) return say(`${tag}: gate and ledger already applied for this head`);
  const g = engine(['gate', '--policy', policyFile, '--state', statesFile, '--class', actionClass, '--agent', mr.BELAY_AGENT,
    '--proof', proofFile, '--guardrail', path.join(dir, 'guardrail-gate.json'), '--diff', diffFile]);
  const decisionFile = path.join(dir, 'decision.json');
  fs.writeFileSync(decisionFile, g.stdout);
  const decided = (() => {
    try {
      return JSON.parse(g.stdout);
    } catch {
      return null;
    }
  })();
  const now = typeof decided?.decision === 'string' ? decided.decision : 'nothing readable';
  const nowTier = typeof decided?.tier === 'string' ? decided.tier : null;
  if (now !== 'merge') cancelAutoMerge(now, nowTier);
  withdrawApproval(now, nowTier);
  if (settled) return say(`${tag}: gate and ledger already applied for this head`);
  const events = path.join(dir, 'events');
  const applied = glue('decide/apply-gate.mjs', ['--mr', String(iid), '--sha', head, '--decision', decisionFile, '--guardrail', guardrailFile,
    '--agent', mr.BELAY_AGENT, '--class', actionClass, '--emit-dir', events, ...(WRITE && (!gateDone || relabel) ? [] : ['--dry', '1'])], { ...env, ...tokens('BELAY_BOT_TOKEN') }, dir);
  if (applied.code > 1) throw new Error(`apply-gate exited ${applied.code}`);
  if (!fs.existsSync(events) || (ledgerDone && !blockOwed)) return;
  if (!WRITE) return say(`${tag}: ledger events not appended (reporting only)`);
  // The head's events carry the guardrail's block when it blocked: both keys, so it is not ledgered again on its own.
  if (!ledgerDone) return appendLedger(events, guardBlocked ? [ledgerKey, blockKey] : [ledgerKey]);
  const block = fs.readdirSync(events).find((f) => f.endsWith('-guardrail_verdict.json'));
  if (!block) return;
  const only = path.join(dir, 'events-guardrail-block');
  fs.mkdirSync(only, { recursive: true });
  fs.copyFileSync(path.join(events, block), path.join(only, block));
  appendLedger(only, [blockKey]);
}

const MR_PAGES = 5;
let failed = 0;
for (const t of targetsOf(cfg, say)) {
  let mrs;
  try {
    const full = api(`projects/${t.id}`);
    Object.assign(t, { ci_config_path: full?.ci_config_path ?? null, web_url: full?.web_url ?? t.web_url, default_branch: full?.default_branch ?? t.default_branch });
    const open = apiAll(`projects/${t.id}/merge_requests?state=opened&order_by=updated_at`, MR_PAGES);
    // Past the cap the rest are not read (F82): the ones read are still swept, and the job ends red, as F65 does.
    if (open.length >= MR_PAGES * 100) {
      failed++;
      say(`${t.path_with_namespace}: more than ${MR_PAGES * 100} open MRs: the ones past them are not swept`);
    }
    mrs = open.filter((x) => String(x.author?.username ?? '').startsWith(cfg.agentPrefix));
  } catch (e) {
    failed++;
    say(`${t.path_with_namespace}: cannot read it (${e.message}): nothing written there`);
    continue;
  }
  for (const x of mrs) {
    try {
      sweepMr(t, x.iid);
    } catch (e) {
      failed++;
      say(`${t.path_with_namespace}!${x.iid}: stopped, nothing more written for it: ${e.message}`);
    }
  }
}
if (failed) {
  say(`${failed} target(s) or MR(s) stopped on a failed read or write`);
  process.exit(1);
}
