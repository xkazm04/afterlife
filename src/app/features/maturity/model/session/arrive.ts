import type { MaturityCtx } from '../ctx';
import { initialState, type MaturityState } from '../state';

/**
 * The state once the screen host's core slice lands (screen/host.tsx): the first arrival is the initial state; a later
 * one (a re-read that brought other data) keeps everything the person did (mode, selection, step, picks, sends, the
 * session's credit rows, open sections) and takes from the new read only what the scan decides: the rungs and the scan
 * time, and only when the scan itself changed (a simulated rescan's stamp survives a re-read of the same scan). Picks
 * of a gap the new read no longer proposes go; a selection on a stage it no longer has falls back.
 */
export function arrive(prev: MaturityState | null, ctx: MaturityCtx, before: MaturityCtx | null): MaturityState {
  if (!prev) return initialState(ctx);
  const fresh = initialState(ctx);
  const rescanned = !before || before.scannedAt !== ctx.scannedAt || before.engine !== ctx.engine;
  return {
    ...prev,
    sel: ctx.stages.includes(prev.sel) ? prev.sel : fresh.sel,
    picked: prev.picked.filter((id) => ctx.gap(id)),
    ...(rescanned ? { now: fresh.now, scannedAt: fresh.scannedAt, ageMin: fresh.ageMin, animKey: prev.animKey + 1 } : {}),
  };
}
