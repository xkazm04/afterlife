// Probe args for Azure DevOps, checked before anything starts: an org is an https://dev.azure.com/<name> URL, a project
// is a plain name (one argv token, so its spaces are safe), ids are digits. A bad value is a `fail`, never a call.

const ORG = /^https:\/\/dev\.azure\.com\/[A-Za-z0-9][A-Za-z0-9._-]{0,63}\/?$/;
const DIGITS = /^\d{1,12}$/;

export type AzArgs = { org: string; project: string; pipelineId?: string; runId?: string };

/** `Grinex` or `https://dev.azure.com/Grinex` -> the URL form; the config may hold either. */
export const orgUrl = (org: string): string => (/^https?:\/\//.test(org) ? org.replace(/\/$/, '') : `https://dev.azure.com/${org}`);

/** The args a kind needs, validated; a string is the reason they are not usable. */
export function azArgs(args: Record<string, string>, need: { pipelineId?: 'required' | 'optional'; runId?: 'required' }): AzArgs | string {
  const { org, project, pipelineId, runId } = args;
  if (!org || !ORG.test(org)) return 'org must be an https://dev.azure.com/<name> URL';
  if (!project || project.length > 64 || project.startsWith('-') || /[\p{Cc}"/\\]/u.test(project)) return 'project must be a plain Azure DevOps project name';
  if (need.pipelineId === 'required' && !pipelineId) return 'pipelineId is required';
  if (pipelineId !== undefined && !DIGITS.test(pipelineId)) return 'pipelineId must be digits';
  if (need.runId === 'required' && !runId) return 'runId is required';
  if (runId !== undefined && !DIGITS.test(runId)) return 'runId must be digits';
  return { org: org.replace(/\/$/, ''), project, ...(pipelineId ? { pipelineId } : {}), ...(runId ? { runId } : {}) };
}

/** The argv of each read-only call. JSON is parsed in TypeScript; no JMESPath ever reaches az. */
export const azArgv = {
  account: (): string[] => ['account', 'show', '-o', 'json'],
  pipelines: (a: AzArgs): string[] => ['pipelines', 'list', '--org', a.org, '--project', a.project, '-o', 'json'],
  runs: (a: AzArgs, top = 50): string[] => [
    'pipelines', 'runs', 'list', '--org', a.org, '--project', a.project, ...(a.pipelineId ? ['--pipeline-ids', a.pipelineId] : []), '--top', String(top), '-o', 'json',
  ],
  timeline: (a: AzArgs & { runId: string }): string[] => [
    'devops', 'invoke', '--org', a.org, '--area', 'build', '--resource', 'timeline', '--route-parameters', `project=${a.project}`, `buildId=${a.runId}`, '-o', 'json',
  ],
};
