// The click that sends an arm or disarm MR: confirm exactly the preview on screen, move the track only on a done.
import type { Dispatch } from 'react';
import type { ActionResponse } from '@/server/actions/types';
import { mrOf, NO_ANSWER, outcomeOf } from '@/server/actions/words';
import type { SetupAction } from '../model/flow/reducer';
import type { SetupState } from '../model/types';
import { sendArm } from '../write/arm';
import type { ArmWrites } from './useArmWrite';

export interface ArmSendDeps {
  /** The state as it is when the click lands (the hook's ref, read only in handlers). */
  now: () => SetupState;
  dispatch: Dispatch<SetupAction>;
  writes: ArmWrites;
  say: (m: string) => void;
  toast: (m: string) => void;
  /** The tracks with a confirm out, kept by the hook across clicks. */
  out: Set<string>;
}

/**
 * The click: confirm exactly the preview on screen. Moves the track only on a done, with what GitLab named. The track
 * stays `ready` (or `armed`) until the answer lands, so a track is sent once at a time: a second click in that window
 * would confirm the same preview again and run the git push and the MR twice.
 */
export function armClick(d: ArmSendDeps, id: string, revert: boolean): Promise<void> {
  return oneAtATime(d.out, id, undefined, () => send(d, id, revert));
}

/** Runs `run` for `id` unless one is still out in `out`; a second call in that window runs nothing and answers `busy`. */
export async function oneAtATime<T>(out: Set<string>, id: string, busy: T, run: () => Promise<T>): Promise<T> {
  if (out.has(id)) return busy;
  out.add(id);
  try {
    return await run();
  } finally {
    out.delete(id);
  }
}

async function send({ now, dispatch, writes, say, toast }: ArmSendDeps, id: string, revert: boolean): Promise<void> {
  if (now().arm[id]?.st !== (revert ? 'armed' : 'ready')) return;
  const what = `${revert ? 'disarm' : 'arm'} ${id}`;
  let r: ActionResponse | null;
  try {
    r = await sendArm(now().project, id, revert, writes.viewOf(id, revert));
  } catch {
    writes.clear();
    say(`${what}: ${NO_ANSWER}`);
    toast(NO_ANSWER);
    return;
  }
  const o = r ? outcomeOf(r, what) : null;
  if (!r || !o) {
    toast(`Nothing sent · ${what}: the exact MR is not on screen yet`);
    return;
  }
  if (o.status === 'changed') writes.put(id, revert, { kind: 'preview', preview: o.preview });
  else writes.clear();
  if (o.status === 'done' && r.status === 'done') {
    const mr = mrOf(r.results);
    const url = r.results.find((x) => x.made === mr)?.url ?? null;
    dispatch({ t: 'arm-sent', id, revert, mr, url, simulated: o.simulated });
  }
  say(o.text);
  toast(o.text);
}
