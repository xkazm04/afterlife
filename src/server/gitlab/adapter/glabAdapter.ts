// GitLabPort over `glab api`. Reads are GETs; the one write path is execute(PlannedCommand).
import { GitLabError, isKind } from '../errors';
import type { GitLabPort } from '../port';
import type { ProjectRef } from '../types';
import { planBuilders } from '../plan/builders';
import { GlabClient, type ClientConfig } from './client';
import { rec, recs } from './fields';
import {
  mapCommit, mapDeployment, mapEnvironment, mapFile, mapGroup, mapInstance, mapJob, mapNamespace, mapPipeline,
  mapProject, mapRelease, mapSchedule, mapTestSummary, mapTreeEntry, mapUser, mapVulnerability,
} from './mappers';
import { mapDiff, mapMergeRequest, mapNote } from './mappersMr';

const id = (p: ProjectRef): string => encodeURIComponent(String(p));

/**
 * Why argv is not the builders' grammar (`api [--hostname <host>] --method M <path> [-f k=v]...`), or null. Anything else
 * (-F reads @files, --input, a second path, a ../ that walks out of the resource, another host that glab would hand
 * GITLAB_TOKEN to) is never run.
 */
export function offGrammar(argv: readonly string[], host: string | undefined): string | null {
  if (argv[0] !== 'api') return 'only `glab api` commands may be executed';
  let path = 0;
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i] ?? '';
    if (a === '--hostname') { if (argv[++i] !== host || host === undefined) return 'a write goes only to the configured host'; }
    else if (a === '--method' || a === '-f') { if (++i >= argv.length) return `${a} needs a value`; }
    else if (a.startsWith('-')) return `flag ${a} is not one the write builders use`;
    else if (++path > 1) return 'a write names one endpoint';
    else if (/(^|\/)\.\.?(\/|$)|[?#]/.test(a)) return 'a write endpoint has no dot segment, query or fragment';
  }
  return path === 1 ? null : 'a write names one endpoint';
}

export function createGlabAdapter(cfg: ClientConfig): GitLabPort {
  const c = new GlabClient(cfg);
  // Offset pages of a newest-first list shift when a row arrives mid-walk: a row seen twice is kept once, by id.
  // Tree entries opt out: their id is a blob sha that two paths legitimately share.
  const list = async <T>(path: string, map: (r: Record<string, unknown>) => T, q = {}, limit?: number, byId = true): Promise<T[]> => {
    const seen = new Set<unknown>();
    const rows = recs(await c.getPages(path, q, limit), path);
    return rows.filter((r) => !byId || typeof r.id === 'undefined' || (!seen.has(r.id) && !!seen.add(r.id))).map(map);
  };
  const mrQuery = (f: { state?: string; labels?: string[]; updatedAfter?: string } = {}) => ({
    state: f.state, labels: f.labels?.join(','), updated_after: f.updatedAfter,
  });

  return {
    host: cfg.host,
    plan: planBuilders(cfg.host),
    currentUser: async () => mapUser(rec(await c.getJson('user'), 'user')),
    instance: async () => mapInstance(rec(await c.getJson('metadata'), 'metadata')),
    getGroup: async (g) => mapGroup(rec(await c.getJson(`groups/${id(g)}`), 'group')),
    getNamespace: async (g) => mapNamespace(rec(await c.getJson(`namespaces/${id(g)}`), 'namespace')),
    // with_shared defaults to true: a project shared in from another namespace is not one of the group's (F45).
    listProjects: (g) => list(`groups/${id(g)}/projects`, mapProject, { include_subgroups: true, with_shared: false }),

    listPipelines: (p, f = {}) => list(`projects/${id(p)}/pipelines`, mapPipeline, { ref: f.ref, status: f.status, scope: f.scope }, f.limit),
    listJobs: (p, pipelineId) => list(`projects/${id(p)}/pipelines/${pipelineId}/jobs`, mapJob),
    jobTrace: (p, jobId) => c.getText(`projects/${id(p)}/jobs/${jobId}/trace`),
    testReportSummary: async (p, pipelineId) => {
      try {
        return mapTestSummary(rec(await c.getJson(`projects/${id(p)}/pipelines/${pipelineId}/test_report_summary`), 'test_report_summary'));
      } catch (e) {
        if (isKind(e, 'not-found')) return null;
        throw e;
      }
    },

    listMergeRequests: (p, f = {}) => list(`projects/${id(p)}/merge_requests`, mapMergeRequest, mrQuery(f), f.limit),
    listGroupMergeRequests: (g, f = {}) => list(`groups/${id(g)}/merge_requests`, mapMergeRequest, mrQuery(f), f.limit),
    listNotes: (p, iid) => list(`projects/${id(p)}/merge_requests/${iid}/notes`, mapNote, { sort: 'asc', order_by: 'created_at' }),
    listDiffs: (p, iid) => list(`projects/${id(p)}/merge_requests/${iid}/diffs`, mapDiff),

    listEnvironments: (p) => list(`projects/${id(p)}/environments`, mapEnvironment),
    listDeployments: (p, f = {}) =>
      list(`projects/${id(p)}/deployments`, mapDeployment, { environment: f.environment, status: f.status, order_by: 'id', sort: 'desc' }, f.limit),
    listReleases: (p, o = {}) => list(`projects/${id(p)}/releases`, mapRelease, {}, o.limit),
    listSchedules: (p) => list(`projects/${id(p)}/pipeline_schedules`, mapSchedule),

    getFile: async (p, path, ref) => {
      try {
        return mapFile(rec(await c.getJson(`projects/${id(p)}/repository/files/${encodeURIComponent(path)}`, { ref }), 'file'));
      } catch (e) {
        if (isKind(e, 'not-found')) return null;
        throw e;
      }
    },
    listTree: (p, o = {}) => list(`projects/${id(p)}/repository/tree`, mapTreeEntry, { path: o.path, ref: o.ref, recursive: o.recursive }, undefined, false),
    listCommits: (p, f = {}) => list(`projects/${id(p)}/repository/commits`, mapCommit, { path: f.path, ref_name: f.ref }, f.limit),

    listVulnerabilities: async (p, o = {}) => {
      try {
        return { status: 'available', data: await list(`projects/${id(p)}/vulnerabilities`, mapVulnerability, {}, o.limit) };
      } catch (e) {
        if (isKind(e, 'forbidden', 'not-found')) return { status: 'unavailable', reason: `${e.status ?? ''} ${e.message}`.trim() };
        throw e;
      }
    },

    get: (path, query) => c.getJson(path, query),

    execute: async (planned) => {
      const off = offGrammar(planned.argv, cfg.host);
      if (off) throw new GitLabError('api', off, planned.display);
      const r = await c.run(planned.argv);
      let body: unknown = null;
      try { body = r.stdout.trim() ? JSON.parse(r.stdout) : null; } catch { body = null; }
      return { ok: true, stdout: r.stdout, body };
    },
  };
}
