// The maturity scan's result, into the index: the newest finished `belay-maturity-scan` job's `.belay/maturity.json`
// (belay.maturity/0, written by `engine/cli.ts scan`), checked with the engine's own type, stored as the project's nine
// stage_cell rows. Read only. The job is allow_failure and keeps its artifacts on failure (it exits 2 whenever a cell is
// unknown), so its status does not matter. Nothing is written for a project with no scan job; an artifact that is missing,
// unparsable or invalid writes nothing and is the poll's issue. A scan already stored, or already refused, is not read again.
import type { PGlite } from '@electric-sql/pglite';
import { parseMaturityScan, type MaturityScan } from '@/schemas/maturity';
import { isKind } from '@/server/gitlab/errors';
import type { GitLabPort, GlJob, GlProject } from '@/server/gitlab/port';
import { firstStageCells, latestScanAt, upsertStageCells } from '@/server/index/repositories/work/stageCell';
import type { Queryable } from '@/server/index/repositories/sql';
import type { PollMemory } from './state';

export const SCAN_JOB = 'belay-maturity-scan';
export const SCAN_ARTIFACT = '.belay/maturity.json';
/** The component's rules: a schedule, or an API pipeline, with BELAY_SCAN=maturity. */
const SCAN_SOURCES: ReadonlySet<string> = new Set(['schedule', 'api']);
/** Default-branch pipelines looked at, and of those, the scheduled or API ones whose jobs are read. */
const PIPELINES = 20;
const SCAN_PIPELINES = 3;

export type ScanRead = 'none' | 'stored' | 'unchanged' | 'refused';

const message = (e: unknown): string => (e instanceof Error ? e.message : String(e)).split('\n')[0] ?? '';

/** The newest finished scan job on the newest scheduled or API pipelines of the default branch, or null. */
async function newestScanJob(port: GitLabPort, gl: GlProject): Promise<GlJob | null> {
  const pipelines = (await port.listPipelines(gl.id, { ref: gl.defaultBranch ?? undefined, limit: PIPELINES }))
    .filter((p) => p.source !== null && SCAN_SOURCES.has(p.source))
    .sort((a, b) => b.id - a.id)
    .slice(0, SCAN_PIPELINES);
  for (const p of pipelines) {
    const job = (await port.listJobs(gl.id, p.id)).filter((j) => j.name === SCAN_JOB && j.finishedAt !== null).sort((a, b) => b.id - a.id)[0];
    if (job) return job;
  }
  return null;
}

/** The nine cells, at the scan's own time. Day 0 is the stage's earliest stored scan, so the first scan is day 0. */
async function store(db: Queryable, projectId: string, scan: MaturityScan): Promise<void> {
  const at = new Date(scan.scanned_at);
  const first = await firstStageCells(db, projectId);
  await upsertStageCells(db, scan.cells.map((c) => {
    const earlier = first.get(c.stage);
    return {
      projectId, stage: c.stage, rung: c.rung, baseRung: earlier && earlier.scannedAt < at ? earlier.rung : c.rung, nextRung: c.next_rung,
      evidence: c.evidence, evidenceNote: c.note, engineVersion: scan.engine_version, scannedAt: at,
    };
  }));
}

async function read(port: GitLabPort, db: PGlite, mem: PollMemory, gl: GlProject, projectId: string, issues: string[]): Promise<ScanRead> {
  const job = await newestScanJob(port, gl);
  if (!job) return 'none';
  const seen = mem.scans.get(gl.id);
  if (seen?.jobId === job.id) {
    if (seen.issue) issues.push(seen.issue);
    return seen.issue ? 'refused' : 'unchanged';
  }
  const stored = await latestScanAt(db, projectId);
  const started = Date.parse(job.startedAt ?? job.finishedAt ?? '');
  if (stored && stored.getTime() >= started) {
    mem.scans.set(gl.id, { jobId: job.id, issue: null }); // the facts are read after the job starts: this scan, or a newer one
    return 'unchanged';
  }
  const refuse = (why: string, settled: boolean): ScanRead => {
    const issue = `maturity scan: job ${job.id}'s ${SCAN_ARTIFACT} ${why}; nothing stored`;
    if (settled) mem.scans.set(gl.id, { jobId: job.id, issue });
    issues.push(issue);
    return 'refused';
  };
  let raw: unknown;
  try {
    raw = await port.get(`projects/${gl.id}/jobs/${job.id}/artifacts/${SCAN_ARTIFACT}`);
  } catch (e) {
    // a missing or unparsable artifact stays that way; a failed read (network, rate limit) is tried again next poll
    return refuse(`could not be read (${message(e)})`, isKind(e, 'not-found', 'parse', 'forbidden'));
  }
  const parsed = parseMaturityScan(raw);
  if (!parsed.ok) return refuse(`is not a belay.maturity/0 scan (${parsed.reason})`, true);
  if (parsed.scan.project_id !== gl.id) return refuse(`is about project ${parsed.scan.project_id}, not ${gl.id}`, true);
  await db.transaction((tx) => store(tx, projectId, parsed.scan));
  mem.scans.set(gl.id, { jobId: job.id, issue: null });
  return 'stored';
}

/** One project's scan read. Never fails the poll: a failure is the poll's issue, and the cells stored before stay. */
export async function pollMaturityScan(port: GitLabPort, db: PGlite, mem: PollMemory, gl: GlProject, projectId: string, issues: string[]): Promise<ScanRead> {
  try {
    return await read(port, db, mem, gl, projectId, issues);
  } catch (e) {
    issues.push(`maturity scan: not read (${message(e)}); nothing stored`);
    return 'refused';
  }
}
