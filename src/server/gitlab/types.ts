// Domain types for what Belay reads from GitLab. Camel-cased, only the fields Belay uses;
// adapter/mappers.ts turns the raw REST JSON into these.

export type ProjectRef = number | string; // numeric id, or "group/path"

export interface GlUser { id: number; username: string; name: string; state: string; webUrl: string; bot: boolean }

export interface GlGroup { id: number; name: string; path: string; fullPath: string; visibility: string; webUrl: string }

/** GET /namespaces/:id. `plan` is the subscription tier ("free", "premium", "ultimate", ...). */
export interface GlNamespace { id: number; kind: string; fullPath: string; plan: string | null; trial: boolean; trialEndsOn: string | null; projectsCount: number | null }

export interface GlInstance { version: string; enterprise: boolean }

export interface GlProject {
  id: number; name: string; path: string; pathWithNamespace: string;
  defaultBranch: string | null; webUrl: string; visibility: string; archived: boolean;
}

export interface GlPipeline {
  id: number; iid: number | null; projectId: number; status: string; source: string | null;
  ref: string; sha: string; webUrl: string; createdAt: string; updatedAt: string;
}

export interface GlJob {
  id: number; name: string; stage: string; status: string; allowFailure: boolean;
  durationSec: number | null; ref: string; webUrl: string; pipelineId: number | null;
  startedAt: string | null; finishedAt: string | null; failureReason: string | null;
}

export interface GlTestSuiteSummary { name: string; total: number; success: number; failed: number; skipped: number; error: number }

/** GET .../test_report_summary: counts only, no case names. */
export interface GlTestSummary {
  timeSec: number; count: number; success: number; failed: number; skipped: number; error: number;
  suites: GlTestSuiteSummary[];
}

export interface GlMergeRequest {
  id: number; iid: number; projectId: number; title: string; description: string;
  state: string; draft: boolean; sourceBranch: string; targetBranch: string; author: string;
  labels: string[]; webUrl: string; sha: string | null; mergeStatus: string | null;
  createdAt: string; updatedAt: string; mergedAt: string | null; headPipelineId: number | null;
}

export interface GlNote { id: number; body: string; author: string; system: boolean; createdAt: string }

export interface GlDiff {
  oldPath: string; newPath: string; newFile: boolean; renamedFile: boolean; deletedFile: boolean;
  diff: string; added: number; removed: number; // counted from the hunk lines
}

export interface GlEnvironment { id: number; name: string; slug: string; state: string; tier: string | null; externalUrl: string | null }

export interface GlDeployment {
  id: number; iid: number; status: string; ref: string; sha: string; environment: string;
  createdAt: string; updatedAt: string; deployableId: number | null;
}

export interface GlRelease { tagName: string; name: string; description: string; createdAt: string; releasedAt: string | null; webUrl: string }

export interface GlVulnerability {
  id: number; title: string; severity: string; state: string; reportType: string;
  detectedAt: string; webUrl: string | null;
}

export interface GlSchedule { id: number; description: string; ref: string; cron: string; active: boolean; nextRunAt: string | null }

/**
 * A repository file with its decoded UTF-8 content. `lastCommitId` is GitLab's `last_commit_id`: the last commit that
 * changed the file at that ref (a write sends it back, so GitLab refuses the write if the file moved since). null when
 * GitLab did not say.
 */
export interface GlFile { path: string; ref: string; blobId: string; size: number; content: string; lastCommitId: string | null }

export interface GlTreeEntry { id: string; name: string; path: string; type: 'blob' | 'tree' | 'commit' }

/** An endpoint a plan may not include: the reason says why it is not there. */
export type Availability<T> = { status: 'available'; data: T } | { status: 'unavailable'; reason: string };

export interface PageOpts { limit?: number }
export interface PipelineFilter extends PageOpts { ref?: string; status?: string }
export interface MrFilter extends PageOpts { state?: 'opened' | 'merged' | 'closed' | 'all'; labels?: string[]; updatedAfter?: string }
export interface DeploymentFilter extends PageOpts { environment?: string; status?: string }
export interface TreeOpts { path?: string; ref?: string; recursive?: boolean }
