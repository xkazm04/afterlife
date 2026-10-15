// Arm and disarm a track: one MR each, as the operator, in the paired target project, from a branch the plan creates.
// Arm adds the track's include lines to .gitlab-ci.yml (content/), between markers; disarm removes exactly those lines.
// Both commits carry the file's last_commit_id as read, so a commit landing in between is refused by GitLab, not
// overwritten. Neither reads, writes or names a token value, and neither sets a CI variable: the person does that.
// The branch is new or the plan refuses (F38): a commit is never planned onto an existing branch, and force is never set.
import type { GitLabPort } from '@/server/gitlab/port';
import type { GlFile, GlProject } from '@/server/gitlab/types';
import { ActionRefused, lastCommitOf, noBranch, watchedProject, type Plan, type PlanContext } from '../plans/context';
import type { ArmTrack, DisarmTrack } from '../types';
import { findBlock, insertBlock, removeBlock } from './block';
import { blockerOf, holdsBlock, placementOf } from './checks';
import { armOf, NOT_DEFINED, type ArmPin, type TrackArm } from './content';

export const CI_FILE = '.gitlab-ci.yml';

const MR_LABEL = 'belay::arm';

export function trackArm(track: string): TrackArm {
  const a = armOf(track);
  if (!a) throw new ActionRefused(NOT_DEFINED(track));
  return a;
}

export interface Target {
  project: GlProject;
  base: string;
  /** The paired group's full path: the arm's include names its belay-pack. */
  group: string;
}

/**
 * The paired target project, by its index id. Read only: plans/context.ts watchedProject's rules, which locate() applies to
 * every other write (F37, F47: under the group's path; F48: one match; F50: never Belay's own project).
 */
export async function targetOf(port: GitLabPort, groupId: string | number, gitlabId: PlanContext['gitlabId'], infra: readonly string[], indexId: string): Promise<Target> {
  const [all, gid, group] = await Promise.all([port.listProjects(groupId), gitlabId(indexId), port.getGroup(groupId)]);
  const project = watchedProject(all, gid, indexId, infra, group.fullPath);
  return { project, base: project.defaultBranch ?? 'main', group: group.fullPath };
}

function pinFor(ctx: PlanContext): ArmPin {
  if (!ctx.arm) throw new ActionRefused("Belay's environment gives no arm settings: nothing is planned");
  if (!ctx.arm.ok) throw new ActionRefused(ctx.arm.reason);
  return ctx.arm.pin;
}

async function ciFile(ctx: PlanContext, t: Target, missing: string): Promise<GlFile & { lastCommitId: string }> {
  const file = await ctx.port.getFile(t.project.id, CI_FILE, t.base);
  if (!file) throw new ActionRefused(`${t.project.pathWithNamespace} has no ${CI_FILE} on ${t.base}: ${missing}`);
  return { ...file, lastCommitId: lastCommitOf(file, CI_FILE) };
}

async function noOpenMr(ctx: PlanContext, t: Target, branch: string): Promise<void> {
  const open = (await ctx.port.listMergeRequests(t.project.id, { state: 'opened' })).find((m) => m.sourceBranch === branch);
  if (open) throw new ActionRefused(`!${open.iid} from ${branch} is already open: merge or close it first`);
}

const description = (ctx: PlanContext, what: string, notes: readonly string[]): string =>
  [`Prepared by Belay for ${ctx.operator}.`, what, ...(notes.length ? [notes.map((n) => `- ${n}`).join('\n')] : []), 'A person merges this; Belay never does.'].join('\n\n');

export async function planArm(ctx: PlanContext, intent: ArmTrack): Promise<Plan> {
  const a = trackArm(intent.track);
  const pin = pinFor(ctx);
  const gap = a.refuses?.(pin);
  if (gap) throw new ActionRefused(gap);
  const t = await targetOf(ctx.port, ctx.groupId, ctx.gitlabId, ctx.cfg.infra, intent.project);
  const file = await ciFile(ctx, t, 'an arm adds include lines to a pipeline that exists');
  const found = findBlock(file.content, a);
  if (found.state === 'armed') throw new ActionRefused(`${a.track} is already armed: its block is on ${t.base} (${CI_FILE} line ${found.from + 1})`);
  if (found.state === 'edited') throw new ActionRefused(`${CI_FILE} on ${t.base} has a ${a.track} block that was edited after it was added (line ${found.from + 1}): sort it out by hand first`);
  const at = placementOf(file.content, a, pin);
  if (typeof at === 'string') throw new ActionRefused(at);
  const wanted = a.includes(pin, at);
  const blocker = blockerOf(file.content, wanted);
  if (blocker) throw new ActionRefused(blocker);
  const branch = `belay/arm-${a.key}`;
  await noOpenMr(ctx, t, branch);
  await noBranch(ctx.port, t.project, branch);
  const ins = insertBlock(file.content, a, t.group, pin, at);
  if (!ins.ok) throw new ActionRefused(ins.reason);
  if (!holdsBlock(ins.content, wanted)) throw new ActionRefused(`Belay could not add ${a.track}'s lines to ${CI_FILE} without breaking it: nothing is planned`);

  const stages = wanted.map((w) => `${w.component} in ${at[w.component] ?? '?'}`).join(', ');
  const what = `Adds ${a.track}'s include lines (${stages}) to ${CI_FILE}, between belay:arm markers. Disarm opens an MR that removes exactly these lines.`;
  return {
    title: a.title,
    summary: `Opens one MR in ${t.project.pathWithNamespace} as ${ctx.operator}, from a new branch ${branch} off ${t.base}. You merge it; then Verify reads ${t.base}.`,
    branch, notes: a.notes,
    commands: [
      ctx.port.plan.commitFile({
        project: t.project.id, path: CI_FILE, branch, startBranch: t.base, content: ins.content, action: 'update', lastCommitId: file.lastCommitId,
        message: `${a.title}\n\nBelay-Track: ${a.track}\nOperator: ${ctx.operator}`,
      }),
      ctx.port.plan.createMr({ project: t.project.id, sourceBranch: branch, targetBranch: t.base, title: a.title, labels: [MR_LABEL], removeSourceBranch: true, description: description(ctx, what, a.notes) }),
    ],
    diff: [`@@ ${CI_FILE} · after line ${ins.after}`, ...ins.added.map((l) => `+ ${l}`)],
  };
}

const DISARM_NOTE = "Disarm removes the include lines only. BELAY_BOT_TOKEN lives on belay-apply, never on this project: to stop Belay writing here, remove the project from belay-apply's apply.json yourself.";

export async function planDisarm(ctx: PlanContext, intent: DisarmTrack): Promise<Plan> {
  const a = trackArm(intent.track);
  const t = await targetOf(ctx.port, ctx.groupId, ctx.gitlabId, ctx.cfg.infra, intent.project);
  const file = await ciFile(ctx, t, `there is no ${a.track} block to revert`);
  const rm = removeBlock(file.content, a);
  if (!rm.ok && rm.found.state === 'absent') throw new ActionRefused(`${a.track} is not armed on ${t.base}: ${CI_FILE} has no ${a.track} block, so there is nothing to revert`);
  if (!rm.ok) throw new ActionRefused(`the ${a.track} block on ${t.base} was edited after it was added: Belay removes only exactly what it added, so revert it by hand`);
  const branch = `belay/disarm-${a.key}`;
  await noOpenMr(ctx, t, branch);
  await noBranch(ctx.port, t.project, branch);

  const title = `Disarm ${a.track} ${a.key}: revert its arm block`;
  const what = `Removes exactly the ${rm.removed.length} lines ${a.track}'s arm MR added to ${CI_FILE} (markers included), and nothing else.`;
  return {
    title,
    summary: `Opens one MR in ${t.project.pathWithNamespace} as ${ctx.operator}, from a new branch ${branch} off ${t.base}: the revert of the arm block. You merge it; then Verify reads ${t.base}.`,
    branch, notes: [DISARM_NOTE],
    commands: [
      ctx.port.plan.commitFile({
        project: t.project.id, path: CI_FILE, branch, startBranch: t.base, content: rm.content, action: 'update', lastCommitId: file.lastCommitId,
        message: `${title}\n\nBelay-Track: ${a.track}\nOperator: ${ctx.operator}`,
      }),
      ctx.port.plan.createMr({ project: t.project.id, sourceBranch: branch, targetBranch: t.base, title, labels: [MR_LABEL], removeSourceBranch: true, description: description(ctx, what, [DISARM_NOTE]) }),
    ],
    diff: [`@@ ${CI_FILE} · lines ${rm.from + 1}-${rm.from + rm.removed.length}`, ...rm.removed.map((l) => `- ${l}`)],
  };
}
