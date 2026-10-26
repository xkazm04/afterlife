// A wave's state as the ledger's chip says it, from its own events and the desk's merge decisions. A wave that ended
// mergeable is "mergeable" only when the desk names it (git says its branch is not in its base yet); without the
// desk's answer, or when git could not be asked, it says so, never a guess. The run file alone cannot tell a wave
// to take from one already merged or whose branch was deleted.
import type { MergeNeed } from '@/lib/runs/desk/types';
import type { RunWave } from '@/lib/runs/types';

export type WaveStateKind = 'running' | 'unfinished' | 'take' | 'unasked' | 'in' | 'blocked';

export const WAVE_STATE_LABEL: Record<WaveStateKind, string> = {
  running: 'running',
  unfinished: 'unfinished',
  take: 'mergeable',
  unasked: 'mergeable, git not asked yet',
  in: 'in its base, or branch gone',
  blocked: 'not mergeable',
};

/** The chip's tooltip: what the state rests on. */
export const WAVE_STATE_MEANS: Record<WaveStateKind, string> = {
  running: 'A wave.start and no wave.end yet',
  unfinished: 'No wave.end in the file',
  take: 'Ended mergeable, and git says its branch is not in its base yet',
  unasked: 'Ended mergeable; whether its branch is in its base already is not known: git was not asked, or could not be',
  in: 'Ended mergeable, but its branch is in its base already or gone: nothing to merge',
  blocked: 'Ended not mergeable',
};

/** `needs` absent: the desk is not read (yet). A desk decision with checked false is git not asked either. */
export function waveStateOf(w: RunWave, needs: readonly MergeNeed[] | undefined): WaveStateKind {
  if (w.running) return 'running';
  if (w.mergeable === undefined) return 'unfinished';
  if (!w.mergeable || !w.branch) return 'blocked';
  if (!needs) return 'unasked';
  const need = needs.find((n) => n.repo === w.repo && n.wave === w.wave);
  return !need ? 'in' : need.checked ? 'take' : 'unasked';
}
