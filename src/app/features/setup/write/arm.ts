// A track's arm and disarm, round trip with the server. When the Arm (or Disarm) section is in view, previewAction plans
// the exact MR from the target's .gitlab-ci.yml as it is (nothing runs). On the click, confirmAction runs that preview and
// only that one. "I merged it · verify" asks verifyArmAction, a read of the default branch. The screen never spells a
// command itself, and never names an MR the server did not answer with.
import { confirmAction, previewAction } from '@/server/actions/actions';
import type { ArmCheck } from '@/server/actions/arm/read';
import { verifyArmAction } from '@/server/actions/arm/verifyAction';
import type { ActionResponse, ArmTrack, DisarmTrack } from '@/server/actions/types';
import { unreachable, viewOf, type WriteView } from '@/server/actions/words';

export type { WriteView } from '@/server/actions/words';

/** One write per track and direction: "T4:arm", "T4:disarm". */
export const writeKey = (id: string, revert: boolean): string => `${id}:${revert ? 'disarm' : 'arm'}`;

export const armIntent = (project: string, id: string, revert: boolean): ArmTrack | DisarmTrack =>
  revert ? { kind: 'disarm-track', project, track: id } : { kind: 'arm-track', project, track: id };

/** The arm (or disarm) is in view: ask for its exact MR. Never sends anything. */
export function askArm(project: string, id: string, revert: boolean): Promise<WriteView> {
  return previewAction(armIntent(project, id, revert)).then(viewOf, unreachable);
}

/** The click: confirm the write on screen by its preview id. Null when there is none on screen (nothing is sent). */
export async function sendArm(project: string, id: string, revert: boolean, view: WriteView | undefined): Promise<ActionResponse | null> {
  if (view?.kind !== 'preview') return null;
  return confirmAction(armIntent(project, id, revert), view.preview.previewId);
}

/** Verify: what the default branch holds now. A server that does not answer is a refusal, never an armed track. */
export function checkArm(project: string, id: string, revert: boolean): Promise<ArmCheck> {
  return verifyArmAction(armIntent(project, id, revert)).catch((e: unknown) => ({ status: 'refused' as const, reason: e instanceof Error ? e.message : 'the server did not answer' }));
}
