// Enroll: an armed track's classes get their first record, at trust-policy.yml's start_tier and never above a class's
// ceiling. Arming adds CI content only; until a class holds a record the gate blocks every one of its MRs (no tier
// record). Enrollment is a raise from nothing, so it is never a direct commit: Belay prepares a branch with the records
// and a policy MR labelled belay::promotion, as a promotion is, and a person merges it. Belay never does. The branch
// commit carries tier-state.yml's last_commit_id as it was read. First rung only: a class that already holds a record
// is refused here (promotion takes it from there), and a human_only class is never given one.
import { enrollTier, isTier } from '@/lib/promotion/enroll/enroll';
import type { Tier } from '@/schemas/tier';
import { readPolicy } from '@/server/poller/derive/policy';
import { ROLE_TRACK } from '@/server/poller/derive/tiers';
import type { EnrollTrack } from '../../types';
import { ActionRefused, dateOnly, lastCommitOf, locate, minuteOf, noBranch, type Plan, type PlanContext } from '../context';
import { editRecords, lineDiff, type RecordEdit } from '../tierEdit';
import { accountFor } from './account';

export async function planEnroll(ctx: PlanContext, intent: EnrollTrack): Promise<Plan> {
  const { project, policy: repo } = await locate(ctx, intent.project);
  const base = repo.defaultBranch ?? 'main';
  const file = await ctx.port.getFile(repo.id, 'tier-state.yml', base);
  const read = await readPolicy(ctx.port, repo.id, base);
  if (!read.ok) throw new ActionRefused(`Belay could not read belay-policy: ${read.reason}`);
  if (!file) throw new ActionRefused('tier-state.yml is not in belay-policy');
  const lastCommitId = lastCommitOf(file);
  const start: unknown = read.policy.start_tier;
  if (!isTier(start)) throw new ActionRefused('trust-policy.yml has no start_tier (or it is not a tier): an enrollment writes that tier, so nothing is planned');

  const n = Number(intent.track.slice(1));
  const role = Object.entries(ROLE_TRACK).find(([, t]) => t === n)?.[0];
  const classes = Object.entries(read.policy.classes).filter(([, c]) => ROLE_TRACK[c.agent] === n);
  if (!role || !classes.length) throw new ActionRefused(`trust-policy.yml names no action class for ${intent.track}${role ? ` (the ${role} role)` : ''}`);
  const agentOnes = classes.filter(([, c]) => c.ceiling !== 'human_only');
  const skipped = classes.filter(([, c]) => c.ceiling === 'human_only').map(([id]) => id);
  if (!agentOnes.length) throw new ActionRefused(`every class of ${intent.track} is human only: no tier is ever granted`);

  // First rung only: any record for any of the track's classes, under any account, and this is promotion's.
  const held = agentOnes.flatMap(([id]) => Object.entries(read.state.agents).filter(([, recs]) => Object.hasOwn(recs, id)).map(([a, recs]) => `${id} (${a} ${recs[id]?.tier})`));
  if (held.length) throw new ActionRefused(`${intent.track} is already enrolled: ${held.join(', ')} hold${held.length > 1 ? '' : 's'} a record. Enrollment writes first records only; promotion takes it from there`);

  const found = await accountFor(ctx, project, role, agentOnes.map(([id]) => id), read.state);
  if (!found.ok) throw new ActionRefused(found.reason);

  const branch = `belay/enroll-${intent.track}-${dateOnly(ctx.now)}`;
  await noBranch(ctx.port, repo, branch);
  const since = minuteOf(ctx.now).toISOString();
  const by = `operator ${ctx.operator} via enrollment MR`;
  const edits: RecordEdit[] = agentOnes.map(([id, c]) => ({ agent: found.account, class: id, record: { tier: enrollTier(start, c.ceiling as Tier), since, by } }));
  const content = editRecords(file.content, edits);
  const moves = edits.map((e) => `${e.class} -> ${e.record.tier}`);
  const title = `Enroll ${intent.track} ${role}: ${moves.join(', ')}`;
  const notes = [
    `The account, ${found.account}, is read from ${found.from}: Belay never invents one.`,
    `start_tier in trust-policy.yml is ${start}; a class's record never starts above its ceiling.`,
    ...(skipped.length ? [`${skipped.join(', ')}: human only, so no record is written.`] : []),
    'A person merges this MR; Belay never does. The gate reads the new records on the next MR pipeline after the merge.',
  ];
  return {
    title: `Enroll ${intent.track}'s classes at ${start}`,
    summary: `Opens a policy MR in ${repo.pathWithNamespace} as ${ctx.operator} that gives ${edits.length > 1 ? `${edits.length} classes their first records` : `${edits[0]?.class} its first record`} under ${found.account}.`,
    commands: [
      ctx.port.plan.commitFile({ project: repo.id, path: 'tier-state.yml', branch, startBranch: base, content, message: `${title}\n\nOperator: ${ctx.operator}`, action: 'update', lastCommitId }),
      ctx.port.plan.createMr({
        project: repo.id, sourceBranch: branch, targetBranch: base, title, labels: ['belay::promotion'], removeSourceBranch: true,
        description: `Prepared by Belay for ${ctx.operator}: the first records of ${intent.track}'s classes, at start_tier.\n\n${edits.map((e) => `Belay-Class: ${e.class}`).join('\n')}\n\nA person merges this; Belay never does.`,
      }),
    ],
    diff: lineDiff(file.content, content),
    branch,
    notes,
  };
}
