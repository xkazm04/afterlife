// Raw GitLab REST JSON -> domain types (core, CI and delivery).
import type {
  GlDeployment, GlEnvironment, GlFile, GlGroup, GlInstance, GlJob, GlNamespace, GlPipeline, GlProject,
  GlRelease, GlSchedule, GlTestSummary, GlTreeEntry, GlUser, GlVulnerability,
} from '../types';
import { GitLabError } from '../errors';
import { bool, num, numN, rec, str, strN, strOr, type Rec } from './fields';

const sub = (r: Rec, k: string): Rec | null => (r[k] !== null && typeof r[k] === 'object' ? (r[k] as Rec) : null);

export const mapUser = (r: Rec): GlUser => ({
  id: num(r, 'id'), username: str(r, 'username'), name: strOr(r, 'name', ''), state: strOr(r, 'state', ''),
  webUrl: strOr(r, 'web_url', ''), bot: bool(r, 'bot'),
});

export const mapGroup = (r: Rec): GlGroup => ({
  id: num(r, 'id'), name: str(r, 'name'), path: str(r, 'path'), fullPath: strOr(r, 'full_path', str(r, 'path')),
  visibility: strOr(r, 'visibility', ''), webUrl: strOr(r, 'web_url', ''),
});

export const mapNamespace = (r: Rec): GlNamespace => ({
  id: num(r, 'id'), kind: strOr(r, 'kind', ''), fullPath: strOr(r, 'full_path', ''), plan: strN(r, 'plan'),
  trial: bool(r, 'trial'), trialEndsOn: strN(r, 'trial_ends_on'), projectsCount: numN(r, 'projects_count'),
});

export const mapInstance = (r: Rec): GlInstance => ({ version: str(r, 'version'), enterprise: bool(r, 'enterprise') });

export const mapProject = (r: Rec): GlProject => ({
  id: num(r, 'id'), name: str(r, 'name'), path: str(r, 'path'), pathWithNamespace: str(r, 'path_with_namespace'),
  defaultBranch: strN(r, 'default_branch'), webUrl: strOr(r, 'web_url', ''), visibility: strOr(r, 'visibility', ''),
  archived: bool(r, 'archived'),
});

export const mapPipeline = (r: Rec): GlPipeline => ({
  id: num(r, 'id'), iid: numN(r, 'iid'), projectId: num(r, 'project_id'), status: str(r, 'status'), source: strN(r, 'source'),
  ref: str(r, 'ref'), sha: str(r, 'sha'), webUrl: strOr(r, 'web_url', ''), createdAt: str(r, 'created_at'), updatedAt: str(r, 'updated_at'),
});

export const mapJob = (r: Rec): GlJob => ({
  id: num(r, 'id'), name: str(r, 'name'), stage: strOr(r, 'stage', ''), status: str(r, 'status'),
  allowFailure: bool(r, 'allow_failure'), durationSec: numN(r, 'duration'), ref: strOr(r, 'ref', ''),
  webUrl: strOr(r, 'web_url', ''), pipelineId: sub(r, 'pipeline') ? numN(sub(r, 'pipeline') as Rec, 'id') : null,
  startedAt: strN(r, 'started_at'), finishedAt: strN(r, 'finished_at'), failureReason: strN(r, 'failure_reason'),
});

/** GET .../test_report_summary: { total: {time, count, success, failed, skipped, error}, test_suites: [{name, total_count, success_count, ...}] } */
export function mapTestSummary(r: Rec): GlTestSummary {
  const total = rec(r.total, 'test_report_summary.total');
  const suites = Array.isArray(r.test_suites) ? (r.test_suites as unknown[]).map((s) => rec(s, 'test_suites')) : [];
  return {
    timeSec: numN(total, 'time') ?? 0, count: numN(total, 'count') ?? 0,
    success: numN(total, 'success') ?? 0, failed: numN(total, 'failed') ?? 0,
    skipped: numN(total, 'skipped') ?? 0, error: numN(total, 'error') ?? 0,
    suites: suites.map((s) => ({
      name: strOr(s, 'name', ''), total: numN(s, 'total_count') ?? 0, success: numN(s, 'success_count') ?? 0,
      failed: numN(s, 'failed_count') ?? 0, skipped: numN(s, 'skipped_count') ?? 0, error: numN(s, 'error_count') ?? 0,
    })),
  };
}

export const mapEnvironment = (r: Rec): GlEnvironment => ({
  id: num(r, 'id'), name: str(r, 'name'), slug: strOr(r, 'slug', ''), state: strOr(r, 'state', ''),
  tier: strN(r, 'tier'), externalUrl: strN(r, 'external_url'),
});

export const mapDeployment = (r: Rec): GlDeployment => ({
  id: num(r, 'id'), iid: num(r, 'iid'), status: str(r, 'status'), ref: str(r, 'ref'), sha: strOr(r, 'sha', ''),
  environment: sub(r, 'environment') ? str(sub(r, 'environment') as Rec, 'name') : '',
  createdAt: str(r, 'created_at'), updatedAt: str(r, 'updated_at'),
  deployableId: sub(r, 'deployable') ? numN(sub(r, 'deployable') as Rec, 'id') : null,
});

export const mapRelease = (r: Rec): GlRelease => ({
  tagName: str(r, 'tag_name'), name: strOr(r, 'name', ''), description: strOr(r, 'description', ''),
  createdAt: str(r, 'created_at'), releasedAt: strN(r, 'released_at'),
  webUrl: sub(r, '_links') ? strOr(sub(r, '_links') as Rec, 'self', '') : '',
});

export const mapVulnerability = (r: Rec): GlVulnerability => ({
  id: num(r, 'id'), title: str(r, 'title'), severity: str(r, 'severity'), state: strOr(r, 'state', ''),
  reportType: strOr(r, 'report_type', ''), detectedAt: strOr(r, 'created_at', ''), webUrl: strN(r, 'web_url'),
});

export const mapSchedule = (r: Rec): GlSchedule => ({
  id: num(r, 'id'), description: strOr(r, 'description', ''), ref: strOr(r, 'ref', ''), cron: strOr(r, 'cron', ''),
  active: bool(r, 'active'), nextRunAt: strN(r, 'next_run_at'),
});

export const mapTreeEntry = (r: Rec): GlTreeEntry => {
  const type = str(r, 'type');
  if (type !== 'blob' && type !== 'tree' && type !== 'commit') throw new GitLabError('parse', `tree entry type ${type}`, 'tree');
  return { id: str(r, 'id'), name: str(r, 'name'), path: str(r, 'path'), type };
};

/** GET .../repository/files/:path: content arrives base64 encoded. */
export function mapFile(r: Rec): GlFile {
  const encoding = strOr(r, 'encoding', 'base64');
  if (encoding !== 'base64') throw new GitLabError('parse', `file encoding ${encoding}`, 'repository/files');
  return {
    path: str(r, 'file_path'), ref: strOr(r, 'ref', ''), blobId: strOr(r, 'blob_id', ''), size: numN(r, 'size') ?? 0,
    content: Buffer.from(str(r, 'content'), 'base64').toString('utf8'), lastCommitId: strN(r, 'last_commit_id'),
  };
}
