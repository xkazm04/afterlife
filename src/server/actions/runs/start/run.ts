// A start-run's preview then confirm, as the project writes do (actions/vitals/run.ts): the preview plans the command
// and its digest; the confirm plans again (every check again) and launches only when the digest still matches. A run
// is on the person's own machine and claude login, so the mode is always live, and there is no index to journal into.
// This process keeps the previews it issued (a confirm of an id it did not issue, or one older than PREVIEW_TTL_MS, is
// stale), the confirm launching now (a second is refused), and each answer, so a repeat never launches a second run.
import { createHash } from 'node:crypto';
import { messageOf } from '@/lib/format/error';
import type { ActionPreview, ActionResponse } from '../../types';
import { PREVIEW_TTL_MS, STALE_REASON } from '../../vitals/run';
import { planStartRun, StartRefused, type StartDeps, type StartPlan } from './plan';
import type { StartRun } from './types';

const RUNNING_REASON = 'this run is being started now: wait for its answer';

interface Memory { issued: Map<string, number>; running: Set<string>; answered: Map<string, { at: number; r: ActionResponse }> }
const KEY = Symbol.for('afterlife.actions.startRun');
const holder = globalThis as unknown as Record<symbol, Memory | undefined>;
const memory = (): Memory => (holder[KEY] ??= { issued: new Map(), running: new Set(), answered: new Map() });

/** Tests: forget every preview and answer. */
export function clearStartRuns(): void {
  holder[KEY] = undefined;
}

const digest = (i: StartRun, p: StartPlan): string => createHash('sha256').update(JSON.stringify([i.kind, ...p.commands.map((c) => c.argv)])).digest('hex');

function previewOf(i: StartRun, p: StartPlan): ActionPreview {
  const c = p.commands[0];
  return {
    kind: 'start-run', title: p.title, summary: p.summary, diff: [], mode: 'live', notes: p.notes,
    commands: p.commands.map((x) => ({ display: x.display, argv: x.argv, risk: x.risk })),
    risk: c?.risk ?? 'low',
    previewId: digest(i, p),
    ...(i.mode === 'execute' && i.onto !== undefined ? { branch: i.onto } : {}),
  };
}

type Built = { ok: true; plan: StartPlan; preview: ActionPreview } | { ok: false; response: ActionResponse };

async function build(deps: StartDeps, i: StartRun): Promise<Built> {
  try {
    const p = await planStartRun(deps, i);
    return { ok: true, plan: p, preview: previewOf(i, p) };
  } catch (e) {
    if (e instanceof StartRefused) return { ok: false, response: { status: 'refused', reason: e.message } };
    throw e;
  }
}

export async function previewStartRun(deps: StartDeps, i: StartRun): Promise<ActionResponse> {
  const b = await build(deps, i);
  if (!b.ok) return b.response;
  const m = memory();
  m.issued.set(b.preview.previewId, deps.now().getTime());
  // Asked again (the same run, after the last one ended): a confirm of this preview is a new start, not a repeat.
  if (!m.running.has(b.preview.previewId)) m.answered.delete(b.preview.previewId);
  return { status: 'preview', preview: b.preview };
}

export async function confirmStartRun(deps: StartDeps, i: StartRun, previewId: string): Promise<ActionResponse> {
  const m = memory();
  const now = deps.now().getTime();
  const before = m.answered.get(previewId);
  if (before && now - before.at < PREVIEW_TTL_MS) return before.r;
  if (m.running.has(previewId)) return { status: 'refused', reason: RUNNING_REASON };
  const issued = m.issued.get(previewId);
  if (issued === undefined || now - issued >= PREVIEW_TTL_MS) return { status: 'refused', reason: STALE_REASON };
  m.running.add(previewId);
  try {
    const b = await build(deps, i);
    if (!b.ok) return b.response;
    if (b.preview.previewId !== previewId) {
      m.issued.set(b.preview.previewId, now);
      return { status: 'changed', preview: b.preview };
    }
    let results;
    try {
      results = await b.plan.run();
    } catch (e) {
      results = [{ display: b.preview.commands[0]?.display ?? 'afterlife run', exit: 1, ok: false, simulated: false, error: messageOf(e) }];
    }
    const r: ActionResponse = { status: results.every((x) => x.ok) ? 'done' : 'failed', preview: b.preview, results };
    m.answered.set(previewId, { at: now, r });
    m.issued.delete(previewId);
    return r;
  } finally {
    m.running.delete(previewId);
  }
}
