// Read-only `glab api` calls for the GitLab CI provider: args checked first (a path_with_namespace, digit ids), argv
// only, JSON parsed in TypeScript. A failed call is `{ fail }` with the re-login command when the login lapsed.
import type { Exec } from '../types';
import { failSummary, parseJson } from '../probeResult';

const PATH = /^[A-Za-z0-9_.][A-Za-z0-9_.-]*(\/[A-Za-z0-9_.][A-Za-z0-9_.-]*)+$/;
const DIGITS = /^\d{1,12}$/;

export type GlabOut = { value: unknown } | { fail: string };

/** The args a kind needs, validated; a string is the reason they are not usable. */
export function glArgs(args: Record<string, string>, needPipeline: boolean): { path: string; pipelineId?: string } | string {
  const { path, pipelineId } = args;
  if (!path || !PATH.test(path) || path.includes('..')) return 'path must be a GitLab path_with_namespace (group/project)';
  if (needPipeline && !pipelineId) return 'pipelineId is required';
  if (pipelineId !== undefined && !DIGITS.test(pipelineId)) return 'pipelineId must be digits';
  return { path, ...(pipelineId ? { pipelineId } : {}) };
}

export const glArgv = {
  auth: (): string[] => ['auth', 'status'],
  pipelines: (path: string): string[] => ['api', `projects/${encodeURIComponent(path)}/pipelines?per_page=50`],
  jobs: (path: string, pipelineId: string): string[] => ['api', `projects/${encodeURIComponent(path)}/pipelines/${pipelineId}/jobs?per_page=100`],
};

export async function glabJson(exec: Exec, argv: string[]): Promise<GlabOut> {
  const r = await exec('glab', argv);
  if (r.code !== 0) return { fail: failSummary('glab', r) };
  const value = parseJson(r.stdout);
  return value === undefined ? { fail: 'glab printed something that is not JSON' } : { value };
}
