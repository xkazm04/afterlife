// A real project's writes, preview then confirm, as the GitLab writes do (actions/run.ts): the preview plans the exact
// commands and their digest; the confirm plans again and runs only when the digest still matches. They act on the
// person's own machine and az login whatever AFTERLIFE_MODE is (a real project is not demo data), so the mode is always
// live, and there is no index to journal into. Instead this process keeps:
//   issued   the previews it answered, for PREVIEW_TTL_MS: a confirm of an id it did not issue, or issued too long
//            ago, is refused as stale, and nothing runs ("preview again")
//   running  the ids a confirm is running now: a second confirm (a double click, two tabs) is refused at once
//   answered the answer of a done or failed confirm, for the same time: a repeat answers from it and runs nothing again
import { createHash } from 'node:crypto';
import { messageOf } from '@/lib/format/error';
import type { ActionPreview, ActionResponse, ProjectIntent } from '../types';
import { ProjectRefused, type ProjectDeps, type ProjectPlan } from './context';
import { planInsights } from './insights';
import { planInstall } from './install';
import { planQueue } from './queue';

export const PREVIEW_TTL_MS = 15 * 60_000;
export const STALE_REASON = 'this preview is stale (older than 15 minutes, or from before the server restarted): preview again, nothing ran';
const RUNNING_REASON = 'this write is being sent now: wait for its answer';

interface Memory { issued: Map<string, number>; running: Set<string>; answered: Map<string, { at: number; r: ActionResponse }> }
const KEY = Symbol.for('afterlife.actions.projectWrites');
const holder = globalThis as unknown as Record<symbol, Memory | undefined>;
const memory = (): Memory => (holder[KEY] ??= { issued: new Map(), running: new Set(), answered: new Map() });

/** Tests: forget every preview and answer. */
export function clearProjectWrites(): void {
  holder[KEY] = undefined;
}

function plan(deps: ProjectDeps, intent: ProjectIntent): Promise<ProjectPlan> {
  switch (intent.kind) {
    case 'queue-runs': return Promise.resolve().then(() => planQueue(deps, intent));
    case 'install-skill': return Promise.resolve().then(() => planInstall(deps, intent));
    case 'enable-app-insights': return planInsights(deps, intent);
  }
}

const digest = (intent: ProjectIntent, p: ProjectPlan): string =>
  createHash('sha256').update(JSON.stringify([intent.kind, intent.project, p.digestExtra ?? null, ...p.commands.map((c) => c.argv)])).digest('hex');

const RANK = { low: 0, policy: 1, merge: 2 } as const;

function previewOf(intent: ProjectIntent, p: ProjectPlan): ActionPreview {
  return {
    kind: intent.kind, title: p.title, summary: p.summary, diff: p.diff, mode: 'live',
    commands: p.commands.map((c) => ({ display: c.display, argv: c.argv, risk: c.risk })),
    risk: p.commands.reduce<ActionPreview['risk']>((r, c) => (RANK[c.risk] > RANK[r] ? c.risk : r), 'low'),
    previewId: digest(intent, p),
    ...(p.notes ? { notes: [...p.notes] } : {}),
  };
}

type Built = { ok: true; plan: ProjectPlan; preview: ActionPreview } | { ok: false; response: ActionResponse };

async function build(deps: ProjectDeps, intent: ProjectIntent): Promise<Built> {
  try {
    const p = await plan(deps, intent);
    return { ok: true, plan: p, preview: previewOf(intent, p) };
  } catch (e) {
    if (e instanceof ProjectRefused) return { ok: false, response: { status: 'refused', reason: e.message } };
    throw e;
  }
}

export async function previewProjectWrite(deps: ProjectDeps, intent: ProjectIntent): Promise<ActionResponse> {
  const b = await build(deps, intent);
  if (!b.ok) return b.response;
  memory().issued.set(b.preview.previewId, deps.now().getTime());
  return { status: 'preview', preview: b.preview };
}

export async function confirmProjectWrite(deps: ProjectDeps, intent: ProjectIntent, previewId: string): Promise<ActionResponse> {
  const m = memory();
  const now = deps.now().getTime();
  const before = m.answered.get(previewId);
  if (before && now - before.at < PREVIEW_TTL_MS) return before.r;
  if (m.running.has(previewId)) return { status: 'refused', reason: RUNNING_REASON };
  const issued = m.issued.get(previewId);
  if (issued === undefined || now - issued >= PREVIEW_TTL_MS) return { status: 'refused', reason: STALE_REASON };
  m.running.add(previewId);
  try {
    const b = await build(deps, intent);
    if (!b.ok) return b.response;
    if (b.preview.previewId !== previewId) {
      m.issued.set(b.preview.previewId, now);
      return { status: 'changed', preview: b.preview };
    }
    let results;
    try {
      results = await b.plan.run();
    } catch (e) {
      results = [{ display: b.preview.commands[0]?.display ?? intent.kind, exit: 1, ok: false, simulated: false, error: messageOf(e) }];
    }
    const ok = results.length === b.preview.commands.length && results.every((r) => r.ok);
    const r: ActionResponse = { status: ok ? 'done' : 'failed', preview: b.preview, results };
    m.answered.set(previewId, { at: now, r });
    m.issued.delete(previewId);
    return r;
  } finally {
    m.running.delete(previewId);
  }
}
