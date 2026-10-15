// A track's enrollment, round trip with the server, as the arm is (./arm.ts). When the Enroll section is in view,
// previewAction plans the exact policy MR from belay-policy's tier-state.yml and trust-policy.yml as they are (nothing
// runs). On the click, confirmAction runs that preview and only that one. The MR's number is GitLab's answer; a person
// merges it in belay-policy, and Belay never does.
import { confirmAction, previewAction } from '@/server/actions/actions';
import type { ActionResponse, EnrollTrack } from '@/server/actions/types';
import { unreachable, viewOf, type WriteView } from '@/server/actions/words';

export const enrollIntent = (project: string, id: string): EnrollTrack => ({ kind: 'enroll-track', project, track: id });

/** The Enroll section is in view: ask for its exact MR. Never sends anything. */
export function askEnroll(project: string, id: string): Promise<WriteView> {
  return previewAction(enrollIntent(project, id)).then(viewOf, unreachable);
}

/** The click: confirm the write on screen by its preview id. Null when there is none on screen (nothing is sent). */
export async function sendEnroll(project: string, id: string, view: WriteView | undefined): Promise<ActionResponse | null> {
  if (view?.kind !== 'preview') return null;
  return confirmAction(enrollIntent(project, id), view.preview.previewId);
}
