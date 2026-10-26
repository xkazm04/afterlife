// Which GitLab account an enrollment writes its records under. Afterlife never invents one: it reads it, in order, from
// tier-state.yml (an account named for the role, as the gate's findHolder reads a holder), from the poller's own
// config (the names it believes for the role), and from what the poller reads acting for the role in the project
// within its task window: an agent MR whose Belay-Class is one of the role's classes (tasks.agent), or, for the
// guardrail, which acts in notes and never authors an MR, a note that carries a belay-guardrail block (the MR it
// blocked is another agent's). Several accounts at one source is never a guess: it is a refusal.
import type { TierState } from '@/schemas/tier';
import type { GlProject } from '@/server/gitlab/types';
import { allows } from '@/server/poller/config';
import { extractBlocks } from '@/server/poller/parse/blocks';
import { parseGuardrailBlock } from '@/server/poller/parse/guardrail';
import { parseTrailers } from '@/server/poller/parse/trailers';
import type { PlanContext } from '../context';

export type AccountFind = { ok: true; account: string; from: string } | { ok: false; reason: string };

const HOUR = 3_600_000;
const uniq = (xs: readonly string[]): string[] => [...new Set(xs)].sort();

/**
 * The accounts the poller has seen acting for the role in the project, within its task window. The guardrail's are read
 * from notes, one listNotes per MR, so that read stops at the second account: two is already a refusal (`one`).
 */
async function seenActing(ctx: PlanContext, project: GlProject, role: string, classes: readonly string[]): Promise<string[]> {
  const after = new Date(ctx.now.getTime() - ctx.cfg.taskWindowMs).toISOString();
  const mrs = await ctx.port.listMergeRequests(project.id, { state: 'all', updatedAfter: after, limit: ctx.cfg.mrLimit });
  const out = new Set<string>();
  for (const mr of mrs) {
    if (role !== 'guardrail') {
      const cls = parseTrailers(mr.description).class;
      if (cls && classes.includes(cls) && allows(ctx.cfg.agents, mr.author)) out.add(mr.author);
      continue;
    }
    if (out.size > 1) break;
    if (!mr.labels.some((l) => l.startsWith('guardrail::'))) continue;
    for (const n of await ctx.port.listNotes(project.id, mr.iid)) {
      if (n.system || !allows(ctx.cfg.guardrail, n.author)) continue;
      if (extractBlocks(n.body, 'belay-guardrail').some((b) => parseGuardrailBlock(b) !== null)) out.add(n.author);
    }
  }
  return uniq([...out]);
}

function one(found: readonly string[], from: string, role: string): AccountFind | null {
  if (found.length === 1) return { ok: true, account: found[0]!, from };
  if (found.length > 1) return { ok: false, reason: `${from} names several accounts for the ${role} role (${found.join(', ')}): Afterlife never picks one. Leave one, then preview again` };
  return null;
}

/** Where a person sets the account Afterlife could not find. */
const whereToSet = (role: string): string =>
  role === 'guardrail'
    ? 'Set AFTERLIFE_GUARDRAIL_AUTHORS to the guardrail account in Afterlife\'s environment, then preview again'
    : `Afterlife reads it from the agent's own merge requests: once the ${role} agent opens one here (the gate blocks it until it is enrolled) and Afterlife polls, preview again`;

export async function accountFor(
  ctx: PlanContext, project: GlProject, role: string, classes: readonly string[], state: TierState,
): Promise<AccountFind> {
  const fromState = one(uniq(Object.keys(state.agents).filter((a) => a.includes(role))), 'tier-state.yml', role);
  if (fromState) return fromState;
  const rule = role === 'guardrail' ? ctx.cfg.guardrail.names : [];
  const fromConfig = one(uniq([...ctx.cfg.agents.names.filter((a) => a.includes(role)), ...rule]), "the poller's config", role);
  if (fromConfig) return fromConfig;
  const seen = one(await seenActing(ctx, project, role, classes), `${project.path}'s merge requests`, role);
  if (seen) return seen;
  const hours = Math.round(ctx.cfg.taskWindowMs / HOUR);
  const acted = role === 'guardrail' ? 'no guardrail note with a belay-guardrail block' : `no agent merge request for ${classes.join(', ')}`;
  return {
    ok: false,
    reason: `Afterlife could not find the ${role} agent's account: tier-state.yml names no account with "${role}" in it, ` +
      `the poller's config names none${role === 'guardrail' ? ' (AFTERLIFE_GUARDRAIL_AUTHORS is empty)' : ''}, and ${project.path} has ${acted} in the last ${hours} h. ${whereToSet(role)}`,
  };
}
