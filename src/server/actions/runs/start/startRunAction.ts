'use server';

// Start a cycle run from /theater, as a Next server action: the house preview/confirm round trip in one endpoint.
//   startRunAction(intent)              -> { status: 'preview', preview }   the exact `belay run ...`; nothing runs
//   startRunAction(intent, previewId)   -> { status: 'done' | 'failed' | 'changed' | 'refused', ... }
// A done confirm has spawned the run detached and answered at once (its pid); the live film follows it. Both refuse,
// before anything is read, on the hosted replay and for any request not addressed to this machine (local.ts): a run
// spends the person's own claude login. The intent is `unknown` and validated (intent.ts): an action is an endpoint.
import { headers } from 'next/headers';
import type { ActionResponse } from '../../types';
import { projectAway } from '../../vitals/route';
import { parseStartRun } from './intent';
import { startDeps } from './launch';
import { REPLAY_CLOSED } from './read';
import { confirmStartRun, previewStartRun } from './run';

export async function startRunAction(intent: unknown, previewId?: unknown): Promise<ActionResponse> {
  if (process.env.BELAY_MODE === 'replay') return { status: 'refused', reason: REPLAY_CLOSED };
  const away = projectAway(await headers());
  if (away) return away;
  const p = parseStartRun(intent);
  if (!p.ok) return { status: 'refused', reason: p.reason };
  if (previewId === undefined) return previewStartRun(startDeps(), p.intent);
  if (typeof previewId !== 'string' || !/^[0-9a-f]{64}$/.test(previewId)) return { status: 'refused', reason: 'a confirm names the preview id of the preview it confirms: preview first' };
  return confirmStartRun(startDeps(), p.intent, previewId);
}
