// A revoke's round trip with the server. When a revoke comes into view, previewAction plans the exact write from
// belay-policy as it is now (nothing runs). On r or the click, confirmAction runs that preview, and only that one: if
// tier-state.yml moved in between, the ids differ and nothing runs. The screen never spells a command itself.
import { confirmAction, previewAction } from '@/server/actions/actions';
import type { ActionResponse, RevokeClass } from '@/server/actions/types';
import { unreachable, viewOf, type WriteView } from '@/server/actions/words';
import type { TrackWant } from '../model/rules/batch/batch';
import type { Change, Tier } from '../model/types';

export type { WriteView } from '@/server/actions/words';

export const writeKey = (id: string, to: Tier): string => `${id}>${to}`;

export const revokeIntent = (project: string, id: string, to: Tier): RevokeClass => ({ kind: 'revoke-class', project, changes: [{ class: id, to }] });

/** The revoke is in view: ask for its exact write. Never sends anything. */
export function askRevoke(project: string, id: string, to: Tier): Promise<WriteView> {
  return previewAction(revokeIntent(project, id, to)).then(viewOf, unreachable);
}

/**
 * r or the click: confirm the write on screen, by its preview id. Without a preview on screen nothing is sent and the
 * answer is null. It rejects when the server does not answer: then nobody knows whether it ran (NO_ANSWER).
 */
export async function sendRevoke(project: string, id: string, to: Tier, view: WriteView | undefined): Promise<ActionResponse | null> {
  if (view?.kind !== 'preview') return null;
  return confirmAction(revokeIntent(project, id, to), view.preview.previewId);
}

/** The key of a whole track's write on screen: "g:T1>quarantine". */
export const trackKey = (track: string, want: TrackWant): string => `g:${track}>${want}`;

const TRACK_WHY: Readonly<Record<TrackWant, (track: string) => string>> = {
  quarantine: (track) => `quarantine track ${track} from the Ladder`,
  step: (track) => `one step down, track ${track}`,
};

/** A whole track (../model/rules/batch): one revoke-class intent with every change, so one commit. */
export const trackIntent = (project: string, track: string, changes: readonly Change[], want: TrackWant): RevokeClass => ({
  kind: 'revoke-class',
  project,
  changes: changes.map((c) => ({ class: c.id, to: c.to })),
  why: TRACK_WHY[want](track),
});

/** The track's write is in view: ask for it. Never sends anything. */
export function askRevokeTrack(project: string, track: string, changes: readonly Change[], want: TrackWant): Promise<WriteView> {
  return previewAction(trackIntent(project, track, changes, want)).then(viewOf, unreachable);
}

/** q or r on a track header: confirm the track's write on screen, as sendRevoke does for one class. */
export async function sendRevokeTrack(project: string, track: string, changes: readonly Change[], want: TrackWant, view: WriteView | undefined): Promise<ActionResponse | null> {
  if (view?.kind !== 'preview') return null;
  return confirmAction(trackIntent(project, track, changes, want), view.preview.previewId);
}
