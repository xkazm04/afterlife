// The poller reads the newest belay-maturity-scan job's .belay/maturity.json (belay.maturity/0) and stores its nine cells, so
// a real scan reaches /maturity. No scan job writes nothing; an artifact that is missing, unparsable or invalid writes nothing
// and is the poll's issue; a scan already stored is not read again.
import { describe, expect, it } from 'vitest';
import { GitLabError } from '@/server/gitlab/errors';
import { LEDGERLINE_GID } from '@/server/gitlab/fake/demo/ids';
import type { GitLabPort, GlJob, GlPipeline } from '@/server/gitlab/port';
import { seedDemo } from '@/server/index/seed';
import { getMaturity } from '@/server/index/views/maturity';
import { STAGES } from '@/schemas/stages';
import { NOW, rig, type Rig } from '../helpers';

const PIPE = 990_001;
const JOB = 880_001;
const WEB = 'https://gitlab.com/acme-lab/core-banking/ledgerline';
const artifactPath = (job: number) => `projects/${LEDGERLINE_GID}/jobs/${job}/artifacts/.belay/maturity.json`;
const at = (minAgo: number) => new Date(NOW.getTime() - minAgo * 60_000).toISOString();

const RUNG: Record<string, number | null> = { plan: 0, create: 1, verify: 2, package: null, secure: 1, release: 0, configure: 0, monitor: 0, govern: 1 };
function scanDoc(o: { scannedAt?: string; rung?: Partial<Record<string, number | null>>; projectId?: number } = {}) {
  return {
    schema: 'belay.maturity/0', project_id: o.projectId ?? LEDGERLINE_GID, engine_version: '1.0.0', scanned_at: o.scannedAt ?? at(3),
    cells: STAGES.map((stage) => {
      const rung = stage in (o.rung ?? {}) ? (o.rung?.[stage] ?? null) : (RUNG[stage] ?? null);
      return {
        stage, rung, next_rung: rung === null ? null : rung + 1,
        evidence: rung ? [{ label: `job ${stage}-job #7`, url: `${WEB}/-/jobs/7` }] : [],
        note: rung === null ? 'unknown: ci_config could not be read (403)' : `scan note for ${stage}`,
      };
    }),
  };
}

/** A valid scan whose verify cell cites `url`. */
const citing = (url: string) => {
  const doc = scanDoc();
  return { ...doc, cells: doc.cells.map((c) => (c.stage === 'verify' ? { ...c, evidence: [{ label: 'job #7', url }] } : c)) };
};

const pipeline = (id: number, minAgo: number): GlPipeline => ({
  id, iid: null, projectId: LEDGERLINE_GID, status: 'failed', source: 'schedule', ref: 'main', sha: 'f'.repeat(40),
  webUrl: `${WEB}/-/pipelines/${id}`, createdAt: at(minAgo + 2), updatedAt: at(minAgo),
});
const job = (id: number, pipelineId: number, minAgo: number): GlJob => ({
  id, name: 'belay-maturity-scan', stage: '.post', status: 'failed', allowFailure: true, durationSec: 60, ref: 'main',
  webUrl: `${WEB}/-/jobs/${id}`, pipelineId, startedAt: at(minAgo + 1), finishedAt: at(minAgo), failureReason: 'script_failure',
});

interface Scan { pipelineId: number; jobId: number; minAgo: number; artifact: unknown | (() => never) }

/** The demo GitLab with scheduled scan pipelines on ledgerline, newest first. `reads` lists every artifact GET. */
function withScans(port: GitLabPort, scans: Scan[], reads: string[]): GitLabPort {
  return new Proxy(port, {
    get: (t, k, r) => {
      if (k === 'listPipelines') {
        return async (p: number, f?: object) => [...(p === LEDGERLINE_GID ? scans.map((s) => pipeline(s.pipelineId, s.minAgo)) : []), ...(await t.listPipelines(p, f))];
      }
      if (k === 'listJobs') {
        return async (p: number, id: number) => {
          const s = scans.find((x) => x.pipelineId === id);
          return s ? [job(s.jobId, id, s.minAgo)] : t.listJobs(p, id);
        };
      }
      if (k === 'get') {
        return async (path: string, q?: Record<string, string>) => {
          const s = scans.find((x) => artifactPath(x.jobId) === path);
          if (!s) return t.get(path, q);
          reads.push(path);
          return typeof s.artifact === 'function' ? (s.artifact as () => never)() : structuredClone(s.artifact);
        };
      }
      return Reflect.get(t, k, r);
    },
  });
}

const cells = async (r: Rig) => (await r.db.query<{ n: number }>('select count(*)::int as n from stage_cell')).rows[0]?.n ?? 0;
const issuesOf = (res: Awaited<ReturnType<Rig['poll']>>) => res.projects.find((p) => p.gitlabId === LEDGERLINE_GID)?.issues ?? [];

describe('the poller stores a maturity scan', () => {
  it('(i) a scan job and its artifact make getMaturity return that scan\'s rungs, evidence and engine, not the demo\'s', async () => {
    const r = await rig();
    await seedDemo(r.db);
    const demo = await getMaturity(r.db, 'ledgerline');
    expect(demo?.engine).toBe('v1');
    await r.poll(NOW, withScans(r.gl.port, [{ pipelineId: PIPE, jobId: JOB, minAgo: 2, artifact: scanDoc() }], []));
    const m = await getMaturity(r.db, 'ledgerline');
    expect(m?.engine).toBe('1.0.0');
    expect(m?.scannedAt).toBe(at(3).slice(11, 16));
    expect(m?.rungs.map((x) => x.now)).toEqual(STAGES.map((s) => RUNG[s]));
    expect(m?.rungs.find((x) => x.stage === 'verify')?.evidence).toBe('scan note for verify');
    expect(m?.rungs.find((x) => x.stage === 'package')).toMatchObject({ now: null, next: null });
    const stored = await r.db.query<{ evidence: unknown }>("select evidence from stage_cell where stage = 'verify' and engine_version = '1.0.0'");
    expect(stored.rows[0]?.evidence).toEqual([{ label: 'job verify-job #7', url: `${WEB}/-/jobs/7` }]);
  });

  it('day 0 is the earliest stored scan of the stage; a null rung stays null', async () => {
    const r = await rig();
    const reads: string[] = [];
    const first = { pipelineId: PIPE, jobId: JOB, minAgo: 60, artifact: scanDoc({ scannedAt: at(61) }) };
    await r.poll(NOW, withScans(r.gl.port, [first], reads));
    const day0 = await getMaturity(r.db, 'ledgerline');
    expect(day0?.rungs.map((x) => x.day0)).toEqual(STAGES.map((s) => RUNG[s]));
    const later = { pipelineId: PIPE + 1, jobId: JOB + 1, minAgo: 2, artifact: scanDoc({ rung: { verify: 3, package: 2 } }) };
    await r.poll(NOW, withScans(r.gl.port, [later, first], reads));
    const m = await getMaturity(r.db, 'ledgerline');
    expect(m?.rungs.find((x) => x.stage === 'verify')).toMatchObject({ day0: 2, now: 3 });
    expect(m?.rungs.find((x) => x.stage === 'package')).toMatchObject({ day0: null, now: 2 });
    expect(reads).toEqual([artifactPath(JOB), artifactPath(JOB + 1)]);
  });

  it('(ii) no scan job writes no row, and the screen stays "not scanned"', async () => {
    const r = await rig();
    const res = await r.poll();
    expect(await cells(r)).toBe(0);
    expect(await getMaturity(r.db, 'ledgerline')).toBeNull();
    expect(issuesOf(res).filter((i) => /maturity/.test(i))).toEqual([]);
  });

  it.each([
    ['invalid', scanDoc({ rung: { verify: 7 } }), /maturity scan: .*job 880001.*rung must be/],
    ['about another project', scanDoc({ projectId: 1 }), /maturity scan: .*about project 1, not 90010001/],
    ['unparsable', () => { throw new GitLabError('parse', 'response is not JSON', 'artifacts'); }, /maturity scan: .*response is not JSON/],
    ['missing', () => { throw new GitLabError('not-found', '404 Not Found', 'artifacts'); }, /maturity scan: .*404 Not Found/],
    // F103: a scan dated after its job would make every later real scan look already stored; one dated before rewrites day 0
    ['dated after its job finished', scanDoc({ scannedAt: '2999-01-01T00:00:00.000Z' }), /maturity scan: .*scanned_at 2999-01-01T00:00:00.000Z, outside job 880001's run/],
    ['dated before its job started', scanDoc({ scannedAt: at(24 * 60) }), /maturity scan: .*scanned_at .*, outside job 880001's run/],
    // F104: every lit cell cites a GitLab object under the project; a link elsewhere is not evidence
    ['citing another site', citing('https://gitlab.com.evil.example/x'), /maturity scan: .*cell verify cites https:\/\/gitlab\.com\.evil\.example\/x, not under https:\/\/gitlab\.com\/acme-lab\/core-banking\/ledgerline\//],
    ['citing a sibling path', citing(`${WEB}-evil/-/jobs/7`), /maturity scan: .*cell verify cites .*ledgerline-evil\/-\/jobs\/7, not under/],
  ])('(iii) an %s artifact writes no row and is the poll\'s issue', async (_what, artifact, issue) => {
    const r = await rig();
    const res = await r.poll(NOW, withScans(r.gl.port, [{ pipelineId: PIPE, jobId: JOB, minAgo: 2, artifact }], []));
    expect(await cells(r)).toBe(0);
    expect(issuesOf(res)).toEqual(expect.arrayContaining([expect.stringMatching(issue)]));
    expect(res.projects.find((p) => p.gitlabId === LEDGERLINE_GID)?.ok).toBe(true);
  });

  it('(iv) a second poll over the same scan reads no artifact; a new scan is read', async () => {
    const r = await rig();
    const reads: string[] = [];
    const scan = { pipelineId: PIPE, jobId: JOB, minAgo: 2, artifact: scanDoc() };
    await r.poll(NOW, withScans(r.gl.port, [scan], reads));
    await r.poll(new Date(NOW.getTime() + 30_000), withScans(r.gl.port, [scan], reads));
    expect(reads).toEqual([artifactPath(JOB)]);
    const bad = { pipelineId: PIPE + 1, jobId: JOB + 1, minAgo: 1, artifact: { schema: 'nope' } };
    const a = await r.poll(new Date(NOW.getTime() + 60_000), withScans(r.gl.port, [bad, scan], reads));
    const b = await r.poll(new Date(NOW.getTime() + 90_000), withScans(r.gl.port, [bad, scan], reads));
    expect(reads).toEqual([artifactPath(JOB), artifactPath(JOB + 1)]); // an invalid artifact is not read again either
    for (const res of [a, b]) expect(issuesOf(res)).toEqual(expect.arrayContaining([expect.stringMatching(/maturity scan: .*job 880002/)]));
  });
});
