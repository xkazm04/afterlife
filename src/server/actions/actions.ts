'use server';

// The operator's writes, as Next server actions. Two calls per write:
//   previewAction(intent)               -> { status: 'preview', preview }   the exact commands; nothing runs
//   confirmAction(intent, previewId)    -> { status: 'done' | 'failed' | 'changed' | 'refused', ... }
// An intent is { kind: ActionKind, project, ... }: the kinds and their fields are types.ts's ActionIntent. The three
// project writes (queue-runs, install-skill, enable-app-insights) act on a real project Afterlife watches, as the
// person's own az login and files, not on the GitLab group: they are routed to actions/vitals before any GitLab deps.
// Both take `unknown` and validate it: a server action is an endpoint, whatever the type says. In live mode both answer
// only a request addressed to this machine (local.ts): anyone who can reach the port could otherwise preview and confirm.
// /start's setup writes (install-glab, glab-login, set-setup) name no project and act on this machine in every mode: they
// are routed to actions/setup first, before any deps, and answer only a request addressed to this machine.
// A live confirm that ran its commands has polled (run.ts); the route then renders again from that snapshot in the same
// round trip (`refresh` from next/cache, as repollAction does), so the acted item does not stay listed.
import { headers } from 'next/headers';
import { refresh } from 'next/cache';
import { actionDeps, notReadyReason } from './deps';
import { notLocal } from './local';
import { confirmIntent, previewIntent, type ActionDeps } from './run';
import type { ActionResponse } from './types';
import { setupDeps } from './setup/context';
import { asSetupWrite, setupAway } from './setup/intents';
import { confirmSetupWrite, previewSetupWrite } from './setup/run';
import { projectDeps } from './vitals/context';
import { asProjectWrite, projectAway } from './vitals/route';
import { confirmProjectWrite, previewProjectWrite } from './vitals/run';

const notReady = (): ActionResponse => ({ status: 'refused', reason: notReadyReason() });

/** Live mode only: demo never runs anything, and the hosted replay is served under its own name. */
async function fromElsewhere(deps: ActionDeps): Promise<ActionResponse | null> {
  if (deps.mode !== 'live') return null;
  const reason = notLocal(await headers());
  return reason ? { status: 'refused', reason } : null;
}

export async function previewAction(intent: unknown): Promise<ActionResponse> {
  const setup = asSetupWrite(intent);
  if (setup) return setupAway(await headers()) ?? (setup.ok ? previewSetupWrite(setupDeps(), setup.intent) : setup.response);
  const project = asProjectWrite(intent);
  if (project) return projectAway(await headers()) ?? (project.ok ? previewProjectWrite(projectDeps(), project.intent) : project.response);
  const deps = actionDeps();
  if (!deps) return notReady();
  return (await fromElsewhere(deps)) ?? previewIntent(deps, intent);
}

export async function confirmAction(intent: unknown, previewId: string): Promise<ActionResponse> {
  const setup = asSetupWrite(intent);
  if (setup) {
    const away = setupAway(await headers());
    if (away) return away;
    if (!setup.ok) return setup.response;
    if (typeof previewId !== 'string') return { status: 'refused', reason: 'a confirm names the preview id of the preview it confirms: preview first' };
    const r = await confirmSetupWrite(setupDeps(), setup.intent, previewId);
    if (setup.intent.kind === 'set-setup' && (r.status === 'done' || r.status === 'failed')) refresh(); // the runtime restarted
    return r;
  }
  const project = asProjectWrite(intent);
  if (project) {
    const away = projectAway(await headers());
    if (away) return away;
    if (!project.ok) return project.response;
    if (typeof previewId !== 'string') return { status: 'refused', reason: 'a confirm names the preview id of the preview it confirms: preview first' };
    const r = await confirmProjectWrite(projectDeps(), project.intent, previewId);
    if (r.status === 'done' || r.status === 'failed') refresh();
    return r;
  }
  const deps = actionDeps();
  if (!deps) return notReady();
  const away = await fromElsewhere(deps);
  if (away) return away;
  if (typeof previewId !== 'string') return { status: 'refused', reason: 'a confirm names the preview id of the preview it confirms: preview first' };
  const r = await confirmIntent(deps, intent, previewId);
  // Done and failed ran commands and polled; refused and changed ran nothing; demo never runs anything.
  if (deps.mode === 'live' && (r.status === 'done' || r.status === 'failed')) refresh();
  return r;
}
