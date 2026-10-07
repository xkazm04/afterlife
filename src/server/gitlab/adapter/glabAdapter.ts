// GitLabPort over `glab api`. Reads are GETs; the one write path is execute(PlannedCommand).
import { GitLabError, isKind } from '../errors';
import type { GitLabPort } from '../port';
import type { ProjectRef } from '../types';
import { planBuilders } from '../plan/builders';
import { GlabClient, type ClientConfig } from './client';
import { rec, recs } from './fields';
import {
  mapDeployment, mapEnvironment, mapFile, mapGroup, mapInstance, mapJob, mapNamespace, mapPipeline,
  mapProject, mapRelease, mapSchedule, mapTestSummary, mapTreeEntry, mapUser, mapVulnerability,
} from './mappers';
import { mapDiff, mapMergeRequest, mapNote } from './mappersMr';

const id = (p: ProjectRef): string => encodeURIComponent(String(p));

export function createGlabAdapter(cfg: ClientConfig): GitLabPort {
  const c = new GlabClient(cfg);
  const list = async <T>(path: string, map: (r: Record<string, unknown>) => T, q = {}, limit?: number): Promise<T[]> =>
    recs(await c.getPages(path, q, limit), path).map(map);
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

    listPipelines: (p, f = {}) => list(`projects/${id(p)}/pipelines`, mapPipeline, { ref: f.ref, status: f.status }, f.limit),
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
    listTree: (p, o = {}) => list(`projects/${id(p)}/repository/tree`, mapTreeEntry, { path: o.path, ref: o.ref, recursive: o.recursive }),

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
      if (planned.argv[0] !== 'api') throw new GitLabError('api', 'only `glab api` commands may be executed', planned.display);
      const r = await c.run(planned.argv);
      let body: unknown = null;
      try { body = r.stdout.trim() ? JSON.parse(r.stdout) : null; } catch { body = null; }
      return { ok: true, stdout: r.stdout, body };
    },
  };
}
