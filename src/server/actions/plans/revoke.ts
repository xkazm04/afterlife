// Revoke: lower a class's tier by committing tier-state.yml to belay-policy, as the operator. It only ever lowers
// (restricting is free; extending is earned), so it may push straight to the default branch as the tripwire does.
import { TIER_ORDER } from '@/schemas/tier';
import { holderOf } from '@/server/poller/derive/tiers';
import { readPolicy } from '@/server/poller/derive/policy';
import type { RevokeClass } from '../types';
import { ActionRefused, dateOnly, locate, type Plan, type PlanContext } from './context';
import { editRecords, lineDiff, type RecordEdit } from './tierEdit';

export async function planRevoke(ctx: PlanContext, intent: RevokeClass): Promise<Plan> {
  const { policy: repo } = await locate(ctx, intent.project);
  const branch = repo.defaultBranch ?? 'main';
  const file = await ctx.port.getFile(repo.id, 'tier-state.yml', branch);
  const read = await readPolicy(ctx.port, repo.id, branch);
  if (!file || !read.ok) throw new ActionRefused(read.ok ? 'tier-state.yml is not in belay-policy' : read.reason);

  const why = intent.why ?? 'manual revoke';
  const edits: RecordEdit[] = [];
  const moves: string[] = [];
  for (const change of intent.changes) {
    const cls = read.policy.classes[change.class];
    if (!cls) throw new ActionRefused(`${change.class} is not an action class in trust-policy.yml`);
    if (cls.ceiling === 'human_only') throw new ActionRefused(`${change.class} is human only: no agent holds it`);
    const held = holderOf(read.state, change.class, cls.agent);
    if (!held) throw new ActionRefused(`${change.class} has no tier record: it is already not trusted`);
    if (TIER_ORDER.indexOf(change.to) >= TIER_ORDER.indexOf(held.record.tier)) {
      throw new ActionRefused(`${change.class} is ${held.record.tier}: Belay only lowers a tier directly. Raising one is a promotion MR a person merges.`);
    }
    edits.push({
      agent: held.agent, class: change.class,
      record: {
        tier: change.to, since: ctx.now.toISOString(), by: `operator ${ctx.operator} via Belay`, evidence: why,
        cooldown_until: dateOnly(new Date(ctx.now.getTime() + read.policy.cooldown_days * 86_400_000)),
      },
    });
    moves.push(`${change.class} ${held.record.tier} -> ${change.to}`);
  }

  const content = editRecords(file.content, edits);
  const message = [`demote ${moves[0]} (${why})`, '', ...moves.map((m) => `Moved: ${m}`), `Operator: ${ctx.operator}`, 'Lowered by the operator through Belay. Promotion needs a policy MR.'].join('\n');
  return {
    title: moves.length === 1 ? `Revoke ${intent.changes[0]?.class}` : `Revoke ${moves.length} classes`,
    summary: `Commits tier-state.yml to ${repo.pathWithNamespace} on ${branch} as ${ctx.operator}. The next MR pipeline reads the new tier.`,
    commands: [ctx.port.plan.commitFile({ project: repo.id, path: 'tier-state.yml', branch, content, message, action: 'update' })],
    diff: lineDiff(file.content, content),
  };
}
