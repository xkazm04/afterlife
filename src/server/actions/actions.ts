'use server';

// The operator's writes, as Next server actions. Two calls per write:
//   previewAction(intent)               -> { status: 'preview', preview }   the exact commands; nothing runs
//   confirmAction(intent, previewId)    -> { status: 'done' | 'failed' | 'changed' | 'refused', ... }
// An intent is { kind: 'revoke-class' | 'promote-class' | 'mark-cra-ready' | 'stage-gap-mr', project, ... } (types.ts).
// Both take `unknown` and validate it: a server action is an endpoint, whatever the type says.
import { actionDeps } from './deps';
import { confirmIntent, previewIntent } from './run';
import type { ActionResponse } from './types';

const NOT_READY: ActionResponse = { status: 'refused', reason: 'live mode has not finished its first poll; try again in a moment' };

export async function previewAction(intent: unknown): Promise<ActionResponse> {
  const deps = actionDeps();
  return deps ? previewIntent(deps, intent) : NOT_READY;
}

export async function confirmAction(intent: unknown, previewId: string): Promise<ActionResponse> {
  const deps = actionDeps();
  return deps && typeof previewId === 'string' ? confirmIntent(deps, intent, previewId) : NOT_READY;
}
