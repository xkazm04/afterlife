// /start's setup writes, preview then confirm, as the project writes do (actions/vitals/run.ts): the preview plans the
// exact commands and their digest; the confirm plans again and runs only when the digest still matches. They act on this
// machine whatever the mode (demo is when they are needed), so the preview's mode is always live, and this process keeps:
//   issued   the previews it answered, for PREVIEW_TTL_MS: a confirm of an id it did not issue, or too long ago, is stale
//   running  the ids a confirm is running now: a second confirm (a double click, two tabs) is refused at once
//   answered the answer of a done or failed confirm, for the same time: a repeat answers from it and runs nothing again
import { createHash } from 'node:crypto';
import { messageOf } from '@/lib/format/error';
import type { SetupIntent } from '@/server/start/wire';
import type { ActionPreview, ActionResponse } from '../types';
import { PREVIEW_TTL_MS, STALE_REASON } from '../vitals/run';
import { SetupRefused, type SetupDeps, type SetupPlan } from './context';
import { planGlabLogin, planInstallGlab } from './glab';
import { planSetSetup } from './setSetup';

const RUNNING_REASON = 'this setup step is running now: wait for its answer';

interface Memory { issued: Map<string, number>; running: Set<string>; answered: Map<string, { at: number; r: ActionResponse }> }
const KEY = Symbol.for('afterlife.actions.setupWrites');
const holder = globalThis as unknown as Record<symbol, Memory | undefined>;
const memory = (): Memory => (holder[KEY] ??= { issued: new Map(), running: new Set(), answered: new Map() });

/** Tests: forget every preview and answer. */
export function clearSetupWrites(): void {
  holder[KEY] = undefined;
}

function plan(deps: SetupDeps, intent: SetupIntent): Promise<SetupPlan> {
  switch (intent.kind) {
    case 'install-glab': return planInstallGlab(deps);
    case 'glab-login': return planGlabLogin(deps, intent);
    case 'set-setup': return Promise.resolve().then(() => planSetSetup(deps, intent));
  }
}

const digest = (intent: SetupIntent, p: SetupPlan): string =>
  createHash('sha256').update(JSON.stringify([intent, p.digestExtra ?? null, ...p.commands.map((c) => c.argv)])).digest('hex');

function previewOf(intent: SetupIntent, p: SetupPlan): ActionPreview {
  return {
    kind: intent.kind, title: p.title, summary: p.summary, diff: p.diff, mode: 'live', risk: 'low',
    commands: p.commands.map((c) => ({ display: c.display, argv: c.argv, risk: c.risk })),
    previewId: digest(intent, p),
    ...(p.notes?.length ? { notes: [...p.notes] } : {}),
  };
}

type Built = { ok: true; plan: SetupPlan; preview: ActionPreview } | { ok: false; response: ActionResponse };

async function build(deps: SetupDeps, intent: SetupIntent): Promise<Built> {
  try {
    const p = await plan(deps, intent);
    return { ok: true, plan: p, preview: previewOf(intent, p) };
  } catch (e) {
    if (e instanceof SetupRefused) return { ok: false, response: { status: 'refused', reason: e.message } };
    return { ok: false, response: { status: 'refused', reason: `the step could not be planned: ${messageOf(e)}` } };
  }
}

export async function previewSetupWrite(deps: SetupDeps, intent: SetupIntent): Promise<ActionResponse> {
  const b = await build(deps, intent);
  if (!b.ok) return b.response;
  memory().issued.set(b.preview.previewId, deps.now().getTime());
  return { status: 'preview', preview: b.preview };
}

export async function confirmSetupWrite(deps: SetupDeps, intent: SetupIntent, previewId: string): Promise<ActionResponse> {
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
