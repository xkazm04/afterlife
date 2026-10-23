// A live maturity gap's draft MR from a fixed template (apply-gap-template), through the server actions: previewAction
// when the gap is in view (nothing runs), confirmAction with that preview's id on Run. The server writes the files from
// the template; the screen only names the template, never a file.
import { confirmAction, previewAction } from '@/server/actions/actions';
import type { ActionResponse, ApplyGapTemplate } from '@/server/actions/types';
import { unreachable, viewOf, type WriteView } from '@/server/actions/words';

/** The write, as an answer names it: "secure-includes · secure R? → R3" (an unknown rung now is "?", never R0). */
export const gapTemplateName = (intent: ApplyGapTemplate): string => `${intent.template} · ${intent.stage} R${intent.from ?? '?'} → R${intent.to}`;

/** The gap is in view: ask for its exact write. Never sends anything. */
export function askGapTemplate(intent: ApplyGapTemplate): Promise<WriteView> {
  return previewAction(intent).then(viewOf, unreachable);
}

/** Run: confirm the write on screen by its preview id. Null when there is none on screen (nothing is sent). */
export async function sendGapTemplate(intent: ApplyGapTemplate, view: WriteView | undefined): Promise<ActionResponse | null> {
  if (view?.kind !== 'preview') return null;
  return confirmAction(intent, view.preview.previewId);
}
