// Onboard's writes, round trip with the server, as Setup's arm and enroll are (setup/write/arm.ts, enroll.ts): when a
// write is on screen, previewAction plans its exact MR from the files as they are (nothing runs); on the click,
// confirmAction runs that preview and only that one. The screen never spells a write's command, and never names an MR the
// server did not answer with.
import { confirmAction, previewAction } from '@/server/actions/actions';
import type { ActionResponse } from '@/server/actions/types';
import { mrOf, unreachable, viewOf, type WriteView } from '@/server/actions/words';
import type { OnboardIntent, Opened } from '../model/batch';

export type { WriteView } from '@/server/actions/words';

/** One write per project and intent: "fx-rates:arm-track:T6". */
export const writeKey = (i: OnboardIntent): string => `${i.project}:${i.kind}:${i.track}`;

/** The write is on screen: ask for its exact MR. Never sends anything. */
export function askWrite(intent: OnboardIntent): Promise<WriteView> {
  return previewAction(intent).then(viewOf, unreachable);
}

/** The click: confirm the write on screen by its preview id. Null when there is none on screen (nothing is sent). */
export async function sendWrite(intent: OnboardIntent, view: WriteView | undefined): Promise<ActionResponse | null> {
  if (view?.kind !== 'preview') return null;
  return confirmAction(intent, view.preview.previewId);
}

/** What a done confirm opened, for the run to wait on; null for anything else (the project does not move). */
export function openedOf(r: ActionResponse | null): Opened | null {
  if (r?.status !== 'done') return null;
  return { mr: mrOf(r.results), ...(r.preview.branch ? { branch: r.preview.branch } : {}) };
}
