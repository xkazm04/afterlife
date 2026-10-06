// Promote: Belay prepares the policy MR (a branch with the new record, and the MR). The operator, as the human key,
// merges it in GitLab; Belay never merges and never pushes a higher tier to the default branch.
import { TIER_ORDER } from '@/schemas/tier';
import { holderOf } from '@/server/poller/derive/tiers';
import { readPolicy } from '@/server/poller/derive/policy';
import type { PromoteClass } from '../types';
import { ActionRefused, dateOnly, locate, type Plan, type PlanContext } from './context';
import { editRecords, lineDiff } from './tierEdit';

export async function planPromote(ctx: PlanContext, intent: PromoteClass): Promise<Plan> {
  const { policy: repo } = await locate(ctx, intent.project);
  const base = repo.defaultBranch ?? 'main';
  const file = await ctx.port.getFile(repo.id, 'tier-state.yml', base);
  const read = await readPolicy(ctx.port, repo.id, base);
  if (!file || !read.ok) throw new ActionRefused(read.ok ? 'tier-state.yml is not in belay-policy' : read.reason);

  const cls = read.policy.classes[intent.class];
  if (!cls) throw new ActionRefused(`${intent.class} is not an action class in trust-policy.yml`);
  if (cls.ceiling === 'human_only') throw new ActionRefused(`${intent.class} is human only: no tier is ever granted`);
  const held = holderOf(read.state, intent.class, cls.agent);
  if (!held) throw new ActionRefused(`${intent.class} has no tier record to raise`);
  const rank = (t: string): number => (t === 'human_only' ? 99 : TIER_ORDER.indexOf(t as (typeof TIER_ORDER)[number]));
  if (rank(intent.to) <= rank(held.record.tier)) throw new ActionRefused(`${intent.class} is already ${held.record.tier}: a promotion goes up`);
  if (rank(intent.to) > rank(cls.ceiling)) throw new ActionRefused(`${intent.class} has a ${cls.ceiling} ceiling in trust-policy.yml: ${intent.to} is above it`);

  const ttl = read.policy.grant_ttl_days;
  const record: Record<string, string> = {
    tier: intent.to, since: ctx.now.toISOString(), by: `operator ${ctx.operator} via promotion MR`,
    ...(intent.to === 'hands_off' && ttl ? { lease_expires: new Date(ctx.now.getTime() + ttl * 86_400_000).toISOString() } : {}),
  };
  const content = editRecords(file.content, [{ agent: held.agent, class: intent.class, record }]);
  const move = `${intent.class} ${held.record.tier} -> ${intent.to}`;
  const branch = `belay/promote-${intent.class}-${dateOnly(ctx.now)}`;
  const title = `Promote ${move}`;
  return {
    title: `Promote ${intent.class} to ${intent.to}`,
    summary: `Opens a policy MR in ${repo.pathWithNamespace} as ${ctx.operator}. You merge it; the next MR pipeline reads the new tier.`,
    commands: [
      ctx.port.plan.commitFile({ project: repo.id, path: 'tier-state.yml', branch, startBranch: base, content, message: `${title}\n\nOperator: ${ctx.operator}`, action: 'update' }),
      ctx.port.plan.createMr({
        project: repo.id, sourceBranch: branch, targetBranch: base, title, labels: ['belay::promotion'],
        description: `Prepared by Belay for ${ctx.operator}.\n\nBelay-Class: ${intent.class}\n\nA person merges this; Belay never does.`,
      }),
    ],
    diff: lineDiff(file.content, content),
  };
}
