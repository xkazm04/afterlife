// The human steps a GitLab read can observe, read only (src/app/features/setup/data/stepDetail.ts names each step).
// 3: the group's plan and trial. 6: a gitlab--duo runner online for the target. 8: the parts of belay-apply's settings
// that hold no secret. 10: the bootstrap MR merged and the agent config on the target's default branch.
// Step 7 is not read: GitLab's integrations API documents its GET path two ways (integration/ and integrations/), and a
// saved integration does not show that the Cloud Shell script ran (docs.gitlab.com/api/project_integrations).
// Step 8 never reads a CI/CD variable: the variables API returns values, and the step promises Belay never sees one.
import { belayOf, done, failed, guarded, obj, rows, targetOf, unknown, type StepCtx } from './ctx';
import type { StepRead } from './types';

export const RUNNER_TAG = 'gitlab--duo';
export const BOOTSTRAP_BRANCH = 'belay/bootstrap';
export const AGENT_CONFIG = '.gitlab/duo/agent-config.yml';
/** Why step 8 can never read done: said on every read of it. */
export const TOKENS_UNREAD = 'the four BELAY_* tokens are not read, by design: the variables API returns values';

/** Step 3: an Ultimate plan or trial on the group (GET /namespaces/:id, `plan`, `trial`, `trial_ends_on`). */
export function licenceRead(c: StepCtx): Promise<StepRead> {
  return guarded("reading the group's plan", async () => {
    const ns = await c.port.getNamespace(c.groupId);
    const plan = ns.plan ?? 'no plan';
    const trial = ns.trial ? ` · trial ends ${ns.trialEndsOn ?? 'on a date GitLab did not give'}` : '';
    if (!/^ultimate/.test(plan)) return failed(`${c.group} is on ${plan}${trial} · no Ultimate plan or trial`);
    if (ns.trial && ns.trialEndsOn && ns.trialEndsOn < c.today) return failed(`${c.group}'s Ultimate trial ended ${ns.trialEndsOn}`);
    return done(`${c.group} is on ${plan}${trial}`);
  });
}

/** Step 6: GET /projects/:id/runners?tag_list=gitlab--duo&status=online (docs.gitlab.com/api/runners). */
export function runnerRead(c: StepCtx): Promise<StepRead> {
  return guarded('listing the target’s runners', async () => {
    const t = targetOf(c);
    const all = rows(await c.port.get(`projects/${t.id}/runners`, { tag_list: RUNNER_TAG, status: 'online' }), 'runners');
    const online = all.filter((r) => r.online === true || r.status === 'online').length;
    const text = `${online} runner${online === 1 ? '' : 's'} with tag ${RUNNER_TAG} online for ${t.pathWithNamespace}`;
    return online ? done(text) : failed(text);
  });
}

/** Step 8, its parts that hold no secret: belay-apply's minimum role for pipeline variables and its schedule on main. */
export function secretsRead(c: StepCtx): Promise<StepRead> {
  return guarded('reading belay-apply’s settings', async () => {
    const apply = belayOf(c, 'belay-apply');
    const [p, schedules] = await Promise.all([c.port.get(`projects/${apply.id}`), c.port.listSchedules(apply.id)]);
    const role = obj(p, 'project').ci_pipeline_variables_minimum_override_role;
    const differ: string[] = [];
    if (role !== 'no_one_allowed') differ.push(`minimum role to use pipeline variables is ${typeof role === 'string' ? role : 'not given'}, not no_one_allowed`);
    if (!schedules.some((s) => s.active && (s.ref === 'main' || s.ref === 'refs/heads/main'))) differ.push('no active pipeline schedule on main');
    if (differ.length) return failed(`belay-apply: ${differ.join(' · ')} · ${TOKENS_UNREAD}`);
    return unknown(`belay-apply: minimum role no_one_allowed · a schedule on main (its variables are not read) · ${TOKENS_UNREAD}`);
  });
}

/** Step 10: an MR from belay/bootstrap merged, and the agent config on the target's default branch. */
export function bootstrapRead(c: StepCtx): Promise<StepRead> {
  return guarded('reading the bootstrap MR', async () => {
    const t = targetOf(c);
    const base = t.defaultBranch ?? 'main';
    const [mrs, file] = await Promise.all([
      c.port.get(`projects/${t.id}/merge_requests`, { source_branch: BOOTSTRAP_BRANCH, state: 'all' }),
      c.port.getFile(t.id, AGENT_CONFIG, base),
    ]);
    const all = rows(mrs, 'merge_requests');
    const merged = all.find((m) => m.state === 'merged');
    const open = all.find((m) => m.state === 'opened');
    const mr = merged ? `!${String(merged.iid)} merged` : open ? `!${String(open.iid)} open` : `no MR from ${BOOTSTRAP_BRANCH}`;
    const text = `${mr} · ${AGENT_CONFIG} ${file ? 'on' : 'absent on'} ${base}`;
    return merged && file ? done(text) : failed(text);
  });
}
