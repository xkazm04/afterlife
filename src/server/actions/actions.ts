'use server';

// The operator's writes, as Next server actions. Two calls per write:
//   previewAction(intent)               -> { status: 'preview', preview }   the exact commands; nothing runs
//   confirmAction(intent, previewId)    -> { status: 'done' | 'failed' | 'changed' | 'refused', ... }
// An intent is { kind: 'revoke-class' | 'promote-class' | 'mark-cra-ready' | 'stage-gap-mr', project, ... } (types.ts).
// Both take `unknown` and validate it: a server action is an endpoint, whatever the type says. In live mode both answer
// only a request addressed to this machine (local.ts): anyone who can reach the port could otherwise preview and confirm.
// A live confirm that ran its commands has polled (run.ts); the route then renders again from that snapshot in the same
// round trip (`refresh` from next/cache, as repollAction does), so the acted item does not stay listed.
import { headers } from 'next/headers';
import { refresh } from 'next/cache';
import { actionDeps } from './deps';
import { notLocal } from './local';
import { confirmIntent, previewIntent, type ActionDeps } from './run';
import type { ActionResponse } from './types';

const NOT_READY: ActionResponse = { status: 'refused', reason: 'live mode has not finished its first poll; try again in a moment' };

/** Live mode only: demo never runs anything, and the hosted replay is served under its own name. */
async function fromElsewhere(deps: ActionDeps): Promise<ActionResponse | null> {
  if (deps.mode !== 'live') return null;
  const reason = notLocal(await headers());
  return reason ? { status: 'refused', reason } : null;
}

export async function previewAction(intent: unknown): Promise<ActionResponse> {
  const deps = actionDeps();
  if (!deps) return NOT_READY;
  return (await fromElsewhere(deps)) ?? previewIntent(deps, intent);
}

export async function confirmAction(intent: unknown, previewId: string): Promise<ActionResponse> {
  const deps = actionDeps();
  if (!deps || typeof previewId !== 'string') return NOT_READY;
  const away = await fromElsewhere(deps);
  if (away) return away;
  const r = await confirmIntent(deps, intent, previewId);
  // Done and failed ran commands and polled; refused and changed ran nothing; demo never runs anything.
  if (deps.mode === 'live' && (r.status === 'done' || r.status === 'failed')) refresh();
  return r;
}
