'use server';

// The operator's writes, as Next server actions. Two calls per write:
//   previewAction(intent)               -> { status: 'preview', preview }   the exact commands; nothing runs
//   confirmAction(intent, previewId)    -> { status: 'done' | 'failed' | 'changed' | 'refused', ... }
// An intent is { kind: 'revoke-class' | 'promote-class' | 'mark-cra-ready' | 'stage-gap-mr', project, ... } (types.ts).
// Both take `unknown` and validate it: a server action is an endpoint, whatever the type says. In live mode both answer
// only a request addressed to this machine (local.ts): anyone who can reach the port could otherwise preview and confirm.
import { headers } from 'next/headers';
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
  return (await fromElsewhere(deps)) ?? confirmIntent(deps, intent, previewId);
}
