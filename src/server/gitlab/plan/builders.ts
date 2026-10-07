// Pure builders for every write Belay can make. They only return data: nothing here runs glab.
import type { ProjectRef } from '../types';
import type {
  AddNoteInput, ApproveDeploymentInput, CommitFileInput, CreateMrInput, PauseScheduleInput,
  PlanBuilders, PlannedCommand, Risk, SetIssueLabelsInput, SetLabelsInput,
} from './types';

const proj = (p: ProjectRef): string => encodeURIComponent(String(p));

/** Quotes one argument the way a POSIX shell would need it, for the preview only. */
export function shellQuote(arg: string): string {
  return /^[A-Za-z0-9_@%+=:,./-]+$/.test(arg) ? arg : `'${arg.replace(/'/g, "'\\''")}'`;
}

function build(hostname: string | undefined, method: 'POST' | 'PUT', path: string, fields: Array<[string, string]>, risk: Risk): PlannedCommand {
  const argv = [
    'api', ...(hostname ? ['--hostname', hostname] : []), '--method', method, path,
    ...fields.flatMap(([k, v]) => ['-f', `${k}=${v}`]),
  ];
  return { argv, display: ['glab', ...argv].map(shellQuote).join(' '), risk };
}

const optional = (k: string, v: string | undefined): Array<[string, string]> => (v === undefined ? [] : [[k, v]]);
const POLICY_FILE = /(^|\/)(tier-state|trust-policy)\.ya?ml$|^belay-policy\//;

export function planBuilders(hostname?: string): PlanBuilders {
  return {
    createMr: (i: CreateMrInput) =>
      build(hostname, 'POST', `projects/${proj(i.project)}/merge_requests`, [
        ['source_branch', i.sourceBranch], ['target_branch', i.targetBranch], ['title', i.title],
        ...optional('description', i.description), ...optional('labels', i.labels?.join(',')),
      ], 'low'),
    addNote: (i: AddNoteInput) =>
      build(hostname, 'POST', `projects/${proj(i.project)}/merge_requests/${i.iid}/notes`, [['body', i.body]], 'low'),
    // add_labels / remove_labels rather than labels=: they never overwrite a label a person added meanwhile.
    setLabels: (i: SetLabelsInput) =>
      build(hostname, 'PUT', `projects/${proj(i.project)}/merge_requests/${i.iid}`, [
        ...optional('add_labels', i.add?.length ? i.add.join(',') : undefined),
        ...optional('remove_labels', i.remove?.length ? i.remove.join(',') : undefined),
      ], [...(i.add ?? []), ...(i.remove ?? [])].some((l) => l.startsWith('belay::tier::')) ? 'policy' : 'low'),
    setIssueLabels: (i: SetIssueLabelsInput) =>
      build(hostname, 'PUT', `projects/${proj(i.project)}/issues/${i.iid}`, [
        ...optional('add_labels', i.add?.length ? i.add.join(',') : undefined),
        ...optional('remove_labels', i.remove?.length ? i.remove.join(',') : undefined),
      ], 'low'),
    commitFile: (i: CommitFileInput) => ({
      ...build(hostname, i.action === 'create' ? 'POST' : 'PUT',
        `projects/${proj(i.project)}/repository/files/${encodeURIComponent(i.path)}`,
        [['branch', i.branch], ['commit_message', i.message], ['content', i.content], ...optional('start_branch', i.startBranch)],
        POLICY_FILE.test(i.path) ? 'policy' : 'low'),
      file: { project: i.project, path: i.path, branch: i.branch },
    }),
    pauseSchedule: (i: PauseScheduleInput) =>
      build(hostname, 'PUT', `projects/${proj(i.project)}/pipeline_schedules/${i.scheduleId}`, [['active', 'false']], 'policy'),
    approveDeployment: (i: ApproveDeploymentInput) =>
      build(hostname, 'POST', `projects/${proj(i.project)}/deployments/${i.deploymentId}/approval`,
        [['status', i.status], ...optional('comment', i.comment)], 'merge'),
  };
}
