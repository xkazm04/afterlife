import { CAP_NOTE, CAP_SHORT } from '../../data/capabilities';
import { GATE_FREES } from '../../data/armMeta';
import { isSaid, stepDetail, unmet, needLabel, capSt } from '../../model/flow/state';
import { mrName, saidText } from '../../model/flow/wording';
import type { Focus, SetupState } from '../../model/types';
import type { Track } from '@/lib/demo/types';

export interface NodeHead {
  title: string;
  /** The one-line answer: what blocks it, what only you can do. */
  lede: string;
  /** The long reference text, shown on hover instead of on the page. */
  tip?: string;
}

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
    const lede: Record<string, string> = {
      armed: `Armed${a.mr ? ` by ${a.mr}` : ''}: a revert disarms it.`,
      ready: 'Ready: one MR arms it.',
      open: `Only you can merge ${mrName(a)}.`,
      probing: 'Verifying the merge on main.',
      undefined: 'Not defined in the repo yet.',
      unknown: 'Unknown: the read of main failed.',
    };
    const wait = unmet(state, f.id).map(needLabel).join(', ');
    return { title: t.name, lede: lede[a.st] ?? `Locked until a probe sees ${wait}.`, tip: t.verb };
  }
  const row = state.doctor.find((r) => r.name === f.id);
  const note = state.live ? row?.reason : CAP_NOTE[f.id];
  return { title: CAP_SHORT[f.id] ?? f.id, lede: `${capSt(state, f.id)} in ${state.group}`, tip: note ? `${f.id}. ${note}` : f.id };
}
