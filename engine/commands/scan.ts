// belay scan --facts facts.json
// Scores the facts collect-facts.mjs wrote into nine cells (belay.maturity/0), by the rubric table in rubric.ts. No network,
// no model, no clock: scanned_at is the facts' `at`, and "the last 14 days" are counted back from it. Exit 0 when every cell
// is determined, 2 when any is unknown (the document is printed either way) or the facts file cannot be read.
import { MATURITY_SCHEMA, type MaturityScan, type ScanCell, type ScanEvidence } from '../../src/schemas/maturity';
import { RUNGS } from '../../src/schemas/stages';
import { parseArgs } from '../core/args';
import { readJson } from '../core/files';
import type { CommandResult, Ctx } from '../core/types';
import { ENGINE_VERSION } from '../core/version';
import { ciJobs, flag, names, parseFacts, project, runs, strings, type Facts, type Project, type Read, type RunJob, type Runs } from './facts';
import { NOT_AN_ARTIFACT, RAN_WITHIN_DAYS, RUBRIC, type StageRule } from './rubric';

const DAY = 86_400_000;
const TOP = RUNGS.length - 1;

/** Where the climb stopped: rung held, and the one line that says why it is not higher. */
type Stop = { rung: number; note: string } | { rung: null; note: string };

const blob = (p: Project, file: string): string => `${p.web}/-/blob/${p.branch}/${file}`;

/** R1: what of the stage is on the default branch, or why that is unknown. Empty evidence = absent. */
function present(rule: StageRule, f: Facts, p: Project): Read<{ ev: ScanEvidence[]; jobs: string[]; what: string }> {
  const r1 = rule.r1;
  if (r1.kind === 'templates') {
    const t = strings(f, 'issue_templates');
    if (!t.ok) return t;
    return { ok: true, v: { ev: t.v.length ? [{ label: `.gitlab/issue_templates (${t.v.length})`, url: `${p.web}/-/tree/${p.branch}/.gitlab/issue_templates` }] : [], jobs: [], what: 'issue templates' } };
  }
  if (r1.kind === 'review') {
    const owners = strings(f, 'codeowners');
    const prot = names(f, 'protected_branches');
    const ev: ScanEvidence[] = [];
    if (owners.ok) for (const o of owners.v) ev.push({ label: o, url: blob(p, o) });
    if (prot.ok && prot.v.includes(p.branch)) ev.push({ label: `protected branch ${p.branch}`, url: `${p.web}/-/settings/repository#js-protected-branches-settings` });
    if (!ev.length && !owners.ok) return owners;
    if (!ev.length && !prot.ok) return prot;
    return { ok: true, v: { ev, jobs: [], what: 'CODEOWNERS and no protected default branch' } };
  }
  const jobs = ciJobs(f);
  if (!jobs.ok) return jobs;
  const hit = jobs.v.filter((j) => r1.names.test(j.name)).map((j) => j.name);
  return { ok: true, v: { ev: hit.length ? [{ label: `.gitlab-ci.yml · job ${hit.slice(0, 3).join(', ')}`, url: blob(p, '.gitlab-ci.yml') }] : [], jobs: hit, what: `${rule.stage} job in the merged CI config` } };
}

/** The newest run of one of `want` within the window with an artifact of the right type; or why there is none. */
function ran(r: Runs, f: Facts, what: string, want: (name: string) => boolean, artifacts: readonly string[] | 'any'): Read<RunJob | string> {
  const mine = r.jobs.filter((j) => want(j.name));
  if (!r.pipeline || !mine.length) return { ok: true, v: r.pipeline ? `${what} not run on pipeline #${r.pipeline.id}` : `${what} not run: no green pipeline on the default branch` };
  const gone = mine.find((j) => j.missing);
  if (gone?.missing) return { ok: false, why: `${gone.missing} was not collected` };
  const counts = (j: RunJob) => j.artifacts.some((a) => !NOT_AN_ARTIFACT.has(a) && (artifacts === 'any' || artifacts.includes(a)));
  const done = mine.filter((j) => (j.status === 'success' || j.status === 'failed') && !Number.isNaN(j.finishedMs));
  const fresh = done.filter((j) => j.finishedMs <= f.atMs && f.atMs - j.finishedMs <= RAN_WITHIN_DAYS * DAY);
  const good = fresh.filter(counts).sort((a, b) => b.finishedMs - a.finishedMs)[0];
  if (good) return { ok: true, v: good };
  if (fresh.length) return { ok: true, v: `${fresh[0]?.name} ran with no artifact${artifacts === 'any' ? '' : ` (wanted ${artifacts.join(', ')})`}` };
  const last = done.sort((a, b) => b.finishedMs - a.finishedMs)[0];
  if (last) return { ok: true, v: `${last.name} last ran ${Math.floor((f.atMs - last.finishedMs) / DAY)} d before the scan` };
  return { ok: true, v: `${mine[0]?.name} did not finish on pipeline #${r.pipeline.id}` };
}

/** Climbs one stage from R1 up, stopping at the first rung that does not hold or cannot be read. */
function climb(rule: StageRule, f: Facts, ev: ScanEvidence[]): Stop {
  const unknown = (why: string, held?: number): Stop => ({ rung: null, note: `${held ? `R${held} holds; R${held + 1} unknown: ` : 'unknown: '}${why}` });
  const notRead = (held: number): Stop => ({ rung: held, note: `R${held} holds (${ev.map((e) => e.label).join(' · ')}); R${held + 1} is not read by this rubric` });
  const p = project(f);
  if (!p.ok) return unknown(p.why);
  const r1 = present(rule, f, p.v);
  if (!r1.ok) return unknown(r1.why);
  if (!r1.v.ev.length) return { rung: 0, note: `absent: no ${r1.v.what} on ${p.v.branch}` };
  ev.push(...r1.v.ev);
  if (!rule.r2) return notRead(1);

  const r = runs(f);
  if (!r.ok) return unknown(r.why, 1);
  const job = ran(r.v, f, r1.v.jobs.join(', '), (n) => r1.v.jobs.includes(n), rule.r2.artifacts);
  if (!job.ok) return unknown(job.why, 1);
  if (typeof job.v === 'string') return { rung: 1, note: `configured, not exercised: ${job.v}` };
  const run = job.v;
  ev.push({ label: `job ${run.name} #${run.id}`, url: run.webUrl });
  if (r.v.pipeline?.webUrl) ev.push({ label: `pipeline #${r.v.pipeline.id}`, url: r.v.pipeline.webUrl });
  if (!rule.r3) return notRead(2);

  const gate = p.v.mergeGate;
  if (!gate.ok) return unknown(gate.why, 2);
  if (!gate.v) return { rung: 2, note: `R2 holds; failing ${run.name} does not block a merge: pipelines need not succeed` };
  const cfg = ciJobs(f);
  const af = cfg.ok ? cfg.v.find((j) => j.name === run.name)?.allowFailure : undefined;
  if (!af) return unknown('ci_config.jobs[].allow_failure was not collected', 2);
  if (!af.ok) return unknown(af.why, 2);
  if (af.v) return { rung: 2, note: `R2 holds; ${run.name} is allow_failure, so failing it blocks nothing` };
  ev.push({ label: 'pipelines must succeed', url: `${p.v.web}/-/settings/merge_requests` });
  if (!rule.r4) return notRead(3);

  const agent = flag(f, 'duo_agent_config');
  if (!agent.ok) return unknown(agent.why, 3);
  if (!agent.v) return { rung: 3, note: 'R3 holds; no agent operates it: no .gitlab/duo/agent-config.yml' };
  const proofRe = rule.r4;
  const proof = ran(r.v, f, `a job matching ${proofRe.source}`, (n) => proofRe.test(n), 'any');
  if (!proof.ok) return unknown(proof.why, 3);
  if (typeof proof.v === 'string') return { rung: 3, note: `R3 holds; no Belay proof job re-derives it: ${proof.v}` };
  ev.push({ label: '.gitlab/duo/agent-config.yml', url: blob(p.v, '.gitlab/duo/agent-config.yml') });
  if (proof.v.id !== run.id) ev.push({ label: `job ${proof.v.name} #${proof.v.id}`, url: proof.v.webUrl });
  return { rung: TOP, note: `an agent operates it and ${proof.v.name} re-derived its proof on pipeline #${r.v.pipeline?.id ?? '?'}` };
}

export function scoreFacts(f: Facts): MaturityScan {
  const cells: ScanCell[] = RUBRIC.map((rule) => {
    const evidence: ScanEvidence[] = [];
    const s = climb(rule, f, evidence);
    return { stage: rule.stage, rung: s.rung, evidence: s.rung === null || s.rung >= 1 ? evidence : [], note: s.note, next_rung: s.rung === null || s.rung >= TOP ? null : s.rung + 1 };
  });
  return { schema: MATURITY_SCHEMA, project_id: f.projectId, engine_version: ENGINE_VERSION, scanned_at: f.at, cells };
}

export function scanCommand(argv: readonly string[], ctx: Ctx): CommandResult {
  const args = parseArgs(argv, { values: ['facts'] });
  const f = parseFacts(readJson(ctx, args.need('facts')));
  const scan = scoreFacts(f);
  const unknown = scan.cells.filter((c) => c.rung === null);
  const lines = [
    `maturity scan of project ${scan.project_id} at ${scan.scanned_at}: ${scan.cells.length - unknown.length} determined, ${unknown.length} unknown`,
    ...scan.cells.map((c) => `  ${c.stage.padEnd(9)} ${c.rung === null ? 'R?' : `R${c.rung}`}  ${c.note}`),
  ];
  return { json: scan, summary: lines.join('\n'), code: unknown.length ? 2 : 0 };
}
