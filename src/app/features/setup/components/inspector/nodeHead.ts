import { CAP_NOTE, CAP_SHORT } from '../../data/capabilities';
import { GATE_FREES } from '../../data/armMeta';
import { isSaid, stepDetail, unmet, needLabel, capSt } from '../../model/flow/state';
import { mergeLabel, saidText } from '../../model/flow/wording';
import type { ArmState, ArmStatus, Focus, SetupState } from '../../model/types';
import type { Track } from '@/lib/demo/types';

export interface NodeHead {
  title: string;
  /** The one-line answer: what blocks it, what only you can do. */
  lede: string;
  /** The long reference text, shown on hover instead of on the page. */
  tip?: string;
}

/** Keyed by ArmStatus, so a new status is a compile error, never a silent "Locked until" (TrackPanel's chip table does the same). */
const TRACK_LEDE: Record<ArmStatus, (a: ArmState, s: SetupState) => string> = {
  armed: (a) => `Armed${a.mr ? ` by ${a.mr}` : ''}: a revert disarms it.`,
  ready: () => 'Ready: one MR arms it.',
  open: (a) => `Only you can merge ${mergeLabel(a)}.`,
  probing: () => 'Verifying the merge on main.',
  undefined: () => 'Not defined in the repo yet.',
  unknown: () => 'Unknown: the read of main failed.',
  locked: (a, s) => `Locked until a probe sees ${unmet(s, a.id).map(needLabel).join(', ')}.`,
};

/** The title and the one-line answer of a node's page, or null when the state does not hold the node. */
export function nodeHead(state: SetupState, tracks: Readonly<Record<string, Track>>, f: Focus): NodeHead | null {
  if (f.k === 'step') {
    const s = state.steps[f.id];
    const d = stepDetail(state, f.id);
    if (!s || !d) return null;
    const frees = GATE_FREES[f.id];
    const tip = d.does;
    if (s.st === 'done') return { title: s.title, lede: 'Probed: a read saw it done.', tip };
    if (isSaid(s)) return { title: s.title, lede: `${saidText(s.said ?? '')}. Belay cannot see it done.`, tip };
    const who = d.who === 'human' ? 'Only you can do this' : 'An agent or you can do this';
    return { title: s.title, lede: `${who}${frees ? ` · frees ${frees}` : ''}${s.st === 'unknown' ? ' · unread' : ''}`, tip };
  }
  if (f.k === 'track') {
    const a = state.arm[f.id];
    const t = tracks[f.id];
    if (!a || !t) return null;
    return { title: t.name, lede: TRACK_LEDE[a.st](a, state), tip: t.verb };
  }
  const row = state.doctor.find((r) => r.name === f.id);
  const note = state.live ? row?.reason : CAP_NOTE[f.id];
  return { title: CAP_SHORT[f.id] ?? f.id, lede: `${capSt(state, f.id)} in ${state.group}`, tip: note ? `${f.id}. ${note}` : f.id };
}
