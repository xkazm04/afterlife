// A gap's MR, through the server's gap door (stage-gap-mr): previewAction when the gap is in view (nothing runs),
// confirmAction(intent, previewId) on send. The files are this screen's proposal data, once: a new file sends its '+' lines
// as its content, a hunk of an existing file sends the hunk, for the server to apply to the file as the project holds it.
// Needs you's gap Run imports this, so there is one way to send a gap.
import { confirmAction, previewAction } from '@/server/actions/actions';
import type { ActionResponse, GapFile, StageGapMr } from '@/server/actions/types';
import { unreachable, viewOf, type WriteView } from '@/server/actions/words';
import type { MaturityProposal } from '@/lib/demo/types';
import { PROPOSAL_EXTRAS } from '../data/proposals';
import type { DiffFile, ProposalExtra } from '../data/types';

export type DataMode = 'demo' | 'live';

/** The reasons a gap is not sent from the screen. Each is shown where the gap is. */
export const NOT_BUILT = 'Not built yet: the server has no probe door, so Belay sends nothing for a probe. Nothing is sent.';
export const NO_FILES = 'This gap has no proposal files to send, so there is no MR to open.';
export const DEMO_CONTENT = 'Demo content: these files are a demo fixture, not read from your repo. Belay will not send them to a real project.';

/** A proposal file as the gap door takes it: a new file is its '+' lines, an existing file's change is the hunk. */
export function gapFile(f: DiffFile): GapFile {
  if (!f.isNew) return { path: f.path, hunk: [...f.lines] };
  return { path: f.path, content: `${f.lines.filter((l) => l.startsWith('+')).map((l) => l.slice(1)).join('\n')}\n` };
}

const workItemOf = (x: ProposalExtra): number | undefined => {
  const n = Number(x.workItem.replace('#', ''));
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

export type GapSend = { ok: true; intent: StageGapMr } | { ok: false; reason: string };

/**
 * The intent that sends one gap, or why it is not sent. In live mode a gap whose files come from the demo fixture is never
 * sent to a real project; `extras` is the proposal data the files are read from.
 */
export function gapSend(
  project: string,
  p: Pick<MaturityProposal, 'id' | 'stage' | 'from' | 'to' | 'title'>,
  mode: DataMode,
  extras: Readonly<Record<string, ProposalExtra>> = PROPOSAL_EXTRAS,
): GapSend {
  const x = extras[p.id];
  if (!x || x.kind === 'probe') return { ok: false, reason: NOT_BUILT };
  if (!x.branch || !x.files.length || x.files.length > 8 || !x.files.every((f) => f.lines.some((l) => l.startsWith('+')))) return { ok: false, reason: NO_FILES };
  if (mode === 'live') return { ok: false, reason: DEMO_CONTENT };
  const workItem = workItemOf(x);
  return {
    ok: true,
    intent: {
      kind: 'stage-gap-mr', project, gap: p.id, stage: p.stage, from: p.from, to: p.to, title: p.title, branch: x.branch,
      files: x.files.map(gapFile), ...(workItem ? { workItem } : {}),
    },
  };
}

/** The gap is in view: ask for its exact write. Never sends anything. */
export function askGapMr(intent: StageGapMr): Promise<WriteView> {
  return previewAction(intent).then(viewOf, unreachable);
}

/** Send: confirm the write on screen by its preview id. Null when there is none on screen (nothing is sent). */
export async function sendGapMr(intent: StageGapMr, view: WriteView | undefined): Promise<ActionResponse | null> {
  if (view?.kind !== 'preview') return null;
  return confirmAction(intent, view.preview.previewId);
}
