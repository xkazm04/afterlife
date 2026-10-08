// Promote: Belay prepares the policy MR (a branch with the new record, and the MR). The operator, as the human key,
// merges it in GitLab; Belay never merges and never pushes a higher tier to the default branch. The branch commit carries
// tier-state.yml's last_commit_id on the default branch as it was read, so the MR never starts from a stale copy that
// would quietly undo a demotion made in between.
import { TIER_ORDER } from '@/schemas/tier';
import { standingOf } from '../../../../engine/decide/standing';
import { readPolicy } from '@/server/poller/derive/policy';
import type { PromoteClass } from '../types';
import { ActionRefused, dateOnly, lastCommitOf, locate, minuteOf, type Plan, type PlanContext } from './context';
import { editRecords, lineDiff } from './tierEdit';

export async function planPromote(ctx: PlanContext, intent: PromoteClass): Promise<Plan> {
  const { policy: repo } = await locate(ctx, intent.project);
  const base = repo.defaultBranch ?? 'main';
  const file = await ctx.port.getFile(repo.id, 'tier-state.yml', base);
  const read = await readPolicy(ctx.port, repo.id, base);
  if (!file || !read.ok) throw new ActionRefused(read.ok ? 'tier-state.yml is not in belay-policy' : read.reason);
  const lastCommitId = lastCommitOf(file);

  const st = standingOf(read.policy.classes, read.state, intent.class, ctx.now); // the gate's own class and holder rule
  if (st.kind === 'unknown_class') throw new ActionRefused(`${intent.class} is not an action class in trust-policy.yml`);
  if (st.kind === 'human_only') throw new ActionRefused(`${intent.class} is human only: no tier is ever granted`);
  if (st.kind === 'refused') throw new ActionRefused(st.why);
  if (st.kind === 'no_record') throw new ActionRefused(`${intent.class} has no tier record to raise`);
  const held = st;
  const rank = (t: string): number => (t === 'human_only' ? 99 : TIER_ORDER.indexOf(t as (typeof TIER_ORDER)[number]));
  if (rank(intent.to) <= rank(held.record.tier)) throw new ActionRefused(`${intent.class} is already ${held.record.tier}: a promotion goes up`);
  if (rank(intent.to) > rank(held.ceiling)) throw new ActionRefused(`${intent.class} has a ${held.ceiling} ceiling in trust-policy.yml: ${intent.to} is above it`);
  // The cooldown the tripwire or a revoke stamped: no promotion before it. Re-admitting a quarantined class to Assisted
  // is not one, and the new record keeps the cooldown, so the class climbs no further before that date.
  const cooldown = held.record.cooldown_until;
  const cooling = !!cooldown && ctx.now.getTime() < Date.parse(cooldown);
  const readmit = held.record.tier === 'quarantined' && intent.to === 'assisted';
  if (cooling && !readmit) throw new ActionRefused(`${intent.class} is in its cooldown until ${cooldown}: no promotion before that date`);

  const ttl = read.policy.grant_ttl_days;
  const at = minuteOf(ctx.now);
  const record: Record<string, string> = {
    tier: intent.to, since: at.toISOString(), by: `operator ${ctx.operator} via promotion MR`,
    ...(intent.to === 'hands_off' && ttl ? { lease_expires: new Date(at.getTime() + ttl * 86_400_000).toISOString() } : {}),
    ...(cooling && cooldown ? { cooldown_until: cooldown } : {}),
  };
  const content = editRecords(file.content, [{ agent: held.agent, class: intent.class, record }]);
  const move = `${intent.class} ${held.record.tier} -> ${intent.to}`;
  const branch = `belay/promote-${intent.class}-${dateOnly(ctx.now)}`;
  const title = `Promote ${move}`;
  return {
    title: `Promote ${intent.class} to ${intent.to}`,
    summary: `Opens a policy MR in ${repo.pathWithNamespace} as ${ctx.operator}. You merge it; the next MR pipeline reads the new tier.`,
    commands: [
      ctx.port.plan.commitFile({ project: repo.id, path: 'tier-state.yml', branch, startBranch: base, content, message: `${title}\n\nOperator: ${ctx.operator}`, action: 'update', lastCommitId }),
      ctx.port.plan.createMr({
        project: repo.id, sourceBranch: branch, targetBranch: base, title, labels: ['belay::promotion'],
        description: `Prepared by Belay for ${ctx.operator}.\n\nBelay-Class: ${intent.class}\n\nA person merges this; Belay never does.`,
      }),
    ],
    diff: lineDiff(file.content, content),
  };
}
