// Revoke: lower a class's tier by committing tier-state.yml to belay-policy, as the operator. It only ever lowers
// (restricting is free; extending is earned), so it may push straight to the default branch as the tripwire does. The
// write carries the file's last_commit_id as it was read: if tier-state.yml moved in between (a tripwire demotion, another
// operator's revoke), GitLab refuses it instead of the stale content landing over theirs. A class several agents hold is
// lowered for every holder whose record is above the target, in the same one commit; a holder already at or below it is
// left alone. Each holder is read as the gate reads it when CI names that holder (engine/decide/standing.ts).
import { TIER_ORDER } from '@/schemas/tier';
import { holderStandings, standingOf } from '../../../../engine/decide/standing';
import { readPolicy } from '@/server/poller/derive/policy';
import type { RevokeClass } from '../types';
import { ActionRefused, dateOnly, lastCommitOf, locate, minuteOf, type Plan, type PlanContext } from './context';
import { editRecords, lineDiff, type RecordEdit } from './tierEdit';

export async function planRevoke(ctx: PlanContext, intent: RevokeClass): Promise<Plan> {
  const { policy: repo } = await locate(ctx, intent.project);
  const branch = repo.defaultBranch ?? 'main';
  const file = await ctx.port.getFile(repo.id, 'tier-state.yml', branch);
  const read = await readPolicy(ctx.port, repo.id, branch);
  if (!file || !read.ok) throw new ActionRefused(read.ok ? 'tier-state.yml is not in belay-policy' : read.reason);
  const lastCommitId = lastCommitOf(file);

  const why = intent.why ?? 'manual revoke';
  const edits: RecordEdit[] = [];
  const moves: string[] = [];
  const notes: string[] = [];
  for (const change of intent.changes) {
    const st = standingOf(read.policy.classes, read.state, change.class, ctx.now); // the gate's own class and holder rule
    if (st.kind === 'unknown_class') throw new ActionRefused(`${change.class} is not an action class in trust-policy.yml`);
    if (st.kind === 'human_only') throw new ActionRefused(`${change.class} is human only: no agent holds it`);
    if (st.kind === 'no_record') throw new ActionRefused(`${change.class} has no tier record: it is already not trusted`);
    const holders = holderStandings(read.policy.classes, read.state, change.class, ctx.now);
    const above = holders.filter((h) => TIER_ORDER.indexOf(change.to) < TIER_ORDER.indexOf(h.record.tier));
    if (!above.length) {
      const now = holders.map((h) => (holders.length > 1 ? `${h.agent} ${h.record.tier}` : h.record.tier)).join(', ');
      throw new ActionRefused(`${change.class} is ${now}: Belay only lowers a tier directly. Raising one is a promotion MR a person merges.`);
    }
    for (const h of above) {
      edits.push({
        agent: h.agent, class: change.class,
        record: {
          tier: change.to, since: minuteOf(ctx.now).toISOString(), by: `operator ${ctx.operator} via Belay`, evidence: why,
          cooldown_until: dateOnly(new Date(ctx.now.getTime() + read.policy.cooldown_days * 86_400_000)),
        },
      });
      moves.push(holders.length > 1 ? `${change.class} (${h.agent}) ${h.record.tier} -> ${change.to}` : `${change.class} ${h.record.tier} -> ${change.to}`);
    }
    if (holders.length > 1) {
      for (const h of holders) {
        notes.push(above.includes(h) ? `${change.class} · ${h.agent}: ${h.record.tier} -> ${change.to}` : `${change.class} · ${h.agent}: ${h.record.tier}, at or below ${change.to}: left alone`);
      }
    }
  }

  const content = editRecords(file.content, edits);
  const message = [`demote ${moves[0]} (${why})`, '', ...moves.map((m) => `Moved: ${m}`), `Operator: ${ctx.operator}`, 'Lowered by the operator through Belay. Promotion needs a policy MR.'].join('\n');
  return {
    title: intent.changes.length === 1 ? `Revoke ${intent.changes[0]?.class}` : `Revoke ${intent.changes.length} classes`,
    summary: `Commits tier-state.yml to ${repo.pathWithNamespace} on ${branch} as ${ctx.operator}. The next MR pipeline reads the new tier.`,
    commands: [ctx.port.plan.commitFile({ project: repo.id, path: 'tier-state.yml', branch, content, message, action: 'update', lastCommitId })],
    diff: lineDiff(file.content, content),
    ...(notes.length ? { notes } : {}), // one line per holder of a class several agents hold
  };
}
