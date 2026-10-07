// How a screen words an action's response: only what the response says. A done in demo mode is simulated and says so
// (never "pushed"); a live done names what GitLab made, from the results. Pure, no server imports: a client component
// imports this beside the server actions.
import type { ActionPreview, ActionResponse, CommandOutcome } from './types';

/** The commands as the operator would type them, in order: what a command block shows. */
export const commandLines = (p: ActionPreview): string[] => p.commands.map((c) => c.display);

/** What a screen holds for one write before it is sent: its exact preview, or why there is none. */
export type WriteView = { kind: 'preview'; preview: ActionPreview } | { kind: 'refused'; reason: string };

/** A preview call's answer as a view. Anything but a preview is a reason there is no write. */
export function viewOf(r: ActionResponse): WriteView {
  if (r.status === 'preview') return { kind: 'preview', preview: r.preview };
  return { kind: 'refused', reason: r.status === 'refused' ? r.reason : `the server answered ${r.status} to a preview` };
}

/** The answer when the server could not be reached at all for a preview. */
export const unreachable = (e: unknown): WriteView => ({ kind: 'refused', reason: e instanceof Error ? e.message : 'the server did not answer' });

/** A confirm that got no answer: nobody knows whether the write ran. */
export const NO_ANSWER = 'No answer from the server: the write may or may not have run. Check GitLab before sending it again.';

/** What GitLab made ("!22", "commit 1a2b3c4d"), in order. Empty when no result says. */
export const madeOf = (results: readonly CommandOutcome[]): string[] => results.flatMap((r) => (r.made ? [r.made] : []));

/** The commit a file write made, from the results ("1a2b3c4d"), or null when no result names one. */
export const commitOf = (results: readonly CommandOutcome[]): string | null =>
  madeOf(results).find((m) => m.startsWith('commit '))?.slice('commit '.length) ?? null;

/** The MR a write opened, from the results ("!22"), or null when no result names one. */
export const mrOf = (results: readonly CommandOutcome[]): string | null => madeOf(results).find((m) => m.startsWith('!')) ?? null;

export type Outcome =
  | { status: 'done'; simulated: boolean; made: string[]; text: string }
  | { status: 'failed'; text: string }
  | { status: 'changed'; preview: ActionPreview; text: string }
  | { status: 'refused'; reason: string; text: string };

function failedText(what: string, preview: ActionPreview, results: readonly CommandOutcome[]): string {
  const at = results.findIndex((r) => !r.ok);
  const bad = results[at];
  const before = at > 0 ? ` ${at} command(s) before it ran.` : ' Nothing before it ran.';
  return `Failed · ${what} · command ${at + 1} of ${preview.commands.length}: ${bad?.error ?? 'no answer'} (exit ${bad?.exit ?? '?'}).${before}`;
}

/** `what` names the write for the operator ("dep-bump.patch → Supervised"). Null for a preview (nothing was sent). */
export function outcomeOf(r: ActionResponse, what: string): Outcome | null {
  switch (r.status) {
    case 'preview':
      return null;
    case 'done': {
      const simulated = r.results.length > 0 && r.results.every((x) => x.simulated);
      const made = madeOf(r.results);
      if (simulated) return { status: 'done', simulated, made, text: `Simulated · ${what} · demo mode: nothing was sent to GitLab` };
      return { status: 'done', simulated, made, text: `Done · ${what} · ${made.length ? made.join(' · ') : `${r.results.length} command(s) ran; GitLab named nothing`}` };
    }
    case 'failed':
      return { status: 'failed', text: failedText(what, r.preview, r.results) };
    case 'changed':
      return { status: 'changed', preview: r.preview, text: `Changed · ${what} · the files moved since the preview, so nothing ran. The new write is on screen: send it again to run it.` };
    case 'refused':
      return { status: 'refused', reason: r.reason, text: `Refused · ${what} · ${r.reason}. Nothing ran.` };
  }
}
