// preview, then confirm. The first call plans the commands and returns them with a digest; the second call plans again and
// runs them only if the digest still matches what the operator saw. Live: each command is written to commands_run
// BEFORE it runs, then finished with its exit code; a poll follows. Demo: nothing runs, the result says "simulated".
import { createHash } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { GitLabError } from '@/server/gitlab/errors';
import type { GitLabPort } from '@/server/gitlab/port';
import type { PlannedCommand, Risk } from '@/server/gitlab/plan/types';
import { finishCommand, recordCommand } from '@/server/index/repositories/commandsRun';
import { closeProposal } from '@/server/index/repositories/work/proposal';
import type { PollerConfig } from '@/server/poller/config';
import { parseIntent } from './intents';
import { ActionRefused, planIntent, type Plan, type PlanContext } from './plans';
import { COMMIT_ID } from './plans/context';
import type { ActionIntent, ActionPreview, ActionResponse, CommandOutcome } from './types';

export interface ActionDeps {
  mode: 'demo' | 'live';
  /** Reads (and, in live mode only, executes). In demo mode it is the seeded fake group and is never executed against. */
  port: GitLabPort;
  /** The index: null in demo mode, so a demo click leaves no record. */
  db: PGlite | null;
  groupId: string | number;
  cfg: PollerConfig;
  now: () => Date;
  /** One poll cycle, then a fresh snapshot: run after the commands so the screens show what GitLab now says. */
  refresh: () => Promise<void>;
  gitlabId: PlanContext['gitlabId'];
  /** The per-install values an arm MR names. Absent: an arm is refused with the reason. */
  arm?: PlanContext['arm'];
}

const RANK: Record<Risk, number> = { low: 0, policy: 1, merge: 2 };
const refused = (reason: string): ActionResponse => ({ status: 'refused', reason });

/** Everything a confirm does: the commands, and the inbox item it settles once they ran. */
const digest = (intent: ActionIntent, commands: readonly PlannedCommand[]): string =>
  createHash('sha256').update(JSON.stringify([intent.kind, intent.proposal ?? null, ...commands.map((c) => c.argv)])).digest('hex');

function previewOf(deps: ActionDeps, intent: ActionIntent, plan: Plan): ActionPreview {
  return {
    kind: intent.kind, title: plan.title, summary: plan.summary, diff: plan.diff, mode: deps.mode,
    commands: plan.commands.map((c) => ({ display: c.display, argv: c.argv, risk: c.risk })),
    risk: plan.commands.reduce<Risk>((r, c) => (RANK[c.risk] > RANK[r] ? c.risk : r), 'low'),
    previewId: digest(intent, plan.commands),
    ...(plan.branch ? { branch: plan.branch } : {}),
    ...(plan.notes ? { notes: [...plan.notes] } : {}),
  };
}

type Built = { ok: true; intent: ActionIntent; plan: Plan; preview: ActionPreview; operator: string } | { ok: false; response: ActionResponse };

async function build(deps: ActionDeps, raw: unknown): Promise<Built> {
  const parsed = parseIntent(raw);
  if (!parsed.ok) return { ok: false, response: refused(parsed.reason) };
  try {
    const operator = (await deps.port.currentUser()).username;
    const ctx: PlanContext = { port: deps.port, groupId: deps.groupId, cfg: deps.cfg, now: deps.now(), operator, gitlabId: deps.gitlabId, ...(deps.arm ? { arm: deps.arm } : {}) };
    const plan = await planIntent(ctx, parsed.intent);
    return { ok: true, intent: parsed.intent, plan, preview: previewOf(deps, parsed.intent, plan), operator };
  } catch (e) {
    if (e instanceof ActionRefused) return { ok: false, response: refused(e.message) };
    if (e instanceof GitLabError) return { ok: false, response: refused(`GitLab said no while planning: ${e.message}`) };
    throw e;
  }
}

/** Step 1: the exact commands, and nothing else. */
export async function previewIntent(deps: ActionDeps, raw: unknown): Promise<ActionResponse> {
  const b = await build(deps, raw);
  return b.ok ? { status: 'preview', preview: b.preview } : b.response;
}

/** An address a screen may link to: http(s) only, never javascript: or data:. */
function webUrl(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:' ? v : null;
  } catch {
    return null;
  }
}

/**
 * What a command that ran made, from GitLab's answer: an MR's iid, or (a file write) the commit the file now has. Named only
 * when the answer has the shape GitLab documents (a positive iid, an http(s) address, a commit id).
 */
async function madeBy(deps: ActionDeps, cmd: PlannedCommand, body: unknown): Promise<Pick<CommandOutcome, 'made' | 'url'>> {
  const b = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  if (Number.isSafeInteger(b.iid) && (b.iid as number) > 0) {
    const url = webUrl(b.web_url);
    return { made: `!${b.iid as number}`, ...(url ? { url } : {}) };
  }
  if (!cmd.file) return {};
  const f = await deps.port.getFile(cmd.file.project, cmd.file.path, cmd.file.branch).catch(() => null);
  return f?.lastCommitId && COMMIT_ID.test(f.lastCommitId) ? { made: `commit ${f.lastCommitId.slice(0, 8)}` } : {};
}

async function execute(deps: ActionDeps, b: Extract<Built, { ok: true }>): Promise<ActionResponse> {
  const db = deps.db;
  if (!db) return refused('live mode has no index to record the command in');
  const results: CommandOutcome[] = [];
  for (const cmd of b.plan.commands) {
    const id = await recordCommand(db, { at: deps.now(), operator: b.operator, projectId: b.intent.project, proposalId: b.intent.proposal, display: cmd.display, argv: cmd.argv, risk: cmd.risk });
    try {
      const out = await deps.port.execute(cmd);
      await finishCommand(db, id, 0, deps.now());
      results.push({ display: cmd.display, exit: 0, ok: true, simulated: false, ...(await madeBy(deps, cmd, out.body)) });
    } catch (e) {
      const exit = e instanceof GitLabError && e.status ? e.status : 1;
      await finishCommand(db, id, exit, deps.now());
      results.push({ display: cmd.display, exit, ok: false, simulated: false, error: e instanceof Error ? e.message : String(e) });
      break; // later commands depend on earlier ones (a branch, then its MR)
    }
  }
  const ok = results.length === b.plan.commands.length && results.every((r) => r.ok);
  if (ok && b.intent.proposal) await closeProposal(db, b.intent.proposal, 'acted', deps.now(), b.operator);
  await deps.refresh().catch(() => undefined); // GitLab may have changed even when a later command failed
  return { status: ok ? 'done' : 'failed', preview: b.preview, results };
}

/** Step 2: runs what `previewId` names, if and only if the plan is still exactly that. */
export async function confirmIntent(deps: ActionDeps, raw: unknown, previewId: string): Promise<ActionResponse> {
  const b = await build(deps, raw);
  if (!b.ok) return b.response;
  if (b.preview.previewId !== previewId) return { status: 'changed', preview: b.preview };
  if (deps.mode === 'demo') {
    const results = b.plan.commands.map((c): CommandOutcome => ({ display: c.display, exit: 0, ok: true, simulated: true }));
    return { status: 'done', preview: b.preview, results };
  }
  return execute(deps, b);
}
